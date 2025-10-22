// apps/Backend/src/storage/payments-reports-storage.ts
import { prisma } from "@repo/db/client";

/**
 * Row returned to the client
 */
export interface PatientBalanceRow {
  patientId: number;
  firstName: string | null;
  lastName: string | null;
  totalCharges: number;
  totalPayments: number;
  totalAdjusted: number;
  currentBalance: number;
  lastPaymentDate: string | null;
  lastAppointmentDate: string | null;
  patientCreatedAt?: string | null;
}

export interface GetPatientBalancesResult {
  balances: PatientBalanceRow[];
  totalCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface IPaymentsReportsStorage {
  /**
   * Cursor-based pagination:
   * - limit: page size
   * - cursorToken: base64(JSON) token for last-seen row (or null for first page)
   * - from/to: optional date range filter applied to Payment."createdAt"
   */
  getPatientBalances(
    limit: number,
    cursorToken?: string | null,
    from?: Date | null,
    to?: Date | null
  ): Promise<GetPatientBalancesResult>;

  // summary now returns an extra field patientsWithBalance
  getSummary(
    from?: Date | null,
    to?: Date | null
  ): Promise<{
    totalPatients: number;
    totalOutstanding: number;
    totalCollected: number;
    patientsWithBalance: number;
  }>;
}

/** Helper: format Date -> SQL literal 'YYYY-MM-DDTHH:mm:ss.sssZ' or null */
function fmtDateLiteral(d?: Date | null): string | null {
  if (!d) return null;
  const iso = new Date(d).toISOString();
  return `'${iso}'`;
}

/** Cursor helpers — base64(JSON) */
function encodeCursor(obj: {
  lastPaymentDate: string | null;
  lastPatientCreatedAt: string; // ISO string
  lastPatientId: number;
}) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

function decodeCursor(token?: string | null): {
  lastPaymentDate: string | null;
  lastPatientCreatedAt: string;
  lastPatientId: number;
} | null {
  if (!token) return null;
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    if (
      typeof parsed === "object" &&
      "lastPaymentDate" in parsed &&
      "lastPatientCreatedAt" in parsed &&
      "lastPatientId" in parsed
    ) {
      return {
        lastPaymentDate:
          parsed.lastPaymentDate === null
            ? null
            : String(parsed.lastPaymentDate),
        lastPatientCreatedAt: String(parsed.lastPatientCreatedAt),
        lastPatientId: Number(parsed.lastPatientId),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const paymentsReportsStorage: IPaymentsReportsStorage = {
  /**
   * Returns all patients that currently have an outstanding balance (>0)
   * Optionally filtered by date range.
   */
  /**
   * Cursor-based getPatientBalances
   */
  async getPatientBalances(
    limit = 25,
    cursorToken?: string | null,
    from?: Date | null,
    to?: Date | null
  ) {
    try {
      type RawRow = {
        patient_id: number;
        first_name: string | null;
        last_name: string | null;
        total_charges: string;
        total_paid: string;
        total_adjusted: string;
        current_balance: string;
        last_payment_date: Date | null;
        last_appointment_date: Date | null;
        patient_created_at: Date | null; // we select patient.createdAt for cursor tie-breaker
      };

      const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
      const cursor = decodeCursor(cursorToken);

      const hasFrom = from !== undefined && from !== null;
      const hasTo = to !== undefined && to !== null;
      const fromLit = fmtDateLiteral(from);
      const toLit = fmtDateLiteral(to);

      // Build payment subquery (aggregated payments by patient, filtered by createdAt if provided)
      const paymentWhereClause =
        hasFrom && hasTo
          ? `WHERE pay."createdAt" >= ${fromLit} AND pay."createdAt" <= ${toLit}`
          : hasFrom
            ? `WHERE pay."createdAt" >= ${fromLit}`
            : hasTo
              ? `WHERE pay."createdAt" <= ${toLit}`
              : "";

      const pmSubquery = `
        (
          SELECT
            pay."patientId" AS patient_id,
            SUM(pay."totalBilled")::numeric(12,2) AS total_charges,
            SUM(pay."totalPaid")::numeric(12,2) AS total_paid,
            SUM(pay."totalAdjusted")::numeric(12,2) AS total_adjusted,
            MAX(pay."createdAt") AS last_payment_date
          FROM "Payment" pay
          ${paymentWhereClause}
          GROUP BY pay."patientId"
        ) pm
      `;

      // Build keyset predicate if cursor provided.
      // Ordering used: pm.last_payment_date DESC NULLS LAST, p."createdAt" DESC, p.id DESC
      // For keyset, we need to fetch rows strictly "less than" the cursor in this ordering.
      let keysetPredicate = "";
      if (cursor) {
        const lp = cursor.lastPaymentDate
          ? `'${cursor.lastPaymentDate}'`
          : "NULL";
        const lc = `'${cursor.lastPatientCreatedAt}'`;
        const id = Number(cursor.lastPatientId);

        // We handle NULL last_payment_date ordering: since we use "NULLS LAST" in ORDER BY,
        // rows with last_payment_date = NULL are considered *after* any non-null dates.
        // To page correctly when cursor's lastPaymentDate is null, we compare accordingly.
        // This predicate tries to cover both cases.
        keysetPredicate = `
          AND (
            -- case: both sides have non-null last_payment_date
            (pm.last_payment_date IS NOT NULL AND ${lp} IS NOT NULL AND (
               pm.last_payment_date < ${lp}
               OR (pm.last_payment_date = ${lp} AND p."createdAt" < ${lc})
               OR (pm.last_payment_date = ${lp} AND p."createdAt" = ${lc} AND p.id < ${id})
            ))
            -- case: cursor lastPaymentDate IS NULL -> we need rows with last_payment_date IS NULL but earlier createdAt/id
            OR (pm.last_payment_date IS NULL AND ${lp} IS NULL AND (
               p."createdAt" < ${lc}
               OR (p."createdAt" = ${lc} AND p.id < ${id})
            ))
            -- case: cursor had non-null lastPaymentDate but pm.last_payment_date IS NULL:
            -- since NULLS LAST, pm.last_payment_date IS NULL are after non-null dates, so they are NOT < cursor -> excluded
          )
        `;
      }

      const baseSelect = `
        SELECT
          p.id AS patient_id,
          p."firstName" AS first_name,
          p."lastName" AS last_name,
          COALESCE(pm.total_charges,0)::numeric(12,2) AS total_charges,
          COALESCE(pm.total_paid,0)::numeric(12,2) AS total_paid,
          COALESCE(pm.total_adjusted,0)::numeric(12,2) AS total_adjusted,
          (COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0))::numeric(12,2) AS current_balance,
          pm.last_payment_date,
          apt.last_appointment_date,
          p."createdAt" AS patient_created_at
        FROM "Patient" p
        LEFT JOIN ${pmSubquery} ON pm.patient_id = p.id
        LEFT JOIN (
          SELECT "patientId" AS patient_id, MAX("date") AS last_appointment_date
          FROM "Appointment"
          GROUP BY "patientId"
        ) apt ON apt.patient_id = p.id
        WHERE (COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0)) > 0
      `;

      const orderBy = `ORDER BY pm.last_payment_date DESC NULLS LAST, p."createdAt" DESC, p.id DESC`;
      const limitClause = `LIMIT ${safeLimit}`;

      const query = `
        ${baseSelect}
        ${cursor ? keysetPredicate : ""}
        ${orderBy}
        ${limitClause};
      `;

      const rows = (await prisma.$queryRawUnsafe(query)) as RawRow[];

      // Build nextCursor from last returned row (if any)
      let nextCursor: string | null = null;

      // Explicitly handle empty result set
      if (rows.length === 0) {
        nextCursor = null;
      } else {
        // rows.length > 0 here, but do an explicit last-check to make TS happy
        const last = rows[rows.length - 1];
        if (!last) {
          // defensive — should not happen, but satisfies strict checks
          nextCursor = null;
        } else {
          const lastPaymentDateIso = last.last_payment_date
            ? new Date(last.last_payment_date).toISOString()
            : null;

          const lastPatientCreatedAtIso = last.patient_created_at
            ? new Date(last.patient_created_at).toISOString()
            : new Date().toISOString();

          if (rows.length === safeLimit) {
            nextCursor = encodeCursor({
              lastPaymentDate: lastPaymentDateIso,
              lastPatientCreatedAt: lastPatientCreatedAtIso,
              lastPatientId: Number(last.patient_id),
            });
          } else {
            nextCursor = null;
          }
        }
      }

      // Determine hasMore: if we returned exactly limit, there *may* be more.
      const hasMore = rows.length === safeLimit;

      // Convert rows to PatientBalanceRow
      const balances: PatientBalanceRow[] = rows.map((r) => ({
        patientId: Number(r.patient_id),
        firstName: r.first_name,
        lastName: r.last_name,
        totalCharges: Number(r.total_charges ?? 0),
        totalPayments: Number(r.total_paid ?? 0),
        totalAdjusted: Number(r.total_adjusted ?? 0),
        currentBalance: Number(r.current_balance ?? 0),
        lastPaymentDate: r.last_payment_date
          ? new Date(r.last_payment_date).toISOString()
          : null,
        lastAppointmentDate: r.last_appointment_date
          ? new Date(r.last_appointment_date).toISOString()
          : null,
        patientCreatedAt: r.patient_created_at
          ? new Date(r.patient_created_at).toISOString()
          : null,
      }));

      // totalCount: count of patients with positive balance within same payment date filter
      const countSql = `
        SELECT COUNT(*)::int AS cnt FROM (
          SELECT pay."patientId" AS patient_id,
                 SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                 SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                 SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
          FROM "Payment" pay
          ${paymentWhereClause}
          GROUP BY pay."patientId"
        ) t
        WHERE (COALESCE(t.total_charges,0) - COALESCE(t.total_paid,0) - COALESCE(t.total_adjusted,0)) > 0;
      `;
      const cntRows = (await prisma.$queryRawUnsafe(countSql)) as {
        cnt: number;
      }[];
      const totalCount = cntRows?.[0]?.cnt ?? 0;

      return {
        balances,
        totalCount,
        nextCursor,
        hasMore,
      };
    } catch (err) {
      console.error("[paymentsReportsStorage.getPatientBalances] error:", err);
      throw err;
    }
  },

  async getSummary(from?: Date | null, to?: Date | null) {
    try {
      const hasFrom = from !== undefined && from !== null;
      const hasTo = to !== undefined && to !== null;
      const fromLit = fmtDateLiteral(from);
      const toLit = fmtDateLiteral(to);

      // totalPatients: distinct patients who had payments in the date range
      let patientsCountSql = "";
      if (hasFrom && hasTo) {
        patientsCountSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit} AND pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) t
        `;
      } else if (hasFrom) {
        patientsCountSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit}
            GROUP BY pay."patientId"
          ) t
        `;
      } else if (hasTo) {
        patientsCountSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id
            FROM "Payment" pay
            WHERE pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) t
        `;
      } else {
        patientsCountSql = `SELECT COUNT(DISTINCT "patientId")::int AS cnt FROM "Payment"`;
      }
      const patientsCntRows = (await prisma.$queryRawUnsafe(
        patientsCountSql
      )) as { cnt: number }[];
      const totalPatients = patientsCntRows?.[0]?.cnt ?? 0;

      // totalOutstanding: sum of (charges - paid - adjusted) across patients, using payments in range
      let outstandingSql = "";
      if (hasFrom && hasTo) {
        outstandingSql = `
          SELECT COALESCE(SUM(
            COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0)
          ),0)::numeric(14,2) AS outstanding
          FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit} AND pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) pm
        `;
      } else if (hasFrom) {
        outstandingSql = `
          SELECT COALESCE(SUM(
            COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0)
          ),0)::numeric(14,2) AS outstanding
          FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit}
            GROUP BY pay."patientId"
          ) pm
        `;
      } else if (hasTo) {
        outstandingSql = `
          SELECT COALESCE(SUM(
            COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0)
          ),0)::numeric(14,2) AS outstanding
          FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            WHERE pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) pm
        `;
      } else {
        outstandingSql = `
          SELECT COALESCE(SUM(
            COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0)
          ),0)::numeric(14,2) AS outstanding
          FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            GROUP BY pay."patientId"
          ) pm
        `;
      }
      const outstandingRows = (await prisma.$queryRawUnsafe(
        outstandingSql
      )) as { outstanding: string }[];
      const totalOutstanding = Number(outstandingRows?.[0]?.outstanding ?? 0);

      // totalCollected: sum(totalPaid) in the range
      let collSql = "";
      if (hasFrom && hasTo) {
        collSql = `SELECT COALESCE(SUM("totalPaid"),0)::numeric(14,2) AS collected FROM "Payment" WHERE "createdAt" >= ${fromLit} AND "createdAt" <= ${toLit}`;
      } else if (hasFrom) {
        collSql = `SELECT COALESCE(SUM("totalPaid"),0)::numeric(14,2) AS collected FROM "Payment" WHERE "createdAt" >= ${fromLit}`;
      } else if (hasTo) {
        collSql = `SELECT COALESCE(SUM("totalPaid"),0)::numeric(14,2) AS collected FROM "Payment" WHERE "createdAt" <= ${toLit}`;
      } else {
        collSql = `SELECT COALESCE(SUM("totalPaid"),0)::numeric(14,2) AS collected FROM "Payment"`;
      }
      const collRows = (await prisma.$queryRawUnsafe(collSql)) as {
        collected: string;
      }[];
      const totalCollected = Number(collRows?.[0]?.collected ?? 0);

      // NEW: patientsWithBalance: number of patients whose (charges - paid - adjusted) > 0, within the date range
      let patientsWithBalanceSql = "";
      if (hasFrom && hasTo) {
        patientsWithBalanceSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit} AND pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) t
          WHERE (COALESCE(t.total_charges,0) - COALESCE(t.total_paid,0) - COALESCE(t.total_adjusted,0)) > 0
        `;
      } else if (hasFrom) {
        patientsWithBalanceSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit}
            GROUP BY pay."patientId"
          ) t
          WHERE (COALESCE(t.total_charges,0) - COALESCE(t.total_paid,0) - COALESCE(t.total_adjusted,0)) > 0
        `;
      } else if (hasTo) {
        patientsWithBalanceSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            WHERE pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) t
          WHERE (COALESCE(t.total_charges,0) - COALESCE(t.total_paid,0) - COALESCE(t.total_adjusted,0)) > 0
        `;
      } else {
        patientsWithBalanceSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id,
                   SUM(pay."totalBilled")::numeric(14,2) AS total_charges,
                   SUM(pay."totalPaid")::numeric(14,2) AS total_paid,
                   SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
            FROM "Payment" pay
            GROUP BY pay."patientId"
          ) t
          WHERE (COALESCE(t.total_charges,0) - COALESCE(t.total_paid,0) - COALESCE(t.total_adjusted,0)) > 0
        `;
      }
      const pwbRows = (await prisma.$queryRawUnsafe(
        patientsWithBalanceSql
      )) as { cnt: number }[];
      const patientsWithBalance = pwbRows?.[0]?.cnt ?? 0;

      return {
        totalPatients,
        totalOutstanding,
        totalCollected,
        patientsWithBalance,
      };
    } catch (err) {
      console.error("[paymentsReportsStorage.getSummary] error:", err);
      throw err;
    }
  },
};
