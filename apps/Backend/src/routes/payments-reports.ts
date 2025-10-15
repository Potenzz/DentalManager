import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
const router = Router();

/**
 * GET /api/payments-reports/summary
 * optional query: from=YYYY-MM-DD&to=YYYY-MM-DD (ISO date strings)
 */
router.get("/summary", async (req, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const summary = await storage.getSummary(from, to);
    res.json(summary);
  } catch (err: any) {
    console.error(
      "GET /api/payments-reports/summary error:",
      err?.message ?? err,
      err?.stack
    );
    res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});
/**
 * GET /api/payments-reports/summary
 * optional query: from=YYYY-MM-DD&to=YYYY-MM-DD (ISO date strings)
 */
router.get("/summary", async (req: Request, res: Response): Promise<any> => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    if (req.query.from && isNaN(from?.getTime() ?? NaN))
      return res.status(400).json({ message: "Invalid 'from' date" });
    if (req.query.to && isNaN(to?.getTime() ?? NaN))
      return res.status(400).json({ message: "Invalid 'to' date" });

    const summary = await storage.getSummary(from, to);
    res.json(summary);
  } catch (err: any) {
    console.error(
      "GET /api/payments-reports/summary error:",
      err?.message ?? err,
      err?.stack
    );
    res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});

/**
 * GET /api/payments-reports/patient-balances
 * query:
 *  - limit (default 25)
 *  - offset (default 0)
 *  - minBalance (true|false)
 *  - from / to (optional ISO date strings) - filter payments by createdAt in the range (inclusive)
 */
router.get(
  "/patient-balances",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const limit = Math.max(
        1,
        Math.min(200, parseInt(String(req.query.limit || "25"), 10))
      );
      const offset = Math.max(0, parseInt(String(req.query.offset || "0"), 10));
      const minBalance =
        String(req.query.minBalance || "false").toLowerCase() === "true";

      const from = req.query.from
        ? new Date(String(req.query.from))
        : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;

      if (req.query.from && isNaN(from?.getTime() ?? NaN)) {
        return res.status(400).json({ message: "Invalid 'from' date" });
      }
      if (req.query.to && isNaN(to?.getTime() ?? NaN)) {
        return res.status(400).json({ message: "Invalid 'to' date" });
      }

      const data = await storage.getPatientBalances(
        limit,
        offset,
        from,
        to,
        minBalance
      );
      res.json(data);
    } catch (err: any) {
      console.error(
        "GET /api/payments-reports/patient-balances error:",
        err?.message ?? err,
        err?.stack
      );
      res.status(500).json({ message: "Failed to fetch patient balances" });
    }
  }
);

// // GET /api/payments-by-date?from=ISO&to=ISO&limit=&offset=
// router.get("/payments-by-date", async (req: Request, res: Response): Promise<any> => {
//   try {
//     const from = req.query.from ? new Date(String(req.query.from)) : null;
//     const to = req.query.to ? new Date(String(req.query.to)) : null;
//     if (!from || !to) return res.status(400).json({ message: "from and to are required" });

//     const limit = Math.min(parseInt(req.query.limit as string) || 1000, 5000);
//     const offset = parseInt(req.query.offset as string) || 0;

//     const { payments, totalCount } = await storage.getPaymentsByDateRange(from, to, limit, offset);
//     res.json({ payments, totalCount });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch payments by date" });
//   }
// });

export default router;
