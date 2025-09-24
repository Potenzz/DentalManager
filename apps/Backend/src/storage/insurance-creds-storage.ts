import { InsertInsuranceCredential, InsuranceCredential } from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  getInsuranceCredential(id: number): Promise<InsuranceCredential | null>;
  getInsuranceCredentialsByUser(userId: number): Promise<InsuranceCredential[]>;
  createInsuranceCredential(
    data: InsertInsuranceCredential
  ): Promise<InsuranceCredential>;
  updateInsuranceCredential(
    id: number,
    updates: Partial<InsuranceCredential>
  ): Promise<InsuranceCredential | null>;
  deleteInsuranceCredential(userId: number, id: number): Promise<boolean>;
  getInsuranceCredentialByUserAndSiteKey(
    userId: number,
    siteKey: string
  ): Promise<InsuranceCredential | null>;
}

export const insuranceCredsStorage: IStorage = {
  async getInsuranceCredential(id: number) {
    return await db.insuranceCredential.findUnique({ where: { id } });
  },

  async getInsuranceCredentialsByUser(userId: number) {
    return await db.insuranceCredential.findMany({ where: { userId } });
  },

  async createInsuranceCredential(data: InsertInsuranceCredential) {
    return await db.insuranceCredential.create({
      data: data as InsuranceCredential,
    });
  },

  async updateInsuranceCredential(
    id: number,
    updates: Partial<InsuranceCredential>
  ) {
    return await db.insuranceCredential.update({
      where: { id },
      data: updates,
    });
  },

  async deleteInsuranceCredential(userId: number, id: number) {
    try {
      await db.insuranceCredential.delete({ where: { userId, id } });
      return true;
    } catch {
      return false;
    }
  },

  async getInsuranceCredentialByUserAndSiteKey(
    userId: number,
    siteKey: string
  ): Promise<InsuranceCredential | null> {
    return await db.insuranceCredential.findFirst({
      where: { userId, siteKey },
    });
  },
};
