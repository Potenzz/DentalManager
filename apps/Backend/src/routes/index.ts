import { Router } from "express";
import patientsRoutes from "./patients";
import appointmentsRoutes from "./appointments";
import usersRoutes from "./users";
import staffsRoutes from "./staffs";
import claimsRoutes from "./claims";
import patientDataExtractionRoutes from "./patientDataExtraction";
import insuranceCredsRoutes from "./insuranceCreds";
import documentsRoutes from "./documents";
import insuranceStatusRoutes from "./insuranceStatus";
import paymentsRoutes from "./payments";
import databaseManagementRoutes from "./database-management";
import notificationsRoutes from "./notifications";
import paymentOcrRoutes from "./paymentOcrExtraction";
import cloudStorageRoutes from "./cloud-storage";
import paymentsReportsRoutes from "./payments-reports";

const router = Router();

router.use("/patients", patientsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/users", usersRoutes);
router.use("/staffs", staffsRoutes);
router.use("/patientDataExtraction", patientDataExtractionRoutes);
router.use("/claims", claimsRoutes);
router.use("/insuranceCreds", insuranceCredsRoutes);
router.use("/documents", documentsRoutes);
router.use("/insurance-status", insuranceStatusRoutes);
router.use("/payments", paymentsRoutes);
router.use("/database-management", databaseManagementRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/payment-ocr", paymentOcrRoutes);
router.use("/cloud-storage", cloudStorageRoutes);
router.use("/payments-reports", paymentsReportsRoutes);

export default router;
