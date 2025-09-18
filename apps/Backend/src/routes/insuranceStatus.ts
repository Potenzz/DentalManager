import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { forwardToSeleniumInsuranceEligibilityAgent } from "../services/seleniumInsuranceEligibilityClient";
import fs from "fs/promises";
import path from "path";
import { forwardToSeleniumInsuranceClaimStatusAgent } from "../services/seleniumInsuranceClaimStatusClient";

const router = Router();

router.post("/eligibility-check", async (req: Request, res: Response): Promise<any> => {
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

        const groupTitle = "Insurance Status PDFs";
        const groupTitleKey = "INSURANCE_STATUS_PDFs"
        const groupCategory = "ELIGIBILITY_STATUS";

        let group = await storage.findPdfGroupByPatientTitleKeyAndCategory(
          patient.id,
          groupTitleKey,
          groupCategory
        );

        // Step 2b: Create group if it doesn’t exist
        if (!group) {
          group = await storage.createPdfGroup(
            patient.id,
            groupTitle,
            groupTitleKey,
            groupCategory
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
});

router.post("/claim-status-check", async (req: Request, res: Response): Promise<any> => {
  if (!req.body.data) {
    return res
      .status(400)
      .json({ error: "Missing Insurance Status data for selenium" });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: user info missing" });
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
      // ✅ Step 2: Handle PDF Upload
      if (result.pdf_path && result.pdf_path.endsWith(".pdf")) {
        const pdfBuffer = await fs.readFile(result.pdf_path);

        const groupTitle = "Insurance Status PDFs";
        const groupTitleKey = "INSURANCE_STATUS_PDFs"
        const groupCategory = "CLAIM_STATUS";

        let group = await storage.findPdfGroupByPatientTitleKeyAndCategory(
          patient.id,
          groupTitleKey,
          groupCategory
        );

        // Step 2b: Create group if it doesn’t exist
        if (!group) {
          group = await storage.createPdfGroup(
            patient.id,
            groupTitle,
            groupTitleKey,
            groupCategory
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
});

export default router;
