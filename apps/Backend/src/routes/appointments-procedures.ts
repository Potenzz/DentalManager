import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { prisma } from "@repo/db/client";
import {
  insertAppointmentProcedureSchema,
  updateAppointmentProcedureSchema,
} from "@repo/db/types";

const router = Router();

/**
 * GET /api/appointment-procedures/:appointmentId
 * Get all procedures for an appointment
 */
router.get("/:appointmentId", async (req: Request, res: Response) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "Invalid appointmentId" });
    }

    const rows = await storage.getByAppointmentId(appointmentId);

    return res.json(rows);
  } catch (err: any) {
    console.error("GET appointment procedures error", err);
    return res.status(500).json({ message: err.message ?? "Server error" });
  }
});

/**
 * POST /api/appointment-procedures
 * Add single manual procedure
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = insertAppointmentProcedureSchema.parse(req.body);

    const created = await storage.createProcedure(parsed);

    return res.json(created);
  } catch (err: any) {
    console.error("POST appointment procedure error", err);
    if (err.name === "ZodError") {
      return res.status(400).json({ message: err.errors });
    }
    return res.status(500).json({ message: err.message ?? "Server error" });
  }
});

/**
 * POST /api/appointment-procedures/bulk
 * Add multiple procedures (combos)
 */
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const rows = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const count = await storage.createProceduresBulk(rows);

    return res.json({ success: true, count });
  } catch (err: any) {
    console.error("POST bulk appointment procedures error", err);
    return res.status(500).json({ message: err.message ?? "Server error" });
  }
});

/**
 * PUT /api/appointment-procedures/:id
 * Update a procedure
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const parsed = updateAppointmentProcedureSchema.parse(req.body);

    const updated = await storage.updateProcedure(id, parsed);

    return res.json(updated);
  } catch (err: any) {
    console.error("PUT appointment procedure error", err);

    if (err.name === "ZodError") {
      return res.status(400).json({ message: err.errors });
    }

    return res.status(500).json({ message: err.message ?? "Server error" });
  }
});

/**
 * DELETE /api/appointment-procedures/:id
 * Delete single procedure
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    await storage.deleteProcedure(id);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE appointment procedure error", err);
    return res.status(500).json({ message: err.message ?? "Server error" });
  }
});

/**
 * DELETE /api/appointment-procedures/clear/:appointmentId
 * Clear all procedures for appointment
 */
router.delete("/clear/:appointmentId", async (req: Request, res: Response) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ message: "Invalid appointmentId" });
    }

    await storage.clearByAppointmentId(appointmentId);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("CLEAR appointment procedures error", err);
    return res.status(500).json({ message: err.message ?? "Server error" });
  }
});

export default router;
