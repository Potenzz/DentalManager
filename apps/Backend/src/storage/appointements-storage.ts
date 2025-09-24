import {
  Appointment,
  InsertAppointment,
  Patient,
  UpdateAppointment,
} from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByUserId(userId: number): Promise<Appointment[]>;
  getAppointmentsByPatientId(patientId: number): Promise<Appointment[]>;
  getPatientFromAppointmentId(
    appointmentId: number
  ): Promise<Patient | undefined>;
  getRecentAppointments(limit: number, offset: number): Promise<Appointment[]>;
  getAppointmentsOnRange(start: Date, end: Date): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(
    id: number,
    appointment: UpdateAppointment
  ): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;
  getPatientAppointmentByDateTime(
    patientId: number,
    date: Date,
    startTime: string
  ): Promise<Appointment | undefined>;
  getStaffAppointmentByDateTime(
    staffId: number,
    date: Date,
    startTime: string,
    excludeId?: number
  ): Promise<Appointment | undefined>;
  getPatientConflictAppointment(
    patientId: number,
    date: Date,
    startTime: string,
    excludeId: number
  ): Promise<Appointment | undefined>;
  getStaffConflictAppointment(
    staffId: number,
    date: Date,
    startTime: string,
    excludeId: number
  ): Promise<Appointment | undefined>;
}

export const appointmentsStorage: IStorage = {
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const appointment = await db.appointment.findUnique({ where: { id } });
    return appointment ?? undefined;
  },

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.appointment.findMany();
  },

  async getAppointmentsByUserId(userId: number): Promise<Appointment[]> {
    return await db.appointment.findMany({ where: { userId } });
  },

  async getAppointmentsByPatientId(patientId: number): Promise<Appointment[]> {
    return await db.appointment.findMany({ where: { patientId } });
  },

  async getPatientFromAppointmentId(
    appointmentId: number
  ): Promise<Patient | undefined> {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });
    return appointment?.patient ?? undefined;
  },

  async getAppointmentsOnRange(start: Date, end: Date): Promise<Appointment[]> {
    return db.appointment.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: "asc" },
    });
  },

  async getRecentAppointments(
    limit: number,
    offset: number
  ): Promise<Appointment[]> {
    return db.appointment.findMany({
      skip: offset,
      take: limit,
      orderBy: { date: "desc" },
    });
  },

  async createAppointment(
    appointment: InsertAppointment
  ): Promise<Appointment> {
    return await db.appointment.create({ data: appointment as Appointment });
  },

  async updateAppointment(
    id: number,
    updateData: UpdateAppointment
  ): Promise<Appointment> {
    try {
      return await db.appointment.update({
        where: { id },
        data: updateData,
      });
    } catch (err) {
      throw new Error(`Appointment with ID ${id} not found`);
    }
  },

  async deleteAppointment(id: number): Promise<void> {
    try {
      await db.appointment.delete({ where: { id } });
    } catch (err) {
      throw new Error(`Appointment with ID ${id} not found`);
    }
  },

  async getPatientAppointmentByDateTime(
    patientId: number,
    date: Date,
    startTime: string
  ): Promise<Appointment | undefined> {
    return (
      (await db.appointment.findFirst({
        where: {
          patientId,
          date,
          startTime,
        },
      })) ?? undefined
    );
  },

  async getStaffAppointmentByDateTime(
    staffId: number,
    date: Date,
    startTime: string,
    excludeId?: number
  ): Promise<Appointment | undefined> {
    return (
      (await db.appointment.findFirst({
        where: {
          staffId,
          date,
          startTime,
          NOT: excludeId ? { id: excludeId } : undefined,
        },
      })) ?? undefined
    );
  },

  async getPatientConflictAppointment(
    patientId: number,
    date: Date,
    startTime: string,
    excludeId: number
  ): Promise<Appointment | undefined> {
    return (
      (await db.appointment.findFirst({
        where: {
          patientId,
          date,
          startTime,
          NOT: { id: excludeId },
        },
      })) ?? undefined
    );
  },

  async getStaffConflictAppointment(
    staffId: number,
    date: Date,
    startTime: string,
    excludeId: number
  ): Promise<Appointment | undefined> {
    return (
      (await db.appointment.findFirst({
        where: {
          staffId,
          date,
          startTime,
          NOT: { id: excludeId },
        },
      })) ?? undefined
    );
  },
};
