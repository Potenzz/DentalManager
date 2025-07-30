import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ClaimUncheckedCreateInputObjectSchema } from "@repo/db/usedSchemas";

const router = Router();

// Define Zod schemas
const ClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

type InsertClaim = z.infer<typeof ClaimSchema>;

const updateClaimSchema = (
  ClaimUncheckedCreateInputObjectSchema as unknown as z.ZodObject<any>
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

type UpdateClaim = z.infer<typeof updateClaimSchema>;


// GET /api/payments/recent
router.get('/recent', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const [payments, totalCount] = await Promise.all([
      storage.getRecentPaymentsByUser(userId, limit, offset),
      storage.getTotalPaymentCountByUser(userId),
    ]);

    res.json({ payments, totalCount });
  } catch (err) {
    console.error('Failed to fetch payments:', err);
    res.status(500).json({ message: 'Failed to fetch recent payments' });
  }
});

// GET /api/payments/claim/:claimId
router.get('/claim/:claimId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const claimId = parseInt(req.params.claimId);

    const payment = await storage.getPaymentByClaimId(userId, claimId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    res.json(payment);
  } catch (err) {
    console.error('Failed to fetch payment by claim:', err);
    res.status(500).json({ message: 'Failed to fetch payment' });
  }
});

// GET /api/payments/patient/:patientId
router.get('/patient/:patientId', async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = parseInt(req.params.patientId);

    const payments = await storage.getPaymentsByPatientId(userId, patientId);
    res.json(payments);
  } catch (err) {
    console.error('Failed to fetch patient payments:', err);
    res.status(500).json({ message: 'Failed to fetch patient payments' });
  }
});

// GET /api/payments/filter
router.get('/filter', async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;
    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    const payments = await storage.getPaymentsByDateRange(userId, fromDate, toDate);
    res.json(payments);
  } catch (err) {
    console.error('Failed to filter payments:', err);
    res.status(500).json({ message: 'Failed to filter payments' });
  }
});

// POST /api/payments/:claimId
router.post('/:claimId', body('totalBilled').isDecimal(),(req: Request, res: Response): Promise<any> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const userId = req.user.id;
    const claimId = parseInt(req.params.claimId);
    const { totalBilled } = req.body;

    const payment = await storage.createPayment({ userId, claimId, totalBilled });
    res.status(201).json(payment);
  } catch (err) {
    console.error('Failed to create payment:', err);
    res.status(500).json({ message: 'Failed to create payment' });
  }
});

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const updates = req.body;

    const updated = await storage.updatePayment(userId, id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Failed to update payment:', err);
    res.status(500).json({ message: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    await storage.deletePayment(userId, id);
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error('Failed to delete payment:', err);
    res.status(500).json({ message: 'Failed to delete payment' });
  }
});

export default router;
