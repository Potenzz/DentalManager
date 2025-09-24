import { InsertPatient, Patient, UpdatePatient } from "@repo/db/types";
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
        data: updateData,
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
};
