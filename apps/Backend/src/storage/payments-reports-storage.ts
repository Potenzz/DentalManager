import { prisma } from "@repo/db/client";
import {
  DoctorBalancesAndSummary,
  GetPatientBalancesResult,
  PatientBalanceRow,
} from "../../../../packages/db/types/payments-reports-types";

export interface IPaymentsReportsStorage {
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

  /**
   * Cursor-based pagination:
   * - limit: page size
   * - cursorToken: base64(JSON) token for last-seen row (or null for first page)
   * - from/to: optional date range filter applied to Payment."createdAt"
   */
  getPatientsWithBalances(
    limit: number,
    cursorToken?: string | null,
    from?: Date | null,
    to?: Date | null
  ): Promise<GetPatientBalancesResult>;

  /**
   * Returns the paginated patient balances for a specific staff (doctor).
   * Same semantics / columns / ordering / cursor behavior as the previous combined function.
   *
   * - staffId required
   * - limit: page size
   * - cursorToken: optional base64 cursor (must have been produced for same staffId)
   * - from/to: optional date range applied to Payment."createdAt"
   */
  getPatientsBalancesByDoctor(
    staffId: number,
    limit: number,
    cursorToken?: string | null,
    from?: Date | null,
    to?: Date | null
  ): Promise<GetPatientBalancesResult>;

  /**
   * Returns only the summary object for the given staff (doctor).
   * Same summary shape as getSummary(), but scoped to claims/payments associated with the given staffId.
   */
  getSummaryByDoctor(
    staffId: number,
    from?: Date | null,
    to?: Date | null
  ): Promise<{
    totalPatients: number;
    totalOutstanding: number;
    totalCollected: number;
    patientsWithBalance: number;
  }>;
}

/** Return ISO literal for inclusive start-of-day (UTC midnight) */
function isoStartOfDayLiteral(d?: Date | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return `'${dt.toISOString()}'`;
}

/** Return ISO literal for exclusive next-day start (UTC midnight of the next day) */
function isoStartOfNextDayLiteral(d?: Date | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `'${dt.toISOString()}'`;
}

/** Cursor helpers — base64(JSON) */
function encodeCursor(obj: {
  staffId?: number;
  lastPaymentDate: string | null;
  lastPatientId: number;
}) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

