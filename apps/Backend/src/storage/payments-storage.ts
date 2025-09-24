import {
  InsertPayment,
  Payment,
  PaymentWithExtras,
  UpdatePayment,
} from "@repo/db/types";
import { prisma as db } from "@repo/db/client";

export interface IStorage {
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
}

export const paymentsStorage: IStorage = {
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
      where: { patientId },
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
      where: { patientId },
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
};
