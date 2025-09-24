import {
  Claim,
  ClaimWithServiceLines,
  InsertClaim,
  UpdateClaim,
} from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  getClaim(id: number): Promise<Claim | undefined>;
  getRecentClaimsByPatientId(
    patientId: number,
    limit: number,
    offset: number
  ): Promise<ClaimWithServiceLines[]>;

  getTotalClaimCountByPatient(patientId: number): Promise<number>;
  getClaimsByAppointmentId(appointmentId: number): Promise<Claim[]>;
  getRecentClaims(limit: number, offset: number): Promise<Claim[]>;
  getTotalClaimCount(): Promise<number>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: number, updates: UpdateClaim): Promise<Claim>;
  deleteClaim(id: number): Promise<void>;
}

export const claimsStorage: IStorage = {
  async getClaim(id: number): Promise<Claim | undefined> {
    const claim = await db.claim.findUnique({ where: { id } });
    return claim ?? undefined;
  },

  async getRecentClaimsByPatientId(
    patientId: number,
    limit: number,
    offset: number
  ): Promise<ClaimWithServiceLines[]> {
    return db.claim.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        serviceLines: true,
        staff: true,
        claimFiles: true,
      },
    });
  },

  async getTotalClaimCountByPatient(patientId: number): Promise<number> {
    return db.claim.count({
      where: { patientId },
    });
  },

  async getClaimsByAppointmentId(appointmentId: number): Promise<Claim[]> {
    return await db.claim.findMany({ where: { appointmentId } });
  },

  async getRecentClaims(
    limit: number,
    offset: number
  ): Promise<ClaimWithServiceLines[]> {
    return db.claim.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: { serviceLines: true, staff: true, claimFiles: true },
    });
  },

  async getTotalClaimCount(): Promise<number> {
    return db.claim.count();
  },

  async createClaim(claim: InsertClaim): Promise<Claim> {
    return await db.claim.create({ data: claim as Claim });
  },

  async updateClaim(id: number, updates: UpdateClaim): Promise<Claim> {
    try {
      return await db.claim.update({
        where: { id },
        data: updates,
      });
    } catch (err) {
      throw new Error(`Claim with ID ${id} not found`);
    }
  },

  async deleteClaim(id: number): Promise<void> {
    try {
      await db.claim.delete({ where: { id } });
    } catch (err) {
      throw new Error(`Claim with ID ${id} not found`);
    }
  },
};