function decodeCursor(token?: string | null): {
  staffId?: number; // optional because older cursors might not include it
  lastPaymentDate: string | null;
  lastPatientId: number;
} | null {
  if (!token) return null;
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    if (
      typeof parsed === "object" &&
      "lastPaymentDate" in parsed &&
      "lastPatientId" in parsed
    ) {
      return {
        staffId:
          "staffId" in parsed ? Number((parsed as any).staffId) : undefined,
        lastPaymentDate:
          (parsed as any).lastPaymentDate === null
            ? null
            : String((parsed as any).lastPaymentDate),
        lastPatientId: Number((parsed as any).lastPatientId),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const paymentsReportsStorage: IPaymentsReportsStorage = {
  async getSummary(from?: Date | null, to?: Date | null) {
    try {
      const hasFrom = from !== undefined && from !== null;
      const hasTo = to !== undefined && to !== null;

      // Use inclusive start-of-day for 'from' and exclusive start-of-next-day for 'to'
      const fromStart = isoStartOfDayLiteral(from); // 'YYYY-MM-DDT00:00:00.000Z'
      const toNextStart = isoStartOfNextDayLiteral(to); // 'YYYY-MM-DDT00:00:00.000Z' of next day

      // totalPatients: distinct patients who had payments in the date range
      let patientsCountSql = "";
      if (hasFrom && hasTo) {
        patientsCountSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromStart} AND pay."createdAt" <= ${toNextStart}
            GROUP BY pay."patientId"
          ) t
        `;
      } else if (hasFrom) {
        patientsCountSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromStart}
            GROUP BY pay."patientId"
          ) t
        `;
      } else if (hasTo) {
        patientsCountSql = `
          SELECT COUNT(*)::int AS cnt FROM (
            SELECT pay."patientId" AS patient_id
            FROM "Payment" pay
            WHERE pay."createdAt" <= ${toNextStart}
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
            WHERE pay."createdAt" >= ${fromStart} AND pay."createdAt" <= ${toNextStart}
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
            WHERE pay."createdAt" >= ${fromStart}
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
            WHERE pay."createdAt" <= ${toNextStart}
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
        collSql = `SELECT COALESCE(SUM("totalPaid"),0)::numeric(14,2) AS collected FROM "Payment" WHERE "createdAt" >= ${fromStart} AND "createdAt" <= ${toNextStart}`;
      } else if (hasFrom) {
        collSql = `SELECT COALESCE(SUM("totalPaid"),0)::numeric(14,2) AS collected FROM "Payment" WHERE "createdAt" >= ${fromStart}`;
      } else if (hasTo) {
        collSql = `SELECT COALESCE(SUM("totalPaid"),0)::numeric(14,2) AS collected FROM "Payment" WHERE "createdAt" <= ${toNextStart}`;
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
            WHERE pay."createdAt" >= ${fromStart} AND pay."createdAt" <= ${toNextStart}
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
            WHERE pay."createdAt" >= ${fromStart}
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
            WHERE pay."createdAt" <= ${toNextStart}
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

  /**
   * Returns all patients that currently have an outstanding balance (>0)
   * Optionally filtered by date range.
   */
  /**
   * Cursor-based getPatientsWithBalances
   */
  async getPatientsWithBalances(
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
      };

      const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
      const cursor = decodeCursor(cursorToken);

      const hasFrom = from !== undefined && from !== null;
      const hasTo = to !== undefined && to !== null;

      // Use inclusive start-of-day for 'from' and exclusive start-of-next-day for 'to'
      const fromStart = isoStartOfDayLiteral(from); // 'YYYY-MM-DDT00:00:00.000Z'
      const toNextStart = isoStartOfNextDayLiteral(to); // 'YYYY-MM-DDT00:00:00.000Z' of next day

      // Build payment subquery (aggregated payments by patient, filtered by createdAt if provided)
      const paymentWhereClause =
        hasFrom && hasTo
          ? `WHERE pay."createdAt" >= ${fromStart} AND pay."createdAt" <= ${toNextStart}`
          : hasFrom
            ? `WHERE pay."createdAt" >= ${fromStart}`
            : hasTo
              ? `WHERE pay."createdAt" <= ${toNextStart}`
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
        const id = Number(cursor.lastPatientId);

        // We handle NULL last_payment_date ordering: since we use "NULLS LAST" in ORDER BY,
        // rows with last_payment_date = NULL are considered *after* any non-null dates.
        // To page correctly when cursor's lastPaymentDate is null, we compare accordingly.
        // This predicate tries to cover both cases.
        keysetPredicate = `
          AND (
            (pm.last_payment_date IS NOT NULL AND ${lp} IS NOT NULL AND (
              pm.last_payment_date < ${lp}
              OR (pm.last_payment_date = ${lp} AND p.id < ${id})
            ))
            OR (pm.last_payment_date IS NULL AND ${lp} IS NOT NULL) 
            OR (pm.last_payment_date IS NULL AND ${lp} IS NULL AND p.id < ${id})
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
          apt.last_appointment_date
        FROM "Patient" p
        LEFT JOIN ${pmSubquery} ON pm.patient_id = p.id
        LEFT JOIN (
          SELECT "patientId" AS patient_id, MAX("date") AS last_appointment_date
          FROM "Appointment"
          GROUP BY "patientId"
        ) apt ON apt.patient_id = p.id
        WHERE (COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0)) > 0
      `;

      const orderBy = `ORDER BY pm.last_payment_date DESC NULLS LAST, p.id DESC`;
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

          if (rows.length === safeLimit) {
            nextCursor = encodeCursor({
              lastPaymentDate: lastPaymentDateIso,
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

  /**
   * Return just the paged balances for a doctor (same logic/filters as previous single-query approach)
   */
  async getPatientsBalancesByDoctor(
    staffId: number,
    limit = 25,
    cursorToken?: string | null,
    from?: Date | null,
    to?: Date | null
  ): Promise<{
    balances: PatientBalanceRow[];
    totalCount: number;
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    if (!Number.isFinite(Number(staffId)) || Number(staffId) <= 0) {
      throw new Error("Invalid staffId");
    }

    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
    const decoded = decodeCursor(cursorToken);

    // Do NOT accept cursors without staffId — they may belong to another listing.
    const effectiveCursor =
      decoded &&
      typeof decoded.staffId === "number" &&
      decoded.staffId === Number(staffId)
        ? decoded
        : null;

    const hasFrom = from !== undefined && from !== null;
    const hasTo = to !== undefined && to !== null;

    // Use inclusive start-of-day for 'from' and exclusive start-of-next-day for 'to'
    const fromStart = isoStartOfDayLiteral(from);
    const toNextStart = isoStartOfNextDayLiteral(to);

    // Filter payments by createdAt (time window) when provided
    const paymentTimeFilter =
      hasFrom && hasTo
        ? `AND pay."createdAt" >= ${fromStart} AND pay."createdAt" <= ${toNextStart}`
        : hasFrom
          ? `AND pay."createdAt" >= ${fromStart}`
          : hasTo
            ? `AND pay."createdAt" <= ${toNextStart}`
            : "";

    // Keyset predicate for paging (same semantics as before)
    let pageKeysetPredicate = "";
    if (effectiveCursor) {
      const lp = effectiveCursor.lastPaymentDate
        ? `'${effectiveCursor.lastPaymentDate}'`
        : "NULL";
      const id = Number(effectiveCursor.lastPatientId);

      pageKeysetPredicate = `AND (
        ( ${lp} IS NOT NULL AND (
            (p.last_payment_date IS NOT NULL AND p.last_payment_date < ${lp})
            OR (p.last_payment_date IS NOT NULL AND p.last_payment_date = ${lp} AND p.id < ${id})
          )
        )
        OR
        ( ${lp} IS NULL AND (
            p.last_payment_date IS NOT NULL
            OR (p.last_payment_date IS NULL AND p.id < ${id})
          )
        )
      )`;
    }

    const paymentsJoinForPatients =
      hasFrom || hasTo
        ? "INNER JOIN payments_agg pa ON pa.patient_id = p.id"
        : "LEFT JOIN payments_agg pa ON pa.patient_id = p.id";

    // Common CTEs (identical to previous single-query approach)
    const commonCtes = `
      WITH
      staff_patients AS (
        SELECT DISTINCT "patientId" AS patient_id
        FROM "Appointment"
        WHERE "staffId" = ${Number(staffId)}
      ),

      payments_agg AS (
        SELECT
          pay."patientId" AS patient_id,
          SUM(pay."totalBilled")::numeric(14,2)   AS total_charges,
          SUM(pay."totalPaid")::numeric(14,2)     AS total_paid,
          SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted,
          MAX(pay."createdAt")                    AS last_payment_date
        FROM "Payment" pay
        JOIN "Claim" c ON pay."claimId" = c.id
        WHERE c."staffId" = ${Number(staffId)}
        ${paymentTimeFilter}
        GROUP BY pay."patientId"
      ),

      last_appointments AS (
        SELECT "patientId" AS patient_id, MAX("date") AS last_appointment_date
        FROM "Appointment"
        GROUP BY "patientId"
      ),

      patients AS (
        SELECT
          p.id,
          p."firstName" AS first_name,
          p."lastName"  AS last_name,
          COALESCE(pa.total_charges, 0)::numeric(14,2)  AS total_charges,
          COALESCE(pa.total_paid, 0)::numeric(14,2)     AS total_paid,
          COALESCE(pa.total_adjusted, 0)::numeric(14,2) AS total_adjusted,
          (COALESCE(pa.total_charges,0) - COALESCE(pa.total_paid,0) - COALESCE(pa.total_adjusted,0))::numeric(14,2) AS current_balance,
          pa.last_payment_date,
          la.last_appointment_date
        FROM "Patient" p
        INNER JOIN staff_patients sp ON sp.patient_id = p.id
        ${paymentsJoinForPatients}
        LEFT JOIN last_appointments la ON la.patient_id = p.id
      )
    `;

    // Query A: fetch the page of patient rows as JSON array
    const balancesQuery = `
      ${commonCtes}

      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS balances_json FROM (
        SELECT
          p.id                   AS "patientId",
          p.first_name           AS "firstName",
          p.last_name            AS "lastName",
          p.total_charges::text  AS "totalCharges",
          p.total_paid::text     AS "totalPaid",
          p.total_adjusted::text AS "totalAdjusted",
          p.current_balance::text AS "currentBalance",
          p.last_payment_date     AS "lastPaymentDate",
          p.last_appointment_date AS "lastAppointmentDate"
        FROM patients p
        WHERE 1=1
        ${pageKeysetPredicate}
        ORDER BY p.last_payment_date DESC NULLS LAST, p.id DESC
        LIMIT ${safeLimit}
      ) t;
    `;

    // Query Count: total_count (same logic as previous combined query's CASE)
    const countQuery = `
      ${commonCtes}

      SELECT
        (CASE WHEN ${hasFrom || hasTo ? "true" : "false"} THEN
           (SELECT COUNT(DISTINCT pa.patient_id) FROM payments_agg pa)
         ELSE
           (SELECT COUNT(*)::int FROM staff_patients)
         END) AS total_count;
    `;

    // Execute balancesQuery
    const balancesRawRows = (await prisma.$queryRawUnsafe(
      balancesQuery
    )) as Array<{ balances_json?: any }>;

    const balancesJson = (balancesRawRows?.[0]?.balances_json as any) ?? [];

    const balancesArr = Array.isArray(balancesJson) ? balancesJson : [];

    const balances: PatientBalanceRow[] = balancesArr.map((r: any) => ({
      patientId: Number(r.patientId),
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      totalCharges: Number(r.totalCharges ?? 0),
      totalPayments: Number(r.totalPaid ?? 0),
      totalAdjusted: Number(r.totalAdjusted ?? 0),
      currentBalance: Number(r.currentBalance ?? 0),
      lastPaymentDate: r.lastPaymentDate
        ? new Date(r.lastPaymentDate).toISOString()
        : null,
      lastAppointmentDate: r.lastAppointmentDate
        ? new Date(r.lastAppointmentDate).toISOString()
        : null,
    }));

    // Determine hasMore and nextCursor
    const hasMore = balances.length === safeLimit;
    let nextCursor: string | null = null;
    if (hasMore) {
      const last = balances[balances.length - 1];
      if (last) {
        nextCursor = encodeCursor({
          staffId: Number(staffId),
          lastPaymentDate: last.lastPaymentDate,
          lastPatientId: Number(last.patientId),
        });
      }
    }

    // Execute countQuery
    const countRows = (await prisma.$queryRawUnsafe(countQuery)) as Array<{
      total_count?: number;
    }>;
    const totalCount = Number(countRows?.[0]?.total_count ?? 0);

    return {
      balances,
      totalCount,
      nextCursor,
      hasMore,
    };
  },

  /**
   * Return only the summary data for a doctor (same logic/filters as previous single-query approach)
   */
  async getSummaryByDoctor(
    staffId: number,
    from?: Date | null,
    to?: Date | null
  ): Promise<{
    totalPatients: number;
    totalOutstanding: number;
    totalCollected: number;
    patientsWithBalance: number;
  }> {
    if (!Number.isFinite(Number(staffId)) || Number(staffId) <= 0) {
      throw new Error("Invalid staffId");
    }

    const hasFrom = from !== undefined && from !== null;
    const hasTo = to !== undefined && to !== null;

    const fromStart = isoStartOfDayLiteral(from);
    const toNextStart = isoStartOfNextDayLiteral(to);

    const paymentTimeFilter =
      hasFrom && hasTo
        ? `AND pay."createdAt" >= ${fromStart} AND pay."createdAt" <= ${toNextStart}`
        : hasFrom
          ? `AND pay."createdAt" >= ${fromStart}`
          : hasTo
            ? `AND pay."createdAt" <= ${toNextStart}`
            : "";

    const summaryQuery = `
      WITH
      payments_agg AS (
        SELECT
          pay."patientId" AS patient_id,
          SUM(pay."totalBilled")::numeric(14,2)   AS total_charges,
          SUM(pay."totalPaid")::numeric(14,2)     AS total_paid,
          SUM(pay."totalAdjusted")::numeric(14,2) AS total_adjusted
        FROM "Payment" pay
        JOIN "Claim" c ON pay."claimId" = c.id
        WHERE c."staffId" = ${Number(staffId)}
        ${paymentTimeFilter}
        GROUP BY pay."patientId"
      )
      SELECT json_build_object(
        'totalPatients', COALESCE(COUNT(DISTINCT pa.patient_id),0),
        'totalOutstanding', COALESCE(SUM(COALESCE(pa.total_charges,0) - COALESCE(pa.total_paid,0) - COALESCE(pa.total_adjusted,0)),0)::text,
        'totalCollected', COALESCE(SUM(COALESCE(pa.total_paid,0)),0)::text,
        'patientsWithBalance', COALESCE(SUM(CASE WHEN (COALESCE(pa.total_charges,0) - COALESCE(pa.total_paid,0) - COALESCE(pa.total_adjusted,0)) > 0 THEN 1 ELSE 0 END),0)
      ) AS summary_json
      FROM payments_agg pa;
    `;

    const rows = (await prisma.$queryRawUnsafe(summaryQuery)) as Array<{
      summary_json?: any;
    }>;

    const summaryRaw = (rows?.[0]?.summary_json as any) ?? {};

    return {
      totalPatients: Number(summaryRaw.totalPatients ?? 0),
      totalOutstanding: Number(summaryRaw.totalOutstanding ?? 0),
      totalCollected: Number(summaryRaw.totalCollected ?? 0),
      patientsWithBalance: Number(summaryRaw.patientsWithBalance ?? 0),
    };
  },
};
