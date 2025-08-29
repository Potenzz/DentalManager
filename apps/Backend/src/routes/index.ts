import { Router } from "express";
import patientsRoutes from "./patients";
import appointmentsRoutes from "./appointments";
import usersRoutes from "./users";
import staffsRoutes from "./staffs";
import claimsRoutes from "./claims";
import patientDataExtractionRoutes from "./patientdataExtraction";
import insuranceCredsRoutes from "./insuranceCreds";
import documentsRoutes from "./documents";
import insuranceEligibilityRoutes from "./insuranceEligibility";
import paymentsRoutes from "./payments";
import databaseManagementRoutes from "./database-management";
import notificationsRoutes from "./notifications";
import paymentOcrRoutes from "./paymentOcrExtraction";

const router = Router();

router.use("/patients", patientsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/users", usersRoutes);
router.use("/staffs", staffsRoutes);
router.use("/patientDataExtraction", patientDataExtractionRoutes);
router.use("/claims", claimsRoutes);
router.use("/insuranceCreds", insuranceCredsRoutes);
router.use("/documents", documentsRoutes);
router.use("/insuranceEligibility", insuranceEligibilityRoutes);
router.use("/payments", paymentsRoutes);
router.use("/database-management", databaseManagementRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/payment-ocr", paymentOcrRoutes);

export default router;
