import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ZodError } from "zod";
import { insertPaymentSchema, updatePaymentSchema } from "@repo/db/types";

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
        userId,
        parsedClaimId
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
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const parsedPatientId = parseIntOrError(
        req.params.patientId,
        "Patient ID"
      );

      const payments = await storage.getPaymentsByPatientId(
        userId,
        parsedPatientId
      );

      if (!payments)
        return res.status(404).json({ message: "No payments found for claim" });

      res.status(200).json(payments);
    } catch (err) {
      console.error("Failed to fetch patient payments:", err);
      res.status(500).json({ message: "Failed to fetch patient payments" });
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

    const payment = await storage.getPaymentById(userId, id);
    if (!payment)
      return res.status(404).json({ message: "Payment not found" });

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

    const id = parseIntOrError(req.params.id, "Payment ID");

    const validated = updatePaymentSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validated.error.flatten(),
      });
    }

    const updated = await storage.updatePayment(id, validated.data, userId);

    res.status(200).json(updated);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update payment";
    res.status(500).json({ message });
  }
});

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
