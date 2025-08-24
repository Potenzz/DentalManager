import { Router } from "express";
import patientsRoutes from "./patients";
import appointmentsRoutes from "./appointments";
import usersRoutes from "./users";
import staffsRoutes from "./staffs";
import pdfExtractionRoutes from "./pdfExtraction";
import claimsRoutes from "./claims";
import insuranceCredsRoutes from "./insuranceCreds";
import documentsRoutes from "./documents";
import insuranceEligibilityRoutes from "./insuranceEligibility";
import paymentsRoutes from "./payments";
import databaseManagementRoutes from "./database-management";

const router = Router();

router.use("/patients", patientsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/users", usersRoutes);
router.use("/staffs", staffsRoutes);
router.use("/pdfExtraction", pdfExtractionRoutes);
router.use("/claims", claimsRoutes);
router.use("/insuranceCreds", insuranceCredsRoutes);
router.use("/documents", documentsRoutes);
router.use("/insuranceEligibility", insuranceEligibilityRoutes);
router.use("/payments", paymentsRoutes);
router.use("/database-management", databaseManagementRoutes);

export default router;
