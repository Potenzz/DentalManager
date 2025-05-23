import { prisma as db } from "@repo/db/client";
import {
  AppointmentUncheckedCreateInputObjectSchema,
  PatientUncheckedCreateInputObjectSchema,
  UserUncheckedCreateInputObjectSchema,
  StaffUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { z } from "zod";

//creating types out of schema auto generated.
type Appointment = z.infer<typeof AppointmentUncheckedCreateInputObjectSchema>;

const insertAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});
type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

const updateAppointmentSchema = (
  AppointmentUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();
type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;

//patient types
const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientUncheckedCreateInputObjectSchema>;
type Patient2 = z.infer<typeof PatientSchema>;

const insertPatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
});
type InsertPatient = z.infer<typeof insertPatientSchema>;

const updatePatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    userId: true,
  })
  .partial();

type UpdatePatient = z.infer<typeof updatePatientSchema>;

//user types
type User = z.infer<typeof UserUncheckedCreateInputObjectSchema>;

const insertUserSchema = (
  UserUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).pick({
  username: true,
  password: true,
});

const loginSchema = (insertUserSchema as unknown as z.ZodObject<any>).extend({
  rememberMe: z.boolean().optional(),
});

const registerSchema = (insertUserSchema as unknown as z.ZodObject<any>)
  .extend({
    confirmPassword: z.string().min(6, {
      message: "Password must be at least 6 characters long",
    }),
    agreeTerms: z.literal(true, {
      errorMap: () => ({
        message: "You must agree to the terms and conditions",
      }),
    }),
  })
  .refine((data: any) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type InsertUser = z.infer<typeof insertUserSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// staff types:
type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Patient methods
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientsByUserId(userId: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: UpdatePatient): Promise<Patient>;
  deletePatient(id: number): Promise<void>;

  // Appointment methods
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>; 
  getAppointmentsByUserId(userId: number): Promise<Appointment[]>;
  getAppointmentsByPatientId(patientId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(
    id: number,
    appointment: UpdateAppointment
  ): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;

  // Staff methods
  getStaff(id: number): Promise<Staff | undefined>;
  getAllStaff(): Promise<Staff[]>;
  createStaff(staff: Staff): Promise<Staff>;
  updateStaff(id: number, updates: Partial<Staff>): Promise<Staff | undefined>;
  deleteStaff(id: number): Promise<boolean>;
}

export const storage: IStorage = {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.user.findUnique({ where: { id } });
    return user ?? undefined;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await db.user.findUnique({ where: { username } });
    return user ?? undefined;
  },

  async createUser(user: InsertUser): Promise<User> {
    return await db.user.create({ data: user as User });
  },

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
    try {
      return await db.user.update({ where: { id }, data: updates });
    } catch {
      return undefined;
    }
  },

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // Patient methods
  async getPatient(id: number): Promise<Patient | undefined> {
    const patient = await db.patient.findUnique({ where: { id } });
    return patient ?? undefined;
  },

  async getPatientsByUserId(userId: number): Promise<Patient[]> {
    return await db.patient.findMany({ where: { userId } });
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
      throw new Error(`Patient with ID ${id} not found`);
    }
  },

  // Appointment methods
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
};
