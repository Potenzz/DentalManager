import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { forwardToSeleniumInsuranceEligibilityAgent } from "../services/seleniumInsuranceEligibilityClient";
import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { forwardToSeleniumInsuranceClaimStatusAgent } from "../services/seleniumInsuranceClaimStatusClient";
import fsSync from "fs";

const router = Router();

router.post(
  "/eligibility-check",
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
      const insuranceEligibilityData = JSON.parse(req.body.data);

      const credentials = await storage.getInsuranceCredentialByUserAndSiteKey(
        req.user.id,
        insuranceEligibilityData.insuranceSiteKey
      );
      if (!credentials) {
        return res.status(404).json({
          error:
            "No insurance credentials found for this provider, Kindly Update this at Settings Page.",
        });
      }

      const enrichedData = {
        ...insuranceEligibilityData,
        massdhpUsername: credentials.username,
        massdhpPassword: credentials.password,
      };

      const result =
        await forwardToSeleniumInsuranceEligibilityAgent(enrichedData);

      // ✅ Step 1: Check result and update patient status
      const patient = await storage.getPatientByInsuranceId(
        insuranceEligibilityData.memberId
      );

      if (patient && patient.id !== undefined) {
        const newStatus = result.eligibility === "Y" ? "active" : "inactive";
        await storage.updatePatient(patient.id, { status: newStatus });
        result.patientUpdateStatus = `Patient status updated to ${newStatus}`;

        // ✅ Step 2: Handle PDF Upload
        if (result.pdf_path && result.pdf_path.endsWith(".pdf")) {
          const pdfBuffer = await fs.readFile(result.pdf_path);

          const groupTitle = "Eligibility Status";
          const groupTitleKey = "ELIGIBILITY_STATUS";

          let group = await storage.findPdfGroupByPatientTitleKey(
            patient.id,
            groupTitleKey
          );

          // Step 2b: Create group if it doesn’t exist
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
          await storage.createPdfFile(
            group.id,
            path.basename(result.pdf_path),
            pdfBuffer
          );

          await fs.unlink(result.pdf_path);

          result.pdfUploadStatus = `PDF saved to group: ${group.title}`;
        } else {
          result.pdfUploadStatus =
            "No valid PDF path provided by Selenium, Couldn't upload pdf to server.";
        }
      } else {
        result.patientUpdateStatus =
          "Patient not found or missing ID; no update performed";
      }

      res.json({
        patientUpdateStatus: result.patientUpdateStatus,
        pdfUploadStatus: result.pdfUploadStatus,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        error: err.message || "Failed to forward to selenium agent",
      });
    }
  }
);

router.post(
  "/claim-status-check",
  async (req: Request, res: Response): Promise<any> => {
    if (!req.body.data) {
      return res
        .status(400)
        .json({ error: "Missing Insurance Status data for selenium" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: user info missing" });
    }

    async function imageToPdfBuffer(imagePath: string): Promise<Buffer> {
      return new Promise<Buffer>((resolve, reject) => {
        try {
          const doc = new PDFDocument({ autoFirstPage: false });
          const chunks: Uint8Array[] = [];

          // collect data chunks
          doc.on("data", (chunk: any) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", (err: any) => reject(err));

          const A4_WIDTH = 595.28; // points
          const A4_HEIGHT = 841.89; // points

          doc.addPage({ size: [A4_WIDTH, A4_HEIGHT] });

          doc.image(imagePath, 0, 0, {
            fit: [A4_WIDTH, A4_HEIGHT],
            align: "center",
            valign: "center",
          });

          doc.end();
        } catch (err) {
          reject(err);
        }
      });
    }
    try {
      const insuranceClaimStatusData = JSON.parse(req.body.data);

      const credentials = await storage.getInsuranceCredentialByUserAndSiteKey(
        req.user.id,
        insuranceClaimStatusData.insuranceSiteKey
      );
      if (!credentials) {
        return res.status(404).json({
          error:
            "No insurance credentials found for this provider, Kindly Update this at Settings Page.",
        });
      }

      const enrichedData = {
        ...insuranceClaimStatusData,
        massdhpUsername: credentials.username,
        massdhpPassword: credentials.password,
      };

      const result =
        await forwardToSeleniumInsuranceClaimStatusAgent(enrichedData);

      // ✅ Step 1: Check result
      const patient = await storage.getPatientByInsuranceId(
        insuranceClaimStatusData.memberId
      );

      if (patient && patient.id !== undefined) {
        let pdfBuffer: Buffer | null = null;
        let generatedPdfPath: string | null = null;

        if (
          result.ss_path &&
          (result.ss_path.endsWith(".png") ||
            result.ss_path.endsWith(".jpg") ||
            result.ss_path.endsWith(".jpeg"))
        ) {
          try {
            // Ensure file exists
            if (!fsSync.existsSync(result.ss_path)) {
              throw new Error(`Screenshot file not found: ${result.ss_path}`);
            }

            // Convert image to PDF buffer
            pdfBuffer = await imageToPdfBuffer(result.ss_path);

            // Optionally write generated PDF to temp path (so name is available for createPdfFile)
            const pdfFileName = `claimStatus_${insuranceClaimStatusData.memberId}_${Date.now()}.pdf`;
            generatedPdfPath = path.join(
              path.dirname(result.ss_path),
              pdfFileName
            );
            await fs.writeFile(generatedPdfPath, pdfBuffer);
          } catch (err) {
            console.error("Failed to convert screenshot to PDF:", err);
            result.pdfUploadStatus = `Failed to convert screenshot to PDF: ${String(err)}`;
          }
        } else {
          result.pdfUploadStatus =
            "No valid PDF or screenshot path provided by Selenium; nothing to upload.";
        }

        if (pdfBuffer && generatedPdfPath) {
          const groupTitle = "Claim Status";
          const groupTitleKey = "CLAIM_STATUS";

          let group = await storage.findPdfGroupByPatientTitleKey(
            patient.id,
            groupTitleKey
          );

          // Create group if missing
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

          // Use the basename for storage
          const basename = path.basename(generatedPdfPath);
          await storage.createPdfFile(group.id, basename, pdfBuffer);

          // Clean up temp files:
          try {
            // remove generated PDF file (if it was created during conversion)
            if (
              generatedPdfPath &&
              fsSync.existsSync(generatedPdfPath) &&
              generatedPdfPath !== result.pdf_path
            ) {
              await fs.unlink(generatedPdfPath);
            }
            // remove screenshot (if provided by Selenium) to avoid lingering temp files
            if (result.ss_path && fsSync.existsSync(result.ss_path)) {
              await fs.unlink(result.ss_path);
            }
          } catch (cleanupErr) {
            console.warn("Cleanup error (non-fatal):", cleanupErr);
          }

          result.pdfUploadStatus = `PDF saved to group: ${group.title}`;
        }
      } else {
        result.patientUpdateStatus =
          "Patient not found or missing ID; no update performed";
      }

      res.json({
        pdfUploadStatus: result.pdfUploadStatus,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        error: err.message || "Failed to forward to selenium agent",
      });
    }
  }
);

export default router;
