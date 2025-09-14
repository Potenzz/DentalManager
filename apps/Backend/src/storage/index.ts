import { prisma as db } from "@repo/db/client";
import { PdfCategory } from "@repo/db/generated/prisma";
import {
  Appointment,
  Claim,
  ClaimWithServiceLines,
  DatabaseBackup,
  InsertAppointment,
  InsertClaim,
  InsertInsuranceCredential,
  InsertPatient,
  InsertPayment,
  InsertUser,
  InsuranceCredential,
  Notification,
  NotificationTypes,
  Patient,
  Payment,
  PaymentWithExtras,
  PdfFile,
  PdfGroup,
  Staff,
  UpdateAppointment,
  UpdateClaim,
  UpdatePatient,
  UpdatePayment,
  User,
} from "@repo/db/types";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUsers(limit: number, offset: number): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

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

  // Appointment methods
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByUserId(userId: number): Promise<Appointment[]>;
  getAppointmentsByPatientId(patientId: number): Promise<Appointment[]>;
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

  // Staff methods
  getStaff(id: number): Promise<Staff | undefined>;
  getAllStaff(): Promise<Staff[]>;
  createStaff(staff: Staff): Promise<Staff>;
  updateStaff(id: number, updates: Partial<Staff>): Promise<Staff | undefined>;
  deleteStaff(id: number): Promise<boolean>;
  countAppointmentsByStaffId(staffId: number): Promise<number>;
  countClaimsByStaffId(staffId: number): Promise<number>;

  // Claim methods
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

  // InsuranceCredential methods
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

  // General PDF Methods
  createPdfFile(
    groupId: number,
    filename: string,
    pdfData: Buffer
  ): Promise<PdfFile>;
  getPdfFileById(id: number): Promise<PdfFile | undefined>;
  getPdfFilesByGroupId(groupId: number): Promise<PdfFile[]>;
  getRecentPdfFiles(limit: number, offset: number): Promise<PdfFile[]>;
  deletePdfFile(id: number): Promise<boolean>;
  updatePdfFile(
    id: number,
    updates: Partial<Pick<PdfFile, "filename" | "pdfData">>
  ): Promise<PdfFile | undefined>;

  // PDF Group management
  createPdfGroup(
    patientId: number,
    title: string,
    category: PdfCategory
  ): Promise<PdfGroup>;
  findPdfGroupByPatientTitleAndCategory(
    patientId: number,
    title: string,
    category: PdfCategory
  ): Promise<PdfGroup | undefined>;
  getAllPdfGroups(): Promise<PdfGroup[]>;
  getPdfGroupById(id: number): Promise<PdfGroup | undefined>;
  getPdfGroupsByPatientId(patientId: number): Promise<PdfGroup[]>;
  updatePdfGroup(
    id: number,
    updates: Partial<Pick<PdfGroup, "title" | "category">>
  ): Promise<PdfGroup | undefined>;
  deletePdfGroup(id: number): Promise<boolean>;

  // Payment methods:
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePayment(id: number, updates: UpdatePayment): Promise<Payment>;
  deletePayment(id: number, userId: number): Promise<void>;
  getPaymentById(id: number): Promise<PaymentWithExtras | null>;
  getRecentPaymentsByPatientId(
    patientId: number,
    limit: number,
    offset: number
  ): Promise<PaymentWithExtras[] | null>;
  getTotalPaymentCountByPatient(patientId: number): Promise<number>;
  getPaymentsByClaimId(claimId: number): Promise<PaymentWithExtras | null>;
  getRecentPayments(
    limit: number,
    offset: number
  ): Promise<PaymentWithExtras[]>;
  getPaymentsByDateRange(from: Date, to: Date): Promise<PaymentWithExtras[]>;
  getTotalPaymentCount(): Promise<number>;

  // Database Backup methods
  createBackup(userId: number): Promise<DatabaseBackup>;
  getLastBackup(userId: number): Promise<DatabaseBackup | null>;
  getBackups(userId: number, limit?: number): Promise<DatabaseBackup[]>;
  deleteBackups(userId: number): Promise<number>; // clears all for user

  // Notification methods
  createNotification(
    userId: number,
    type: NotificationTypes,
    message: string
  ): Promise<Notification>;
  getNotifications(
    userId: number,
    limit?: number,
    offset?: number
  ): Promise<Notification[]>;
  markNotificationRead(
    userId: number,
    notificationId: number
  ): Promise<boolean>;
  markAllNotificationsRead(userId: number): Promise<number>;
  deleteNotificationsByType(
    userId: number,
    type: NotificationTypes
  ): Promise<number>;
  deleteAllNotifications(userId: number): Promise<number>;
}

