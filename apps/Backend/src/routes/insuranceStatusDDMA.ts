import { Router, Request, Response } from "express";
import { storage } from "../storage";
import {
  forwardToSeleniumDdmaEligibilityAgent,
  forwardOtpToSeleniumDdmaAgent,
  getSeleniumDdmaSessionStatus,
} from "../services/seleniumDdmaInsuranceEligibilityClient";
import fs from "fs/promises";
import path from "path";
import { emptyFolderContainingFile } from "../utils/emptyTempFolder";
import forwardToPatientDataExtractorService from "../services/patientDataExtractorService";
import {
  InsertPatient,
  insertPatientSchema,
} from "../../../../packages/db/types/patient-types";
import { io } from "../socket";


const router = Router();

/** Job context stored in memory by sessionId */
interface DdmaJobContext {
  userId: number;
  insuranceEligibilityData: any; // parsed, enriched (includes username/password)
}

const ddmaJobs: Record<string, DdmaJobContext> = {};

/** Utility: naive name splitter */
function splitName(fullName?: string | null) {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ") ?? "";
  return { firstName, lastName };
}

/**
 * Ensure patient exists for given insuranceId.
 */
async function createOrUpdatePatientByInsuranceId(options: {
  insuranceId: string;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | Date | null;
  userId: number;
}) {
  const { insuranceId, firstName, lastName, dob, userId } = options;
  if (!insuranceId) throw new Error("Missing insuranceId");

  const incomingFirst = (firstName || "").trim();
  const incomingLast = (lastName || "").trim();

  let patient = await storage.getPatientByInsuranceId(insuranceId);

  if (patient && patient.id) {
    const updates: any = {};
    if (
      incomingFirst &&
      String(patient.firstName ?? "").trim() !== incomingFirst
    ) {
      updates.firstName = incomingFirst;
    }
    if (
      incomingLast &&
      String(patient.lastName ?? "").trim() !== incomingLast
    ) {
      updates.lastName = incomingLast;
    }
    if (Object.keys(updates).length > 0) {
      await storage.updatePatient(patient.id, updates);
    }
    return;
  } else {
    const createPayload: any = {
      firstName: incomingFirst,
      lastName: incomingLast,
      dateOfBirth: dob,
      gender: "",
      phone: "",
      userId,
      insuranceId,
    };
    let patientData: InsertPatient;
    try {
      patientData = insertPatientSchema.parse(createPayload);
    } catch (err) {
      console.warn(
        "Failed to validate patient payload in ddma insurance flow:",
        err
      );
      const safePayload = { ...createPayload };
      delete (safePayload as any).dateOfBirth;
      patientData = insertPatientSchema.parse(safePayload);
    }
    await storage.createPatient(patientData);
  }
}

/**
 * When Selenium finishes for a given sessionId, run your patient + PDF pipeline,
 * and return the final API response shape.
 */
