import { Router } from 'express';
import patientRoutes from './patients';
import appointmentRoutes from './appointements'
import userRoutes from './users'
import staffRoutes from './staffs'
import pdfExtractionRoutes from './pdfExtraction';
import claimsRoutes from './claims';
import insuranceCredsRoutes from './insuranceCreds';
import claimsPdfRoutes from './claim-pdf';

const router = Router();

router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/users', userRoutes);
router.use('/staffs', staffRoutes);
router.use('/pdfExtraction', pdfExtractionRoutes);
router.use('/claims', claimsRoutes);
router.use('/insuranceCreds', insuranceCredsRoutes);
router.use('/claimspdf', claimsPdfRoutes);

export default router;