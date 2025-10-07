import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertPatientSchema, updatePatientSchema } from "@repo/db/types";
import { normalizeInsuranceId } from "../utils/helpers";

const router = Router();

// Patient Routes
// Get all patients for the logged-in user
router.get("/", async (req, res) => {
  try {
    const patients = await storage.getPatientsByUserId(req.user!.id);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve patients" });
  }
});

// Get recent patients (paginated)
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const [patients, totalCount] = await Promise.all([
      storage.getRecentPatients(limit, offset),
      storage.getTotalPatientCount(),
    ]);

    res.json({ patients, totalCount });
  } catch (error) {
    console.error("Failed to retrieve recent patients:", error);
    res.status(500).json({ message: "Failed to retrieve recent patients" });
  }
});

router.get("/search", async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      name,
      phone,
      insuranceId,
      gender,
      dob,
      term,
      limit = "10",
      offset = "0",
    } = req.query as Record<string, string>;

    const filters: any = {};

    if (term) {
      filters.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { insuranceId: { contains: term, mode: "insensitive" } },
      ];
    }

    if (name) {
      filters.OR = [
        { firstName: { contains: name, mode: "insensitive" } },
        { lastName: { contains: name, mode: "insensitive" } },
      ];
    }

    if (phone) {
      filters.phone = { contains: phone, mode: "insensitive" };
    }

    if (insuranceId) {
      filters.insuranceId = { contains: insuranceId, mode: "insensitive" };
    }

    if (gender) {
      filters.gender = gender;
    }

    if (dob) {
      const parsed = new Date(dob);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          message: "Invalid date format for DOB. Use format: YYYY-MM-DD",
        });
      }
      // Match exact dateOfBirth (optional: adjust for timezone)
      filters.dateOfBirth = parsed;
    }

    const [patients, totalCount] = await Promise.all([
      storage.searchPatients({
        filters,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }),
      storage.countPatients(filters),
    ]);

    return res.json({ patients, totalCount });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ message: "Failed to search patients" });
  }
});

// get patient by insurance id
router.get(
  "/by-insurance-id",
  async (req: Request, res: Response): Promise<any> => {
    const insuranceId = req.query.insuranceId?.toString();

    if (!insuranceId) {
      return res.status(400).json({ error: "Missing insuranceId" });
    }

    try {
      const patient = await storage.getPatientByInsuranceId(insuranceId);

      if (patient) {
        return res.status(200).json(patient);
      } else {
        return res.status(200).json(null);
      }
    } catch (err) {
      console.error("Failed to lookup patient:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/patients/:id/financials?limit=50&offset=0
router.get(
  "/:id/financials",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const patientIdParam = req.params.id;
      if (!patientIdParam)
        return res.status(400).json({ message: "Patient ID required" });

      const patientId = parseInt(patientIdParam, 10);
      if (isNaN(patientId))
        return res.status(400).json({ message: "Invalid patient ID" });

      const limit = Math.min(1000, Number(req.query.limit ?? 50)); // cap maximums
      const offset = Math.max(0, Number(req.query.offset ?? 0));

      const { rows, totalCount } = await storage.getPatientFinancialRows(
        patientId,
        limit,
        offset
      );

      return res.json({ rows, totalCount, limit, offset });
    } catch (err) {
      console.error("Failed to fetch financial rows:", err);
      return res
        .status(500)
        .json({ message: "Failed to fetch financial rows" });
    }
  }
);

// Get a single patient by ID
router.get(
  "/:id",

  async (req: Request, res: Response): Promise<any> => {
    try {
      const patientIdParam = req.params.id;

      // Ensure that patientIdParam exists and is a valid number
      if (!patientIdParam) {
        return res.status(400).json({ message: "Patient ID is required" });
      }

      const patientId = parseInt(patientIdParam);

      const patient = await storage.getPatient(patientId);

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve patient" });
    }
  }
);

// Create a new patient
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const body: any = { ...req.body, userId: req.user!.id };

    // Normalize insuranceId early and return clear error if invalid
    try {
      const normalized = normalizeInsuranceId(body.insuranceId);
      body.insuranceId = normalized;
    } catch (err: any) {
      return res.status(400).json({
        message: "Invalid insuranceId",
        details: err?.message ?? "Invalid insuranceId format",
      });
    }
    // Validate request body
    const patientData = insertPatientSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    // Check for duplicate insuranceId if it's provided
    if (patientData.insuranceId) {
      const existingPatient = await storage.getPatientByInsuranceId(
        patientData.insuranceId as string
      );

      if (existingPatient) {
        return res.status(409).json({
          message: "A patient with this insurance ID already exists.",
        });
      }
    }

    const patient = await storage.createPatient(patientData);

    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.format(),
      });
    }
    res.status(500).json({ message: "Failed to create patient" });
  }
});