async function handleDdmaCompletedJob(
  sessionId: string,
  job: DdmaJobContext,
  seleniumResult: any
) {
  let createdPdfFileId: number | null = null;
  const outputResult: any = {};
  const extracted: any = {};

  const insuranceEligibilityData = job.insuranceEligibilityData;

  // 1) Extract name from PDF if available
  if (
    seleniumResult?.pdf_path &&
    typeof seleniumResult.pdf_path === "string" &&
    seleniumResult.pdf_path.endsWith(".pdf")
  ) {
    try {
      const pdfPath = seleniumResult.pdf_path;
      const pdfBuffer = await fs.readFile(pdfPath);

      const extraction = await forwardToPatientDataExtractorService({
        buffer: pdfBuffer,
        originalname: path.basename(pdfPath),
        mimetype: "application/pdf",
      } as any);

      if (extraction.name) {
        const parts = splitName(extraction.name);
        extracted.firstName = parts.firstName;
        extracted.lastName = parts.lastName;
      }
    } catch (err: any) {
      outputResult.extractionError =
        err?.message ?? "Patient data extraction failed";
    }
  }

  // 2) Create or update patient
  const insuranceId = String(insuranceEligibilityData.memberId ?? "").trim();
  if (!insuranceId) {
    throw new Error("Missing memberId for ddma job");
  }

  const preferFirst = extracted.firstName;
  const preferLast = extracted.lastName;

  await createOrUpdatePatientByInsuranceId({
    insuranceId,
    firstName: preferFirst,
    lastName: preferLast,
    dob: insuranceEligibilityData.dateOfBirth,
    userId: job.userId,
  });

  // 3) Update patient status + PDF upload
  const patient = await storage.getPatientByInsuranceId(
    insuranceEligibilityData.memberId
  );

  if (patient && patient.id !== undefined) {
    const newStatus =
      seleniumResult.eligibility === "Y" ? "ACTIVE" : "INACTIVE";
    await storage.updatePatient(patient.id, { status: newStatus });
    outputResult.patientUpdateStatus = `Patient status updated to ${newStatus}`;

    if (
      seleniumResult.pdf_path &&
      typeof seleniumResult.pdf_path === "string" &&
      seleniumResult.pdf_path.endsWith(".pdf")
    ) {
      const pdfBuffer = await fs.readFile(seleniumResult.pdf_path);

      const groupTitle = "Eligibility Status";
      const groupTitleKey = "ELIGIBILITY_STATUS";

      let group = await storage.findPdfGroupByPatientTitleKey(
        patient.id,
        groupTitleKey
      );
      if (!group) {
        group = await storage.createPdfGroup(
          patient.id,
          groupTitle,
          groupTitleKey
        );
      }
      if (!group?.id) {
        throw new Error("PDF group creation failed: missing group ID");
      }

      const created = await storage.createPdfFile(
        group.id,
        path.basename(seleniumResult.pdf_path),
        pdfBuffer
      );
      if (created && typeof created === "object" && "id" in created) {
        createdPdfFileId = Number(created.id);
      }
      outputResult.pdfUploadStatus = `PDF saved to group: ${group.title}`;
    } else {
      outputResult.pdfUploadStatus =
        "No valid PDF path provided by Selenium, Couldn't upload pdf to server.";
    }
  } else {
    outputResult.patientUpdateStatus =
      "Patient not found or missing ID; no update performed";
  }

  // 4) Cleanup PDF temp folder
  try {
    if (seleniumResult && seleniumResult.pdf_path) {
      await emptyFolderContainingFile(seleniumResult.pdf_path);
    }
  } catch (cleanupErr) {
    console.error(
      `[ddma-eligibility cleanup failed for ${seleniumResult?.pdf_path}]`,
      cleanupErr
    );
  }

  return {
    patientUpdateStatus: outputResult.patientUpdateStatus,
    pdfUploadStatus: outputResult.pdfUploadStatus,
    pdfFileId: createdPdfFileId,
  };
}

/**
 * Polls Python agent for session status and emits socket events:
 *  - 'selenium:otp_required' when waiting_for_otp
 *  - 'selenium:session_update' when completed/error
 */
async function pollAgentSessionAndProcess(
  sessionId: string,
  socketId?: string
) {
  const maxAttempts = 300; // ~5 minutes @ 1s
  const delayMs = 1000;

  const job = ddmaJobs[sessionId];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const st = await getSeleniumDdmaSessionStatus(sessionId);
      const status = st?.status;

      if (status === "waiting_for_otp") {
        if (socketId && io && io.sockets.sockets.get(socketId)) {
          io.to(socketId).emit("selenium:otp_required", {
            session_id: sessionId,
            message: "OTP required. Please enter the OTP.",
          });
        }
        // once waiting_for_otp, we stop polling here; OTP flow continues separately
        return;
      }

      if (status === "completed") {
        // run DB + PDF pipeline
        let finalResult: any = null;
        if (job && st.result) {
          try {
            finalResult = await handleDdmaCompletedJob(
              sessionId,
              job,
              st.result
            );
          } catch (err: any) {
            finalResult = {
              error: "Failed to process ddma completed job",
              detail: err?.message ?? String(err),
            };
          }
        }

        if (socketId && io && io.sockets.sockets.get(socketId)) {
          io.to(socketId).emit("selenium:session_update", {
            session_id: sessionId,
            status: "completed",
            rawSelenium: st.result,
            final: finalResult,
          });
        }
        delete ddmaJobs[sessionId];
        return;
      }

      if (status === "error" || status === "not_found") {
        if (socketId && io && io.sockets.sockets.get(socketId)) {
          io.to(socketId).emit("selenium:session_update", {
            session_id: sessionId,
            status,
            message: st?.message || "Selenium session error",
          });
        }
        delete ddmaJobs[sessionId];
        return;
      }
    } catch (err) {
      // swallow transient errors and keep polling
      console.warn("pollAgentSessionAndProcess error", err);
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  // fallback: timeout
  if (socketId && io && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("selenium:session_update", {
      session_id: sessionId,
      status: "error",
      message: "Polling timeout while waiting for selenium session",
    });
  }
}

