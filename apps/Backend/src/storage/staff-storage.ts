import { Staff } from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  getStaff(id: number): Promise<Staff | undefined>;
  getAllStaff(): Promise<Staff[]>;
  createStaff(staff: Staff): Promise<Staff>;
  updateStaff(id: number, updates: Partial<Staff>): Promise<Staff | undefined>;
  deleteStaff(id: number): Promise<boolean>;
  countAppointmentsByStaffId(staffId: number): Promise<number>;
  countClaimsByStaffId(staffId: number): Promise<number>;
}

export const staffStorage: IStorage = {
  // Staff methods
  async getStaff(id: number): Promise<Staff | undefined> {
    const staff = await db.staff.findUnique({ where: { id } });
    return staff ?? undefined;
  },

  async getAllStaff(): Promise<Staff[]> {
    const staff = await db.staff.findMany();
    return staff;
  },

  async createStaff(staff: Staff): Promise<Staff> {
    const createdStaff = await db.staff.create({
      data: staff,
    });
    return createdStaff;
  },

  async updateStaff(
    id: number,
    updates: Partial<Staff>
  ): Promise<Staff | undefined> {
    const updatedStaff = await db.staff.update({
      where: { id },
      data: updates,
    });
    return updatedStaff ?? undefined;
  },

  async deleteStaff(id: number): Promise<boolean> {
    try {
      await db.staff.delete({ where: { id } });
      return true;
    } catch (error) {
      console.error("Error deleting staff:", error);
      return false;
    }
  },

  async countAppointmentsByStaffId(staffId: number): Promise<number> {
    return await db.appointment.count({ where: { staffId } });
  },

  async countClaimsByStaffId(staffId: number): Promise<number> {
    return await db.claim.count({ where: { staffId } });
  },
};
