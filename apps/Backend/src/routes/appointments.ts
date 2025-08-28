import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  insertAppointmentSchema,
  updateAppointmentSchema,
} from "@repo/db/types";

const router = Router();

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

      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve appointment" });
    }
  }
);

// Get all appointments for a specific patient
router.get(
  "/:patientId/appointments",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const rawPatientId = req.params.patientId;
      if (!rawPatientId) {
        return res.status(400).json({ message: "Patient ID is required" });
      }

      const patientId = parseInt(rawPatientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }

      const patient = await storage.getPatient(patientId);
      if (!patient)
        return res.status(404).json({ message: "Patient not found" });

      const appointments = await storage.getAppointmentsByPatientId(patientId);
      res.json(appointments);
    } catch (err) {
      res.status(500).json({ message: "Failed to get patient appointments" });
    }
  }
);

// Get appointments on a specific date
router.get(
  "/appointments/on/:date",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const rawDate = req.params.date;
      if (!rawDate) {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const date = new Date(rawDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const all = await storage.getAppointmentsOn(date);
      const appointments = all.filter((a) => a.userId === req.user!.id);

      res.json(appointments);
    } catch (err) {
      res.status(500).json({ message: "Failed to get appointments on date" });
    }
  }
);

// Get recent appointments (paginated)
router.get("/appointments/recent", async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const all = await storage.getRecentAppointments(limit, offset);
    res.json({ data: all, limit, offset });
  } catch (err) {
    res.status(500).json({ message: "Failed to get recent appointments" });
  }
});

// Create a new appointment
router.post(
  "/upsert",

  async (req: Request, res: Response): Promise<any> => {
    try {
      // Validate request body
      const appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const originalStartTime = appointmentData.startTime;
      const MAX_END_TIME = "18:30";

      // 1. Verify patient exists and belongs to user
      const patient = await storage.getPatient(appointmentData.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // 2. Attempt to find the next available slot
      let [hour, minute] = originalStartTime.split(":").map(Number);

      const pad = (n: number) => n.toString().padStart(2, "0");

      while (`${pad(hour)}:${pad(minute)}` <= MAX_END_TIME) {
        const currentStartTime = `${pad(hour)}:${pad(minute)}`;

        // Check patient appointment at this time
        const sameDayAppointment =
          await storage.getPatientAppointmentByDateTime(
            appointmentData.patientId,
            appointmentData.date,
            currentStartTime
          );

        // Check staff conflict at this time
        const staffConflict = await storage.getStaffAppointmentByDateTime(
          appointmentData.staffId,
          appointmentData.date,
          currentStartTime,
          sameDayAppointment?.id // Ignore self if updating
        );

        if (!staffConflict) {
          const endMinute = minute + 30;
          let endHour = hour + Math.floor(endMinute / 60);
          let realEndMinute = endMinute % 60;

          const currentEndTime = `${pad(endHour)}:${pad(realEndMinute)}`;

          const payload = {
            ...appointmentData,
            startTime: currentStartTime,
            endTime: currentEndTime,
          };

          let responseData;

          if (sameDayAppointment?.id !== undefined) {
            const updated = await storage.updateAppointment(
              sameDayAppointment.id,
              payload
            );
            responseData = {
              ...updated,
              originalRequestedTime: originalStartTime,
              finalScheduledTime: currentStartTime,
              message:
                originalStartTime !== currentStartTime
                  ? `Your requested time (${originalStartTime}) was unavailable. Appointment was updated to ${currentStartTime}.`
                  : `Appointment successfully updated at ${currentStartTime}.`,
            };
            return res.status(200).json(responseData);
          }

          const created = await storage.createAppointment(payload);
          responseData = {
            ...created,
            originalRequestedTime: originalStartTime,
            finalScheduledTime: currentStartTime,
            message:
              originalStartTime !== currentStartTime
                ? `Your requested time (${originalStartTime}) was unavailable. Appointment was scheduled at ${currentStartTime}.`
                : `Appointment successfully scheduled at ${currentStartTime}.`,
          };
          return res.status(201).json(responseData);
        }

        // Move to next 30-min slot
        minute += 30;
        if (minute >= 60) {
          hour += 1;
          minute = 0;
        }
      }

      return res.status(409).json({
        message:
          "No available slots remaining until 6:30 PM for this Staff. Please choose another day.",
      });
    } catch (error) {
      console.error("Error in upsert appointment:", error);

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
        message: "Failed to upsert appointment",
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
      const appointmentData = updateAppointmentSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const appointmentIdParam = req.params.id;
      if (!appointmentIdParam) {
        return res.status(400).json({ message: "Appointment ID is required" });
      }
      const appointmentId = parseInt(appointmentIdParam);

      // 1. Verify patient exists and belongs to user
      const patient = await storage.getPatient(appointmentData.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // 2. Check if appointment exists and belongs to user
      const existingAppointment = await storage.getAppointment(appointmentId);
      if (!existingAppointment) {
        console.log("Appointment not found:", appointmentId);
        return res.status(404).json({ message: "Appointment not found" });
      }

      // 4. Reject patientId change (not allowed)
      if (
        appointmentData.patientId &&
        appointmentData.patientId !== existingAppointment.patientId
      ) {
        return res
          .status(400)
          .json({ message: "Changing patientId is not allowed" });
      }

      // 5. Check for conflicting appointments (same patient OR staff at same time)

      const date = appointmentData.date ?? existingAppointment.date;
      const startTime =
        appointmentData.startTime ?? existingAppointment.startTime;
      const staffId = appointmentData.staffId ?? existingAppointment.staffId;

      const patientConflict = await storage.getPatientConflictAppointment(
        existingAppointment.patientId,
        date,
        startTime,
        appointmentId
      );

      if (patientConflict) {
        return res.status(409).json({
          message: "This patient already has an appointment at this time.",
        });
      }

      const staffConflict = await storage.getStaffConflictAppointment(
        staffId,
        date,
        startTime,
        appointmentId
      );

      if (staffConflict) {
        return res.status(409).json({
          message: "This time slot is already booked for the selected staff.",
        });
      }

      // Update appointment
      const updatedAppointment = await storage.updateAppointment(
        appointmentId,
        appointmentData
      );
      return res.json(updatedAppointment);
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