// Update an existing patient
router.put(
  "/:id",

  async (req: Request, res: Response): Promise<any> => {
    try {
      const patientIdParam = req.params.id;

      // Normalize incoming insuranceId (if present)
      try {
        if (req.body.insuranceId !== undefined) {
          req.body.insuranceId = normalizeInsuranceId(req.body.insuranceId);
        }
      } catch (err: any) {
        return res.status(400).json({
          message: "Invalid insuranceId",
          details: err?.message ?? "Invalid insuranceId format",
        });
      }

      // Ensure that patientIdParam exists and is a valid number
      if (!patientIdParam) {
        return res.status(400).json({ message: "Patient ID is required" });
      }

      const patientId = parseInt(patientIdParam);

      // Check if patient exists and belongs to user
      const existingPatient = await storage.getPatient(patientId);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Validate request body
      const patientData = updatePatientSchema.parse(req.body);

      // If updating insuranceId, check for uniqueness (excluding self)
      if (
        patientData.insuranceId &&
        patientData.insuranceId !== existingPatient.insuranceId
      ) {
        const duplicatePatient = await storage.getPatientByInsuranceId(
          patientData.insuranceId as string
        );
        if (duplicatePatient && duplicatePatient.id !== patientId) {
          return res.status(409).json({
            message: "Another patient with this insurance ID already exists.",
          });
        }
      }

      // Update patient
      const updatedPatient = await storage.updatePatient(
        patientId,
        patientData
      );
      res.json(updatedPatient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.format(),
        });
      }
      res.status(500).json({ message: "Failed to update patient" });
    }
  }
);

// Delete a patient
router.delete(
  "/:id",

  async (req: Request, res: Response): Promise<any> => {
    try {
      const patientIdParam = req.params.id;

      // Ensure that patientIdParam exists and is a valid number
      if (!patientIdParam) {
        return res.status(400).json({ message: "Patient ID is required" });
      }

      const patientId = parseInt(patientIdParam);

      // Check if patient exists and belongs to user
      const existingPatient = await storage.getPatient(patientId);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (existingPatient.userId !== req.user!.id) {
        return res.status(403).json({
          message:
            "Forbidden: Patient belongs to a different user, you can't delete this.",
        });
      }

      // Delete patient
      await storage.deletePatient(patientId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete patient error:", error);
      res.status(500).json({ message: "Failed to delete patient" });
    }
  }
);
// Get appointments for a specific patient
router.get(
  "/:patientId/appointments",

  async (req: Request, res: Response): Promise<any> => {
    try {
      const patientIdParam = req.params.id;

      // Ensure that patientIdParam exists and is a valid number
      if (!patientIdParam) {
        return res.status(400).json({ message: "Patient ID is required" });
      }

      const patientId = parseInt(patientIdParam);

      // Check if patient exists and belongs to user
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const appointments = await storage.getAppointmentsByPatientId(patientId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve appointments" });
    }
  }
);

export default router;
