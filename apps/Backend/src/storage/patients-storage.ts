import {
  FinancialRow,
  InsertPatient,
  Patient,
  UpdatePatient,
} from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  // Patient methods
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByInsuranceId(insuranceId: string): Promise<Patient | null>;
  getPatientsByUserId(userId: number): Promise<Patient[]>;
  getRecentPatients(limit: number, offset: number): Promise<Patient[]>;
  getPatientsByIds(ids: number[]): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: UpdatePatient): Promise<Patient>;
  deletePatient(id: number): Promise<void>;
  searchPatients(args: {
    filters: any;
    limit: number;
    offset: number;
  }): Promise<
    {
      id: number;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      gender: string | null;
      dateOfBirth: Date;
      insuranceId: string | null;
      insuranceProvider: string | null;
      status: string;
    }[]
  >;
  getTotalPatientCount(): Promise<number>;
  countPatients(filters: any): Promise<number>; // optional but useful
  getPatientFinancialRows(
    patientId: number,
    limit?: number,
    offset?: number
  ): Promise<{ rows: any[]; totalCount: number }>;
}

export const patientsStorage: IStorage = {
  // Patient methods
  async getPatient(id: number): Promise<Patient | undefined> {
    const patient = await db.patient.findUnique({ where: { id } });
    return patient ?? undefined;
  },

  async getPatientsByUserId(userId: number): Promise<Patient[]> {
    return await db.patient.findMany({ where: { userId } });
  },

  async getPatientByInsuranceId(insuranceId: string): Promise<Patient | null> {
    return db.patient.findFirst({
      where: { insuranceId },
    });
  },

  async getRecentPatients(limit: number, offset: number): Promise<Patient[]> {
    return db.patient.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  },

  async getPatientsByIds(ids: number[]): Promise<Patient[]> {
    if (!ids || ids.length === 0) return [];
    const uniqueIds = Array.from(new Set(ids));
    return db.patient.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        insuranceId: true,
        insuranceProvider: true,
        status: true,
        userId: true,
        createdAt: true,
      },
    });
  },

  async createPatient(patient: InsertPatient): Promise<Patient> {
    return await db.patient.create({ data: patient as Patient });
  },

  async updatePatient(id: number, updateData: UpdatePatient): Promise<Patient> {
    try {
      return await db.patient.update({
        where: { id },
        data: updateData as Patient,
      });
    } catch (err) {
      throw new Error(`Patient with ID ${id} not found`);
    }
  },

  async deletePatient(id: number): Promise<void> {
    try {
      await db.patient.delete({ where: { id } });
    } catch (err) {
      console.error("Error deleting patient:", err);
      throw new Error(`Failed to delete patient: ${err}`);
    }
  },

  async searchPatients({
    filters,
    limit,
    offset,
  }: {
    filters: any;
    limit: number;
    offset: number;
  }) {
    return db.patient.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        insuranceId: true,
        insuranceProvider: true,
        status: true,
      },
    });
  },

  async getTotalPatientCount(): Promise<number> {
    return db.patient.count();
  },

  async countPatients(filters: any) {
    return db.patient.count({ where: filters });
  },

  async getPatientFinancialRows(patientId: number, limit = 50, offset = 0) {
    return getPatientFinancialRowsFn(patientId, limit, offset);
  },
};

