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
}

export interface IPaymentsReportsStorage {
  getPatientBalances(
    limit: number,
    offset: number,
    from?: Date | null,
    to?: Date | null,
    minBalanceOnly?: boolean
  ): Promise<{ balances: PatientBalanceRow[]; totalCount: number }>;

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

export const paymentsReportsStorage: IPaymentsReportsStorage = {
  async getPatientBalances(
    limit = 25,
    offset = 0,
    from?: Date | null,
    to?: Date | null,
    minBalanceOnly = false
  ) {
    try {
      type RawRow = {
        patient_id: number;
        first_name: string | null;
        last_name: string | null;
        total_charges: string;
        total_payments: string;
        total_adjusted: string;
        current_balance: string;
        last_payment_date: Date | null;
        last_appointment_date: Date | null;
      };

      const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
      const safeOffset = Math.max(0, Number(offset) || 0);

      const hasFrom = from !== undefined && from !== null;
      const hasTo = to !== undefined && to !== null;
      const fromLit = fmtDateLiteral(from);
      const toLit = fmtDateLiteral(to);

      // Build pm subquery (aggregated payments in the date window) — only Payment table used
      let pmSubquery = "";
      if (hasFrom && hasTo) {
        pmSubquery = `
          (
            SELECT
              pay."patientId" AS patient_id,
              SUM(pay."totalBilled")::numeric(12,2) AS total_charges,
              SUM(pay."totalPaid")::numeric(12,2) AS total_paid,
              SUM(pay."totalAdjusted")::numeric(12,2) AS total_adjusted,
              MAX(pay."createdAt") AS last_payment_date
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit} AND pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) pm
        `;
      } else if (hasFrom) {
        pmSubquery = `
          (
            SELECT
              pay."patientId" AS patient_id,
              SUM(pay."totalBilled")::numeric(12,2) AS total_charges,
              SUM(pay."totalPaid")::numeric(12,2) AS total_paid,
              SUM(pay."totalAdjusted")::numeric(12,2) AS total_adjusted,
              MAX(pay."createdAt") AS last_payment_date
            FROM "Payment" pay
            WHERE pay."createdAt" >= ${fromLit}
            GROUP BY pay."patientId"
          ) pm
        `;
      } else if (hasTo) {
        pmSubquery = `
          (
            SELECT
              pay."patientId" AS patient_id,
              SUM(pay."totalBilled")::numeric(12,2) AS total_charges,
              SUM(pay."totalPaid")::numeric(12,2) AS total_paid,
              SUM(pay."totalAdjusted")::numeric(12,2) AS total_adjusted,
              MAX(pay."createdAt") AS last_payment_date
            FROM "Payment" pay
            WHERE pay."createdAt" <= ${toLit}
            GROUP BY pay."patientId"
          ) pm
        `;
      } else {
        pmSubquery = `
          (
            SELECT
              pay."patientId" AS patient_id,
              SUM(pay."totalBilled")::numeric(12,2) AS total_charges,
              SUM(pay."totalPaid")::numeric(12,2) AS total_paid,
              SUM(pay."totalAdjusted")::numeric(12,2) AS total_adjusted,
              MAX(pay."createdAt") AS last_payment_date
            FROM "Payment" pay
            GROUP BY pay."patientId"
          ) pm
        `;
      }

      const baseQuery = `
        SELECT
          p.id AS patient_id,
          p."firstName" AS first_name,
          p."lastName" AS last_name,
          COALESCE(pm.total_charges,0)::numeric(12,2) AS total_charges,
          COALESCE(pm.total_paid,0)::numeric(12,2) AS total_payments,
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
      `;

      const balanceWhere = `(COALESCE(pm.total_charges,0) - COALESCE(pm.total_paid,0) - COALESCE(pm.total_adjusted,0)) > 0`;

      const finalQuery = minBalanceOnly
        ? `${baseQuery} WHERE ${balanceWhere} ORDER BY pm.last_payment_date DESC NULLS LAST, p."createdAt" DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`
        : `${baseQuery} ORDER BY pm.last_payment_date DESC NULLS LAST, p."createdAt" DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      // Execute query
      const rows = (await prisma.$queryRawUnsafe(finalQuery)) as RawRow[];

      // totalCount — count distinct patients that have payments in the date window (and if minBalanceOnly, only those with positive balance)
      let countSql = "";
      if (hasFrom && hasTo) {
        if (minBalanceOnly) {
          countSql = `
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
        } else {
          countSql = `
            SELECT COUNT(*)::int AS cnt FROM (
              SELECT pay."patientId" AS patient_id
              FROM "Payment" pay
              WHERE pay."createdAt" >= ${fromLit} AND pay."createdAt" <= ${toLit}
              GROUP BY pay."patientId"
            ) t
          `;
        }
      } else if (hasFrom) {
        if (minBalanceOnly) {
          countSql = `
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
        } else {
          countSql = `
            SELECT COUNT(*)::int AS cnt FROM (
              SELECT pay."patientId" AS patient_id
              FROM "Payment" pay
              WHERE pay."createdAt" >= ${fromLit}
              GROUP BY pay."patientId"
            ) t
          `;
        }
      } else if (hasTo) {
        if (minBalanceOnly) {
          countSql = `
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
          countSql = `
            SELECT COUNT(*)::int AS cnt FROM (
              SELECT pay."patientId" AS patient_id
              FROM "Payment" pay
              WHERE pay."createdAt" <= ${toLit}
              GROUP BY pay."patientId"
            ) t
          `;
        }
      } else {
        if (minBalanceOnly) {
          countSql = `
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
        } else {
          countSql = `SELECT COUNT(DISTINCT "patientId")::int AS cnt FROM "Payment"`;
        }
      }

      const cntRows = (await prisma.$queryRawUnsafe(countSql)) as {
        cnt: number;
      }[];
      const totalCount = cntRows?.[0]?.cnt ?? 0;

      const balances: PatientBalanceRow[] = rows.map((r) => ({
        patientId: Number(r.patient_id),
        firstName: r.first_name,
        lastName: r.last_name,
        totalCharges: Number(r.total_charges ?? 0),
        totalPayments: Number(r.total_payments ?? 0),
        totalAdjusted: Number(r.total_adjusted ?? 0),
        currentBalance: Number(r.current_balance ?? 0),
        lastPaymentDate: r.last_payment_date
          ? new Date(r.last_payment_date).toISOString()
          : null,
        lastAppointmentDate: r.last_appointment_date
          ? new Date(r.last_appointment_date).toISOString()
          : null,
      }));

      return { balances, totalCount };
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