export const storage: IStorage = {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.user.findUnique({ where: { id } });
    return user ?? undefined;
  },

  async getUsers(limit: number, offset: number): Promise<User[]> {
    return await db.user.findMany({ skip: offset, take: limit });
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

  // Claim methods implementation
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
      include: { serviceLines: true, staff: true },
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

  // Insurance Creds
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

  // PDF Files
  async createPdfFile(groupId, filename, pdfData) {
    return db.pdfFile.create({
      data: {
        groupId,
        filename,
        pdfData,
      },
    });
  },

  async getAllPdfGroups(): Promise<PdfGroup[]> {
    return db.pdfGroup.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getPdfFileById(id) {
    return (await db.pdfFile.findUnique({ where: { id } })) ?? undefined;
  },

  async getPdfFilesByGroupId(groupId) {
    return db.pdfFile.findMany({
      where: { groupId },
      orderBy: { uploadedAt: "desc" },
    });
  },

  async getRecentPdfFiles(limit: number, offset: number): Promise<PdfFile[]> {
    return db.pdfFile.findMany({
      skip: offset,
      take: limit,
      orderBy: { uploadedAt: "desc" },
      include: { group: true },
    });
  },

  async updatePdfFile(id, updates) {
    try {
      return await db.pdfFile.update({
        where: { id },
        data: updates,
      });
    } catch {
      return undefined;
    }
  },

  async deletePdfFile(id) {
    try {
      await db.pdfFile.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ----------------------
  // PdfGroup CRUD
  // ----------------------

  async createPdfGroup(patientId, title, category) {
    return db.pdfGroup.create({
      data: {
        patientId,
        title,
        category,
      },
    });
  },

  async findPdfGroupByPatientTitleAndCategory(patientId, title, category) {
    return (
      (await db.pdfGroup.findFirst({
        where: {
          patientId,
          title,
          category,
        },
      })) ?? undefined
    );
  },

  async getPdfGroupById(id) {
    return (await db.pdfGroup.findUnique({ where: { id } })) ?? undefined;
  },

  async getPdfGroupsByPatientId(patientId) {
    return db.pdfGroup.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
  },

  async updatePdfGroup(id, updates) {
    try {
      return await db.pdfGroup.update({
        where: { id },
        data: updates,
      });
    } catch {
      return undefined;
    }
  },

  async deletePdfGroup(id) {
    try {
      await db.pdfGroup.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // Payment Methods
  async getPayment(id: number): Promise<Payment | undefined> {
    const payment = await db.payment.findUnique({ where: { id } });
    return payment ?? undefined;
  },

  async createPayment(payment: InsertPayment): Promise<Payment> {
    return db.payment.create({ data: payment as Payment });
  },

  async updatePayment(id: number, updates: UpdatePayment): Promise<Payment> {
    const existing = await db.payment.findFirst({ where: { id } });
    if (!existing) {
      throw new Error("Payment not found");
    }

    return db.payment.update({
      where: { id },
      data: updates,
    });
  },

  async deletePayment(id: number, userId: number): Promise<void> {
    const existing = await db.payment.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new Error("Not authorized or payment not found");
    }

    await db.payment.delete({ where: { id } });
  },

  async getRecentPaymentsByPatientId(
    patientId: number,
    limit: number,
    offset: number
  ): Promise<PaymentWithExtras[]> {
    const payments = await db.payment.findMany({
      where: { claim: { patientId } },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        claim: {
          include: {
            serviceLines: true,
          },
        },
        serviceLines: true,
        serviceLineTransactions: {
          include: {
            serviceLine: true,
          },
        },
        updatedBy: true,
        patient: true,
      },
    });

    return payments.map((payment) => ({
      ...payment,
      patientName: payment.claim?.patientName ?? "",
      paymentDate: payment.createdAt,
      paymentMethod: payment.serviceLineTransactions[0]?.method ?? "OTHER",
    }));
  },

  async getTotalPaymentCountByPatient(patientId: number): Promise<number> {
    return db.payment.count({
      where: { claim: { patientId } },
    });
  },

  async getPaymentById(id: number): Promise<PaymentWithExtras | null> {
    const payment = await db.payment.findFirst({
      where: { id },
      include: {
        claim: {
          include: {
            serviceLines: true,
          },
        },
        serviceLines: true,
        serviceLineTransactions: {
          include: {
            serviceLine: true,
          },
        },
        updatedBy: true,
        patient: true,
      },
    });

    if (!payment) return null;

    return {
      ...payment,
      patientName: payment.claim?.patientName ?? "",
      paymentDate: payment.createdAt,
      paymentMethod: payment.serviceLineTransactions[0]?.method ?? "OTHER",
    };
  },

  async getPaymentsByClaimId(
    claimId: number
  ): Promise<PaymentWithExtras | null> {
    const payment = await db.payment.findFirst({
      where: { claimId },
      include: {
        claim: {
          include: {
            serviceLines: true,
          },
        },
        serviceLines: true,
        serviceLineTransactions: {
          include: {
            serviceLine: true,
          },
        },
        updatedBy: true,
        patient: true,
      },
    });

    if (!payment) return null;

    return {
      ...payment,
      patientName: payment.claim?.patientName ?? "",
      paymentDate: payment.createdAt,
      paymentMethod: payment.serviceLineTransactions[0]?.method ?? "OTHER",
    };
  },

  async getRecentPayments(
    limit: number,
    offset: number
  ): Promise<PaymentWithExtras[]> {
    const payments = await db.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        claim: {
          include: {
            serviceLines: true,
          },
        },
        serviceLines: true,
        serviceLineTransactions: {
          include: {
            serviceLine: true,
          },
        },
        updatedBy: true,
        patient: true,
      },
    });

    return payments.map((payment) => ({
      ...payment,
      patientName: payment.claim?.patientName ?? "",
      paymentDate: payment.createdAt,
      paymentMethod: payment.serviceLineTransactions[0]?.method ?? "OTHER",
    }));
  },

  async getPaymentsByDateRange(
    from: Date,
    to: Date
  ): Promise<PaymentWithExtras[]> {
    const payments = await db.payment.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        claim: {
          include: {
            serviceLines: true,
          },
        },
        serviceLines: true,
        serviceLineTransactions: {
          include: {
            serviceLine: true,
          },
        },
        updatedBy: true,
        patient: true,
      },
    });

    return payments.map((payment) => ({
      ...payment,
      patientName: payment.claim?.patientName ?? "",
      paymentDate: payment.createdAt,
      paymentMethod: payment.serviceLineTransactions[0]?.method ?? "OTHER",
    }));
  },

  async getTotalPaymentCount(): Promise<number> {
    return db.payment.count();
  },

  // ==============================
  // Database Backup methods
  // ==============================
  async createBackup(userId) {
    return await db.databaseBackup.create({ data: { userId } });
  },

  async getLastBackup(userId) {
    return await db.databaseBackup.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getBackups(userId, limit = 10) {
    return await db.databaseBackup.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async deleteBackups(userId) {
    const result = await db.databaseBackup.deleteMany({ where: { userId } });
    return result.count;
  },

  // ==============================
  // Notification methods
  // ==============================
  async createNotification(userId, type, message) {
    return await db.notification.create({
      data: { userId, type, message },
    });
  },

  async getNotifications(
    userId: number,
    limit = 50,
    offset = 0
  ): Promise<Notification[]> {
    return await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  },

  async markNotificationRead(userId, notificationId) {
    const result = await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    return result.count > 0;
  },

  async markAllNotificationsRead(userId) {
    const result = await db.notification.updateMany({
      where: { userId },
      data: { read: true },
    });
    return result.count;
  },

  async deleteNotificationsByType(userId, type) {
    const result = await db.notification.deleteMany({
      where: { userId, type },
    });
    return result.count;
  },

  async deleteAllNotifications(userId: number): Promise<number> {
    const result = await db.notification.deleteMany({
      where: { userId },
    });
    return result.count;
  },
};
