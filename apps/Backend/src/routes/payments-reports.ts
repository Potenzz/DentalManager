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
  "/patients-with-balances",
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

      const data = await storage.getPatientsWithBalances(
        limit,
        cursor,
        from,
        to
      );
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

/**
 * GET /api/payments-reports/by-doctor/balances
 * Query params:
 *  - staffId (required)
 *  - limit (optional, default 25)
 *  - cursor (optional)
 *  - from/to (optional ISO date strings) - filter payments by createdAt in the range (inclusive)
 *
 * Response: { balances, totalCount, nextCursor, hasMore }
 */
router.get(
  "/by-doctor/balances",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const staffIdRaw = req.query.staffId;
      if (!staffIdRaw) {
        return res
          .status(400)
          .json({ message: "Missing required 'staffId' query parameter" });
      }
      const staffId = Number(staffIdRaw);
      if (!Number.isFinite(staffId) || staffId <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid 'staffId' query parameter" });
      }

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

      // use the new storage method that returns only the paged balances
      const balancesResult = await storage.getPatientsBalancesByDoctor(
        staffId,
        limit,
        cursor,
        from,
        to
      );

      res.json({
        balances: balancesResult?.balances ?? [],
        totalCount: Number(balancesResult?.totalCount ?? 0),
        nextCursor: balancesResult?.nextCursor ?? null,
        hasMore: Boolean(balancesResult?.hasMore ?? false),
      });
    } catch (err: any) {
      console.error(
        "GET /api/payments-reports/by-doctor/balances error:",
        err?.message ?? err,
        err?.stack
      );
      res.status(500).json({
        message: "Failed to fetch doctor balances",
        detail: err?.message ?? String(err),
      });
    }
  }
);

/**
 * GET /api/payments-reports/by-doctor/summary
 * Query params:
 *  - staffId (required)
 *  - from/to (optional ISO date strings) - filter payments by createdAt in the range (inclusive)
 *
 * Response: { totalPatients, totalOutstanding, totalCollected, patientsWithBalance }
 */
router.get(
  "/by-doctor/summary",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const staffIdRaw = req.query.staffId;
      if (!staffIdRaw) {
        return res
          .status(400)
          .json({ message: "Missing required 'staffId' query parameter" });
      }
      const staffId = Number(staffIdRaw);
      if (!Number.isFinite(staffId) || staffId <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid 'staffId' query parameter" });
      }

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

      // use the new storage method that returns only the summary for the staff
      const summary = await storage.getSummaryByDoctor(staffId, from, to);

      res.json(summary);
    } catch (err: any) {
      console.error(
        "GET /api/payments-reports/by-doctor/summary error:",
        err?.message ?? err,
        err?.stack
      );
      res.status(500).json({
        message: "Failed to fetch doctor summary",
        detail: err?.message ?? String(err),
      });
    }
  }
);

export default router;
