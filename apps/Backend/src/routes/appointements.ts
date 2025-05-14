import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import {
  AppointmentUncheckedCreateInputObjectSchema,
  PatientUncheckedCreateInputObjectSchema,
} from "@repo/db/shared/schemas";
import { z } from "zod";

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




// Get all appointments
router.get("/all", async (req: Request, res: Response): Promise<any> => {
  try {
    const appointments = await storage.getAllAppointments();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve all appointments" });
  }
});

// Get a single appointment by ID
router.get(
  "/:id",

  async (req: Request, res: Response): Promise<any> => {
    try {
      const appointmentIdParam = req.params.id;

      // Ensure that patientIdParam exists and is a valid number
      if (!appointmentIdParam) {
        return res.status(400).json({ message: "Appointment ID is required" });
      }

      const appointmentId = parseInt(appointmentIdParam);

      const appointment = await storage.getAppointment(appointmentId);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Ensure the appointment belongs to the logged-in user
      if (appointment.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve appointment" });
    }
  }
);


// Create a new appointment
router.post(
  "/",

  async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("Appointment creation request body:", req.body);

      // Validate request body
      const appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      console.log("Validated appointment data:", appointmentData);

      // Verify patient exists and belongs to user
      const patient = await storage.getPatient(appointmentData.patientId);
      if (!patient) {
        console.log("Patient not found:", appointmentData.patientId);
        return res.status(404).json({ message: "Patient not found" });
      }

      if (patient.userId !== req.user!.id) {
        console.log(
          "Patient belongs to another user. Patient userId:",
          patient.userId,
          "Request userId:",
          req.user!.id
        );
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check if there's already an appointment at this time slot
      const existingAppointments = await storage.getAppointmentsByUserId(
        req.user!.id
      );
      const conflictingAppointment = existingAppointments.find(
        (apt) =>
          apt.date === appointmentData.date &&
          apt.startTime === appointmentData.startTime &&
          apt.notes?.includes(
            appointmentData.notes.split("Appointment with ")[1]
          )
      );

      if (conflictingAppointment) {
        console.log(
          "Time slot already booked:",
          appointmentData.date,
          appointmentData.startTime
        );
        return res.status(409).json({
          message:
            "This time slot is already booked. Please select another time or staff member.",
        });
      }

      // Create appointment
      const appointment = await storage.createAppointment(appointmentData);
      console.log("Appointment created successfully:", appointment);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);

      if (error instanceof z.ZodError) {
        console.log(
          "Validation error details:",
          JSON.stringify(error.format(), null, 2)
        );
        return res.status(400).json({
          message: "Validation error",
          errors: error.format(),
        });
      }

      res.status(500).json({
        message: "Failed to create appointment",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Update an existing appointment
router.put(
  "/:id",

  async (req: Request, res: Response): Promise<any> => {
    try {
      const appointmentIdParam = req.params.id;
      if (!appointmentIdParam) {
        return res.status(400).json({ message: "Appointment ID is required" });
      }
      const appointmentId = parseInt(appointmentIdParam);

      console.log(
        "Update appointment request. ID:",
        appointmentId,
        "Body:",
        req.body
      );

      // Check if appointment exists and belongs to user
      const existingAppointment = await storage.getAppointment(appointmentId);
      if (!existingAppointment) {
        console.log("Appointment not found:", appointmentId);
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (existingAppointment.userId !== req.user!.id) {
        console.log(
          "Appointment belongs to another user. Appointment userId:",
          existingAppointment.userId,
          "Request userId:",
          req.user!.id
        );
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate request body
      const appointmentData = updateAppointmentSchema.parse(req.body);
      console.log("Validated appointment update data:", appointmentData);

      // If patient ID is being updated, verify the new patient belongs to user
      if (
        appointmentData.patientId &&
        appointmentData.patientId !== existingAppointment.patientId
      ) {
        const patient = await storage.getPatient(appointmentData.patientId);
        if (!patient) {
          console.log("New patient not found:", appointmentData.patientId);
          return res.status(404).json({ message: "Patient not found" });
        }

        if (patient.userId !== req.user!.id) {
          console.log(
            "New patient belongs to another user. Patient userId:",
            patient.userId,
            "Request userId:",
            req.user!.id
          );
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      // Check if there's already an appointment at this time slot (if time is being changed)
      if (
        appointmentData.date &&
        appointmentData.startTime &&
        (appointmentData.date !== existingAppointment.date ||
          appointmentData.startTime !== existingAppointment.startTime)
      ) {
        // Extract staff name from notes
        const staffInfo =
          appointmentData.notes?.split("Appointment with ")[1] ||
          existingAppointment.notes?.split("Appointment with ")[1];

        const existingAppointments = await storage.getAppointmentsByUserId(
          req.user!.id
        );
        const conflictingAppointment = existingAppointments.find(
          (apt) =>
            apt.id !== appointmentId && // Don't match with itself
            apt.date === (appointmentData.date || existingAppointment.date) &&
            apt.startTime ===
              (appointmentData.startTime || existingAppointment.startTime) &&
            apt.notes?.includes(staffInfo)
        );

        if (conflictingAppointment) {
          console.log(
            "Time slot already booked:",
            appointmentData.date,
            appointmentData.startTime
          );
          return res.status(409).json({
            message:
              "This time slot is already booked. Please select another time or staff member.",
          });
        }
      }

      // Update appointment
      const updatedAppointment = await storage.updateAppointment(
        appointmentId,
        appointmentData
      );
      console.log("Appointment updated successfully:", updatedAppointment);
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);

      if (error instanceof z.ZodError) {
        console.log(
          "Validation error details:",
          JSON.stringify(error.format(), null, 2)
        );
        return res.status(400).json({
          message: "Validation error",
          errors: error.format(),
        });
      }

      res.status(500).json({
        message: "Failed to update appointment",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Delete an appointment
router.delete(
  "/:id",

  async (req: Request, res: Response): Promise<any> => {
    try {
      const appointmentIdParam = req.params.id;
      if (!appointmentIdParam) {
        return res.status(400).json({ message: "Appointment ID is required" });
      }
      const appointmentId = parseInt(appointmentIdParam);

      // Check if appointment exists and belongs to user
      const existingAppointment = await storage.getAppointment(appointmentId);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (existingAppointment.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Delete appointment
      await storage.deleteAppointment(appointmentId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  }
);

export default router;