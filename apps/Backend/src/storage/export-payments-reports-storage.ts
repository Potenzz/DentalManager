import { storage } from "../storage";
import { getPatientFinancialRowsFn } from "./patients-storage";
import { GetPatientBalancesResult } from "@repo/db/types";

type PatientSummaryRow = {
  patientId: number;
  firstName: string | null;
  lastName: string | null;
  currentBalance: number;
};

/**
 * Page through storage.getPatientsWithBalances to return the full list (not paginated).
 * Uses the same filters (from/to) as the existing queries.
 */
export async function fetchAllPatientsWithBalances(
  from?: Date | null,
  to?: Date | null,
  pageSize = 500
): Promise<PatientSummaryRow[]> {
  const all: PatientSummaryRow[] = [];
  let cursor: string | null = null;
  while (true) {
    const page: GetPatientBalancesResult =
      await storage.getPatientsWithBalances(pageSize, cursor, from, to);
    if (!page) break;
    if (Array.isArray(page.balances) && page.balances.length) {
      for (const b of page.balances) {
        all.push({
          patientId: Number(b.patientId),
          firstName: b.firstName ?? null,
          lastName: b.lastName ?? null,
          currentBalance: Number(b.currentBalance ?? 0),
        });
      }
    }
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

/**
 * Page through storage.getPatientsBalancesByDoctor to return full patient list for the staff.
 */
export async function fetchAllPatientsForDoctor(
  staffId: number,
  from?: Date | null,
  to?: Date | null,
  pageSize = 500
): Promise<PatientSummaryRow[]> {
  const all: PatientSummaryRow[] = [];
  let cursor: string | null = null;
  while (true) {
    const page: GetPatientBalancesResult =
      await storage.getPatientsBalancesByDoctor(
        staffId,
        pageSize,
        cursor,
        from,
        to
      );
    if (!page) break;
    if (Array.isArray(page.balances) && page.balances.length) {
      for (const b of page.balances) {
        all.push({
          patientId: Number(b.patientId),
          firstName: b.firstName ?? null,
          lastName: b.lastName ?? null,
          currentBalance: Number(b.currentBalance ?? 0),
        });
      }
    }
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

/**
 * For each patient, call the existing function to fetch full financial rows.
 * This uses your existing getPatientFinancialRowsFn which returns { rows, totalCount }.
 *
 * The function returns an array of:
 * { patientId, firstName, lastName, currentBalance, financialRows: Array<{ type, date, procedureCode, billed, paid, adjusted, totalDue, status }> }
 */
export async function buildExportRowsForPatients(
  patients: PatientSummaryRow[],
  perPatientLimit = 5000
) {
  const out: Array<any> = [];

  for (const p of patients) {
    const patientId = Number(p.patientId);
    const { rows } = await getPatientFinancialRowsFn(
      patientId,
      perPatientLimit,
      0
    ); // returns rows array similarly to your earlier code

    const frs = rows.flatMap((r: any) => {
      const svc = r.service_lines ?? [];
      if (svc.length > 0) {
        return svc.map((sl: any) => ({
          type: r.type,
          date: r.date ? new Date(r.date).toLocaleDateString() : "",
          procedureCode: String(sl.procedureCode ?? "-"),
          billed: Number(sl.totalBilled ?? 0),
          paid: Number(sl.totalPaid ?? 0),
          adjusted: Number(sl.totalAdjusted ?? 0),
          totalDue: Number(sl.totalDue ?? 0),
          status: sl.status ?? r.status ?? "",
        }));
      } else {
        return [
          {
            type: r.type,
            date: r.date ? new Date(r.date).toLocaleDateString() : "",
            procedureCode: "-",
            billed: Number(r.total_billed ?? r.totalBilled ?? 0),
            paid: Number(r.total_paid ?? r.totalPaid ?? 0),
            adjusted: Number(r.total_adjusted ?? r.totalAdjusted ?? 0),
            totalDue: Number(r.total_due ?? r.totalDue ?? 0),
            status: r.status ?? "",
          },
        ];
      }
    });

    out.push({
      patientId,
      firstName: p.firstName,
      lastName: p.lastName,
      currentBalance: Number(p.currentBalance ?? 0),
      financialRows: frs,
    });
  }

  return out;
}
