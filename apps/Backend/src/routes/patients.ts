import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import {
  AppointmentUncheckedCreateInputObjectSchema,
  PatientUncheckedCreateInputObjectSchema,
} from "@repo/db/usedSchemas";
import { z } from "zod";
import { extractDobParts } from "../utils/DobParts";

const router = Router();

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

const PatientSchema = (
  PatientUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  appointments: true,
});
type Patient = z.infer<typeof PatientSchema>;

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

    const filters: any = {
      userId: req.user!.id,
    };

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

      // Ensure the patient belongs to the logged-in user
      if (patient.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
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
    // Validate request body
    const patientData = insertPatientSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    // Check for duplicate insuranceId if it's provided
    if (patientData.insuranceId) {
      const existingPatient = await storage.getPatientByInsuranceId(
        patientData.insuranceId
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
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate request body
      const patientData = updatePatientSchema.parse(req.body);

      // If updating insuranceId, check for uniqueness (excluding self)
      if (
        patientData.insuranceId &&
        patientData.insuranceId !== existingPatient.insuranceId
      ) {
        const duplicatePatient = await storage.getPatientByInsuranceId(
          patientData.insuranceId
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
        console.warn(
          `User ${req.user!.id} tried to delete patient ${patientId} owned by ${existingPatient.userId}`
        );
        return res
          .status(403)
          .json({ message: "Forbidden: Patient belongs to a different user" });
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

// Appointment Routes
// Get all appointments for the logged-in user
router.get("/appointments", async (req, res) => {
  try {
    const appointments = await storage.getAppointmentsByUserId(req.user!.id);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve appointments" });
  }
});

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

      if (patient.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const appointments = await storage.getAppointmentsByPatientId(patientId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve appointments" });
    }
  }
);

export default router;
