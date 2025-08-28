import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ZodError } from "zod";
import {
  insertPaymentSchema,
  NewTransactionPayload,
  newTransactionPayloadSchema,
  paymentMethodOptions,
} from "@repo/db/types";
import { prisma } from "@repo/db/client";
import { PaymentStatusSchema } from "@repo/db/types";
import * as paymentService from "../services/paymentService";

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
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const [payments, totalCount] = await Promise.all([
      storage.getRecentPayments(limit, offset),
      storage.getTotalPaymentCount(),
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
      const parsedClaimId = parseIntOrError(req.params.claimId, "Claim ID");

      const payments = await storage.getPaymentsByClaimId(parsedClaimId);
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
    const validated = paymentFilterSchema.safeParse(req.query);
    if (!validated.success) {
      return res.status(400).json({
        message: "Invalid date format",
        errors: validated.error.errors,
      });
    }

    const { from, to } = validated.data;
    const payments = await storage.getPaymentsByDateRange(
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
    const id = parseIntOrError(req.params.id, "Payment ID");

    const payment = await storage.getPaymentById(id);
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

    const { serviceLineTransactions } = validated.data;

    const updatedPayment = await paymentService.updatePayment(
      paymentId,
      serviceLineTransactions,
      userId
    );

    res.status(200).json(updatedPayment);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update payment";
    res.status(500).json({ message });
  }
});

// PUT /api/payments/:id/pay-absolute-full-claim
router.put(
  "/:id/pay-absolute-full-claim",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const paymentId = parseIntOrError(req.params.id, "Payment ID");
      const paymentRecord = await storage.getPaymentById(paymentId);
      if (!paymentRecord) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const serviceLineTransactions = paymentRecord.claim.serviceLines
        .filter((line) => line.totalDue.gt(0))
        .map((line) => ({
          serviceLineId: line.id,
          paidAmount: line.totalDue.toNumber(),
          adjustedAmount: 0,
          method: paymentMethodOptions[1],
          receivedDate: new Date(),
          notes: "Full claim payment",
        }));

      if (serviceLineTransactions.length === 0) {
        return res.status(400).json({ message: "No outstanding balance" });
      }

      // Use updatePayment for consistency & validation
      const updatedPayment = await paymentService.updatePayment(
        paymentId,
        serviceLineTransactions,
        userId
      );

      res.status(200).json(updatedPayment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to pay full claim" });
    }
  }
);

// PUT /api/payments/:id/revert-full-claim
router.put(
  "/:id/revert-full-claim",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const paymentId = parseIntOrError(req.params.id, "Payment ID");
      const paymentRecord = await storage.getPaymentById(paymentId);
      if (!paymentRecord) {
        return res.status(404).json({ message: "Payment not found" });
      }
      // Build reversal transactions (negating what’s already paid/adjusted)
      const serviceLineTransactions = paymentRecord.claim.serviceLines
        .filter((line) => line.totalPaid.gt(0) || line.totalAdjusted.gt(0))
        .map((line) => ({
          serviceLineId: line.id,
          paidAmount: line.totalPaid.negated().toNumber(), // negative to undo
          adjustedAmount: line.totalAdjusted.negated().toNumber(),
          method: paymentMethodOptions[4],
          receivedDate: new Date(),
          notes: "Reverted full claim",
        }));

      if (serviceLineTransactions.length === 0) {
        return res.status(400).json({ message: "Nothing to revert" });
      }

      const updatedPayment = await paymentService.updatePayment(
        paymentId,
        serviceLineTransactions,
        userId,
        { isReversal: true }
      );

      res.status(200).json(updatedPayment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to revert claim payments" });
    }
  }
);

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

    // Check if payment exists and belongs to this user
    const existingPayment = await storage.getPayment(id);
    if (!existingPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (existingPayment.userId !== req.user!.id) {
      return res.status(403).json({
        message:
          "Forbidden: Payment belongs to a different user, you can't delete this.",
      });
    }
    await storage.deletePayment(id, userId);

    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete payment";
    res.status(500).json({ message });
  }
});

export default router;