export const getPatientFinancialRowsFn = async (
  patientId: number,
  limit = 50,
  offset = 0
): Promise<{ rows: FinancialRow[]; totalCount: number }> => {
  try {
    // counts
    const [[{ count_claims }], [{ count_payments_without_claim }]] =
      (await Promise.all([
        db.$queryRaw`SELECT COUNT(1) AS count_claims FROM "Claim" c WHERE c."patientId" = ${patientId}`,
        db.$queryRaw`SELECT COUNT(1) AS count_payments_without_claim FROM "Payment" p WHERE p."patientId" = ${patientId} AND p."claimId" IS NULL`,
      ])) as any;

    const totalCount =
      Number(count_claims ?? 0) + Number(count_payments_without_claim ?? 0);

    const rawRows = (await db.$queryRaw`
      WITH claim_rows AS (
        SELECT
          'CLAIM'::text AS type,
          c.id,
          COALESCE(c."serviceDate", c."createdAt")::timestamptz AS date,
          c."createdAt"::timestamptz AS created_at,
          c.status::text AS status,
          COALESCE(sum(sl."totalBilled")::numeric::text, '0') AS total_billed,
          COALESCE(sum(sl."totalPaid")::numeric::text, '0') AS total_paid,
          COALESCE(sum(sl."totalAdjusted")::numeric::text, '0') AS total_adjusted,
          COALESCE(sum(sl."totalDue")::numeric::text, '0') AS total_due,
          (
            SELECT (pat."firstName" || ' ' || pat."lastName") FROM "Patient" pat WHERE pat.id = c."patientId" LIMIT 1
          ) AS patient_name,
          (
            SELECT coalesce(json_agg(
              json_build_object(
                'id', sl2.id,
                'procedureCode', sl2."procedureCode",
                'procedureDate', sl2."procedureDate",
                'toothNumber', sl2."toothNumber",
                'toothSurface', sl2."toothSurface",
                'totalBilled', sl2."totalBilled",
                'totalPaid', sl2."totalPaid",
                'totalAdjusted', sl2."totalAdjusted",
                'totalDue', sl2."totalDue",
                'status', sl2.status
              )
            ), '[]'::json)
            FROM "ServiceLine" sl2 WHERE sl2."claimId" = c.id
          ) AS service_lines,
          (
            SELECT coalesce(json_agg(
              json_build_object(
                'id', p2.id,
                'totalBilled', p2."totalBilled",
                'totalPaid', p2."totalPaid",
                'totalAdjusted', p2."totalAdjusted",
                'totalDue', p2."totalDue",
                'status', p2.status::text,
                'createdAt', p2."createdAt",
                'icn', p2.icn,
                'notes', p2.notes
              )
            ), '[]'::json)
            FROM "Payment" p2 WHERE p2."claimId" = c.id
          ) AS payments
        FROM "Claim" c
        LEFT JOIN "ServiceLine" sl ON sl."claimId" = c.id
        WHERE c."patientId" = ${patientId}
        GROUP BY c.id
      ),
      payment_rows AS (
        SELECT
          'PAYMENT'::text AS type,
          p.id,
          p."createdAt"::timestamptz AS date,
          p."createdAt"::timestamptz AS created_at,
          p.status::text AS status,
          p."totalBilled"::numeric::text AS total_billed,
          p."totalPaid"::numeric::text AS total_paid,
          p."totalAdjusted"::numeric::text AS total_adjusted,
          p."totalDue"::numeric::text AS total_due,
          (
            SELECT (pat."firstName" || ' ' || pat."lastName") FROM "Patient" pat WHERE pat.id = p."patientId" LIMIT 1
          ) AS patient_name,
          -- aggregate service lines that belong to this payment (if any)
          (
            SELECT coalesce(json_agg(
              json_build_object(
                'id', sl3.id,
                'procedureCode', sl3."procedureCode",
                'procedureDate', sl3."procedureDate",
                'toothNumber', sl3."toothNumber",
                'toothSurface', sl3."toothSurface",
                'totalBilled', sl3."totalBilled",
                'totalPaid', sl3."totalPaid",
                'totalAdjusted', sl3."totalAdjusted",
                'totalDue', sl3."totalDue",
                'status', sl3.status
              )
            ), '[]'::json)
            FROM "ServiceLine" sl3 WHERE sl3."paymentId" = p.id
          ) AS service_lines,
          json_build_array(
            json_build_object(
              'id', p.id,
              'totalBilled', p."totalBilled",
              'totalPaid', p."totalPaid",
              'totalAdjusted', p."totalAdjusted",
              'totalDue', p."totalDue",
              'status', p.status::text,
              'createdAt', p."createdAt",
              'icn', p.icn,
              'notes', p.notes
            )
          ) AS payments
        FROM "Payment" p
        WHERE p."patientId" = ${patientId} AND p."claimId" IS NULL
      )
      SELECT type, id, date, created_at, status, total_billed, total_paid, total_adjusted, total_due, patient_name, service_lines, payments
      FROM (
        SELECT * FROM claim_rows
        UNION ALL
        SELECT * FROM payment_rows
      ) t
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as any[];

    // map to expected JS shape; convert totals to numbers
    const rows: FinancialRow[] = rawRows.map((r: any) => ({
      type: r.type,
      id: Number(r.id),
      date: r.date ? r.date.toString() : null,
      createdAt: r.created_at ? r.created_at.toString() : null,
      status: r.status ?? null,
      total_billed: Number(r.total_billed ?? 0),
      total_paid: Number(r.total_paid ?? 0),
      total_adjusted: Number(r.total_adjusted ?? 0),
      total_due: Number(r.total_due ?? 0),
      patient_name: r.patient_name ?? null,
      service_lines: r.service_lines ?? [],
      payments: r.payments ?? [],
    }));

    return { rows, totalCount };
  } catch (err) {
    console.error("getPatientFinancialRowsFn error:", err);
    throw err;
  }
};
