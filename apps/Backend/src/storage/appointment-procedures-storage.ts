import {
  AppointmentProcedure,
  InsertAppointmentProcedure,
  UpdateAppointmentProcedure,
} from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IAppointmentProceduresStorage {
  getByAppointmentId(appointmentId: number): Promise<AppointmentProcedure[]>;
  createProcedure(
    data: InsertAppointmentProcedure
  ): Promise<AppointmentProcedure>;
  createProceduresBulk(data: InsertAppointmentProcedure[]): Promise<number>;
  updateProcedure(
    id: number,
    data: UpdateAppointmentProcedure
  ): Promise<AppointmentProcedure>;
  deleteProcedure(id: number): Promise<void>;
  clearByAppointmentId(appointmentId: number): Promise<void>;
}

export const appointmentProceduresStorage: IAppointmentProceduresStorage = {
  async getByAppointmentId(
    appointmentId: number
  ): Promise<AppointmentProcedure[]> {
    return db.appointmentProcedure.findMany({
      where: { appointmentId },
      orderBy: { createdAt: "asc" },
    });
  },

  async createProcedure(
    data: InsertAppointmentProcedure
  ): Promise<AppointmentProcedure> {
    return db.appointmentProcedure.create({
      data: data as AppointmentProcedure,
    });
  },

  async createProceduresBulk(
    data: InsertAppointmentProcedure[]
  ): Promise<number> {
    const result = await db.appointmentProcedure.createMany({
      data: data as any[],
    });
    return result.count;
  },

  async updateProcedure(
    id: number,
    data: UpdateAppointmentProcedure
  ): Promise<AppointmentProcedure> {
    return db.appointmentProcedure.update({
      where: { id },
      data: data as any,
    });
  },

  async deleteProcedure(id: number): Promise<void> {
    await db.appointmentProcedure.delete({
      where: { id },
    });
  },

  async clearByAppointmentId(appointmentId: number): Promise<void> {
    await db.appointmentProcedure.deleteMany({
      where: { appointmentId },
    });
  },
};
