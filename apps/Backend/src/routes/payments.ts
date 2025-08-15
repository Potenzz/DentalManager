import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ZodError } from "zod";
import {
  insertPaymentSchema,
  NewTransactionPayload,
  newTransactionPayloadSchema,
  updatePaymentSchema,
} from "@repo/db/types";
import Decimal from "decimal.js";
import { prisma } from "@repo/db/client";
import { PaymentStatusSchema } from "@repo/db/types";

const paymentFilterSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

function parseIntOrError(input: string | undefined, name: string) {
  if (!input) throw new Error(`${name} is required`);
  const value = parseInt(input, 10);
  if (isNaN(value)) throw new Error(`${name} must be a valid number`);
  return value;
}

export function handleRouteError(
  res: Response,
  error: unknown,
  defaultMsg: string
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: error.format(),
    });
  }

  const msg = error instanceof Error ? error.message : defaultMsg;
  return res.status(500).json({ message: msg });
}

const router = Router();

// GET /api/payments/recent
router.get("/recent", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const [payments, totalCount] = await Promise.all([
      storage.getRecentPaymentsByUser(userId, limit, offset),
      storage.getTotalPaymentCountByUser(userId),
    ]);

    res.status(200).json({ payments, totalCount });
  } catch (err) {
    console.error("Failed to fetch payments:", err);
    res.status(500).json({ message: "Failed to fetch recent payments" });
  }
});

// GET /api/payments/claim/:claimId
router.get(
  "/claim/:claimId",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const parsedClaimId = parseIntOrError(req.params.claimId, "Claim ID");

      const payments = await storage.getPaymentsByClaimId(
        parsedClaimId,
        userId
      );
      if (!payments)
        return res.status(404).json({ message: "No payments found for claim" });

      res.status(200).json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to retrieve payments" });
    }
  }
);

// GET /api/payments/patient/:patientId
router.get(
  "/patient/:patientId",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const patientIdParam = req.params.patientId;
      if (!patientIdParam) {
        return res.status(400).json({ message: "Missing patientId" });
      }
      const patientId = parseInt(patientIdParam);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patientId" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }

      const [payments, totalCount] = await Promise.all([
        storage.getRecentPaymentsByPatientId(patientId, limit, offset),
        storage.getTotalPaymentCountByPatient(patientId),
      ]);

      res.json({ payments, totalCount });
    } catch (error) {
      console.error("Failed to retrieve payments for patient:", error);
      res.status(500).json({ message: "Failed to retrieve patient payments" });
    }
  }
);

// GET /api/payments/filter
router.get("/filter", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const validated = paymentFilterSchema.safeParse(req.query);
    if (!validated.success) {
      return res.status(400).json({
        message: "Invalid date format",
        errors: validated.error.errors,
      });
    }

    const { from, to } = validated.data;
    const payments = await storage.getPaymentsByDateRange(
      userId,
      new Date(from),
      new Date(to)
    );
    res.status(200).json(payments);
  } catch (err) {
    console.error("Failed to filter payments:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/payments/:id
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseIntOrError(req.params.id, "Payment ID");

    const payment = await storage.getPaymentById(id, userId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.status(200).json(payment);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve payment";
    res.status(500).json({ message });
  }
});

// POST /api/payments/:claimId
router.post("/:claimId", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const claimId = parseIntOrError(req.params.claimId, "Claim ID");

    const validated = insertPaymentSchema.safeParse({
      ...req.body,
      claimId,
      userId,
    });

    if (!validated.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validated.error.flatten(),
      });
    }

    const payment = await storage.createPayment(validated.data);
    res.status(201).json(payment);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create payment";
    res.status(500).json({ message });
  }
});

// PUT /api/payments/:id
router.put("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const paymentId = parseIntOrError(req.params.id, "Payment ID");

    const validated = newTransactionPayloadSchema.safeParse(
      req.body.data as NewTransactionPayload
    );
    if (!validated.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validated.error.flatten(),
      });
    }

    const { status, serviceLineTransactions } = validated.data;

    // Wrap everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create all new service line transactions
      for (const txn of serviceLineTransactions) {
        await tx.serviceLineTransaction.create({
          data: {
            paymentId,
            serviceLineId: txn.serviceLineId,
            transactionId: txn.transactionId,
            paidAmount: new Decimal(txn.paidAmount || 0),
            adjustedAmount: new Decimal(txn.adjustedAmount || 0),
            method: txn.method,
            receivedDate: txn.receivedDate,
            payerName: txn.payerName,
            notes: txn.notes,
          },
        });

        // 2. Recalculate that specific service line's totals
        const aggLine = await tx.serviceLineTransaction.aggregate({
          _sum: {
            paidAmount: true,
            adjustedAmount: true,
          },
          where: { serviceLineId: txn.serviceLineId },
        });

        const serviceLine = await tx.serviceLine.findUniqueOrThrow({
          where: { id: txn.serviceLineId },
          select: { totalBilled: true },
        });

        const totalPaid = aggLine._sum.paidAmount || new Decimal(0);
        const totalAdjusted = aggLine._sum.adjustedAmount || new Decimal(0);
        const totalDue = serviceLine.totalBilled
          .minus(totalPaid)
          .minus(totalAdjusted);

        await tx.serviceLine.update({
          where: { id: txn.serviceLineId },
          data: {
            totalPaid,
            totalAdjusted,
            totalDue,
            status:
              totalDue.lte(0) && totalPaid.gt(0)
                ? "PAID"
                : totalPaid.gt(0)
                  ? "PARTIALLY_PAID"
                  : "UNPAID",
          },
        });
      }

      // 3. Recalculate payment totals
      const aggPayment = await tx.serviceLineTransaction.aggregate({
        _sum: {
          paidAmount: true,
          adjustedAmount: true,
        },
        where: { paymentId },
      });

      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: { totalBilled: true },
      });

      const totalPaid = aggPayment._sum.paidAmount || new Decimal(0);
      const totalAdjusted = aggPayment._sum.adjustedAmount || new Decimal(0);
      const totalDue = payment.totalBilled
        .minus(totalPaid)
        .minus(totalAdjusted);

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          totalPaid,
          totalAdjusted,
          totalDue,
          status,
          updatedById: userId,
        },
      });

      return updatedPayment;
    });

    res.status(200).json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update payment";
    res.status(500).json({ message });
  }
});

// PATCH /api/payments/:id/status
router.patch(
  "/:id/status",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const paymentId = parseIntOrError(req.params.id, "Payment ID");

      const status = PaymentStatusSchema.parse(req.body.data.status);

      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: { status, updatedById: userId },
      });

      res.json(updatedPayment);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update payment status";
      res.status(500).json({ message });
    }
  }
);

// DELETE /api/payments/:id
router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseIntOrError(req.params.id, "Payment ID");
    await storage.deletePayment(id, userId);

    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete payment";
    res.status(500).json({ message });
  }
});

export default router;
