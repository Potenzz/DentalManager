import { Router } from 'express';
import patientRoutes from './patients';
import appointmentRoutes from './appointements'
import userRoutes from './users'
import staffRoutes from './staffs'
import pdfExtractionRoutes from './pdfExtraction';
import claimsRoutes from './claims';
import insuranceCredsRoutes from './insuranceCreds';
import documentRoutes from './documents';
import insuranceEligibilityRoutes from './insuranceEligibility'

const router = Router();

router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/users', userRoutes);
router.use('/staffs', staffRoutes);
router.use('/pdfExtraction', pdfExtractionRoutes);
router.use('/claims', claimsRoutes);
router.use('/insuranceCreds', insuranceCredsRoutes);
router.use('/documents', documentRoutes);
router.use('/insuranceEligibility', insuranceEligibilityRoutes);


export default router;