/**
 * POST /ddma-eligibility
 * Starts DDMA eligibility Selenium job.
 * Expects:
 *  - req.body.data: stringified JSON like your existing /eligibility-check
 *  - req.body.socketId: socket.io client id
 */
router.post(
  "/ddma-eligibility",
  async (req: Request, res: Response): Promise<any> => {
    if (!req.body.data) {
      return res
        .status(400)
        .json({ error: "Missing Insurance Eligibility data for selenium" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: user info missing" });
    }

    try {
      const rawData =
        typeof req.body.data === "string"
          ? JSON.parse(req.body.data)
          : req.body.data;

      const credentials = await storage.getInsuranceCredentialByUserAndSiteKey(
        req.user.id,
        rawData.insuranceSiteKey
      );
      if (!credentials) {
        return res.status(404).json({
          error:
            "No insurance credentials found for this provider, Kindly Update this at Settings Page.",
        });
      }

      const enrichedData = {
        ...rawData,
        massddmaUsername: credentials.username,
        massddmaPassword: credentials.password,
      };

      const socketId: string | undefined = req.body.socketId;

      const agentResp = await forwardToSeleniumDdmaEligibilityAgent(
        enrichedData,
      );

      if (!agentResp || agentResp.status !== "started" || !agentResp.session_id) {
        return res.status(502).json({
          error: "Selenium agent did not return a started session",
          detail: agentResp,
        });
      }

      const sessionId = agentResp.session_id as string;

      // Save job context
      ddmaJobs[sessionId] = {
        userId: req.user.id,
        insuranceEligibilityData: enrichedData,
      };

      // start polling in background to notify client via socket and process job
      pollAgentSessionAndProcess(sessionId, socketId).catch((e) =>
        console.warn("pollAgentSessionAndProcess failed", e)
      );

      // reply immediately with started status
      return res.json({ status: "started", session_id: sessionId });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        error: err.message || "Failed to start ddma selenium agent",
      });
    }
  }
);

/**
 * POST /selenium/submit-otp
 * Body: { session_id, otp, socketId? }
 * Forwards OTP to Python agent and optionally notifies client socket.
 */
router.post(
  "/selenium/submit-otp",
  async (req: Request, res: Response): Promise<any> => {
    const { session_id: sessionId, otp, socketId } = req.body;
    if (!sessionId || !otp) {
      return res
        .status(400)
        .json({ error: "session_id and otp are required" });
    }

    try {
      const r = await forwardOtpToSeleniumDdmaAgent(sessionId, otp);

      // notify socket that OTP was accepted (if socketId present)
      try {
        const { io } = require("../socket");
        if (socketId && io && io.sockets.sockets.get(socketId)) {
          io.to(socketId).emit("selenium:otp_submitted", {
            session_id: sessionId,
            result: r,
          });
        }
      } catch (emitErr) {
        console.warn("Failed to emit selenium:otp_submitted", emitErr);
      }

      return res.json(r);
    } catch (err: any) {
      console.error("Failed to forward OTP:", err?.response?.data || err?.message || err);
      return res.status(500).json({
        error: "Failed to forward otp to selenium agent",
        detail: err?.message || err,
      });
    }
  }
);

export default router;
