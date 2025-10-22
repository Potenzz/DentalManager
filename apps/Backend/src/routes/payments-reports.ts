import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
const router = Router();

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
 *  - cursor (optional base64 cursor token)
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

      const cursor =
        typeof req.query.cursor === "string" ? String(req.query.cursor) : null;

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

      const data = await storage.getPatientBalances(limit, cursor, from, to);
      // returns { balances, totalCount, nextCursor, hasMore }
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

export default router;
