import { Router } from 'express';
import patientRoutes from './patients';
import appointmentRoutes from './appointements'
import userRoutes from './users'
import staffRoutes from './staffs'

const router = Router();

router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/users', userRoutes);
router.use('/staffs', staffRoutes);

export default router;