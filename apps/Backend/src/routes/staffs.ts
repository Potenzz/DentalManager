import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { StaffUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";

type Staff = z.infer<typeof StaffUncheckedCreateInputObjectSchema>;

const staffCreateSchema = StaffUncheckedCreateInputObjectSchema;
const staffUpdateSchema = (
  StaffUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).partial();

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const validatedData = staffCreateSchema.parse(req.body);
    const newStaff = await storage.createStaff(validatedData);
    res.status(200).json(newStaff);
  } catch (error) {
    console.error("Failed to create staff:", error);
    res.status(500).send("Failed to create staff");
  }
});

router.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const staff = await storage.getAllStaff();
    if (!staff) return res.status(404).send("Staff not found");

    res.status(201).json(staff);
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    res.status(500).send("Failed to fetch staff");
  }
});

router.put("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const parsedStaffId = Number(req.params.id);
    if (isNaN(parsedStaffId)) {
      return res.status(400).send("Invalid staff ID");
    }

    const validatedData = staffUpdateSchema.parse(req.body);
    const updatedStaff = await storage.updateStaff(
      parsedStaffId,
      validatedData
    );
    if (!updatedStaff) return res.status(404).send("Staff not found");

    res.json(updatedStaff);
  } catch (error) {
    console.error("Failed to update staff:", error);
    res.status(500).send("Failed to update staff");
  }
});

const parseIdOr400 = (raw: any, label: string) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${label} is invalid`);
  return n;
};

router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const id = parseIdOr400(req.params.id, "Staff ID");
    const parsedStaffId = Number(req.params.id);
    if (isNaN(parsedStaffId)) {
      return res.status(400).send("Invalid staff ID");
    }

    const existing = await storage.getStaff(id); // must include createdById
    if (!existing) return res.status(404).json({ message: "Staff not found" });

    if (existing.userId !== userId) {
      return res.status(403).json({
        message:
          "Forbidden: Staff was created by a different user; you cannot delete it.",
      });
    }

    const [apptCount, claimCount] = await Promise.all([
      storage.countAppointmentsByStaffId(id),
      storage.countClaimsByStaffId(id),
    ]);

    if (apptCount || claimCount) {
      return res.status(409).json({
        message: `Cannot delete staff with linked records. Appointment of this staff : ${apptCount} and Claims ${claimCount}`,
        hint: "Archive this staff, or reassign linked records, then delete.",
      });
    }

    const deleted = await storage.deleteStaff(parsedStaffId);
    if (!deleted) return res.status(404).send("Staff not found");

    res.status(200).send("Staff deleted successfully");
  } catch (error) {
    console.error("Failed to delete staff:", error);
    res.status(500).send("Failed to delete staff");
  }
});

export default router;
