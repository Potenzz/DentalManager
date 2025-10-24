import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage"; 
const router = Router();

/**
 * GET /api/reports/export
 * query:
 *  - type = patients_with_balance | collections_by_doctor
 *  - from, to = optional ISO date strings (YYYY-MM-DD)
 *  - staffId = required for collections_by_doctor
 *  - format = csv (we expect csv; if missing default to csv)
 */
function escapeCsvCell(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r?\n/g, " ");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get("/export", async (req: Request, res: Response): Promise<any> => {
  try {
    const type = String(req.query.type || "");
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const staffId = req.query.staffId ? Number(req.query.staffId) : undefined;
    const format = String(req.query.format || "csv").toLowerCase();

    if (format !== "csv") {
      return res.status(400).json({ message: "Only CSV export is supported" });
    }

    let patientsSummary: any[] = [];

    if (type === "patients_with_balance") {
      patientsSummary = await storage.fetchAllPatientsWithBalances(from, to);
    } else if (type === "collections_by_doctor") {
      if (!staffId || !Number.isFinite(staffId) || staffId <= 0) {
        return res.status(400).json({ message: "Missing or invalid staffId for collections_by_doctor" });
      }
      patientsSummary = await storage.fetchAllPatientsForDoctor(staffId, from, to);
    } else {
      return res.status(400).json({ message: "Unsupported report type" });
    }

    const patientsWithFinancials = await storage.buildExportRowsForPatients(patientsSummary, 5000);

    // Build CSV - flattened rows
    // columns: patientId, patientName, currentBalance, type, date, procedureCode, billed, paid, adjusted, totalDue, status
    const header = [
      "patientId",
      "patientName",
      "currentBalance",
      "type",
      "date",
      "procedureCode",
      "billed",
      "paid",
      "adjusted",
      "totalDue",
      "status",
    ];

    const lines = [header.join(",")];

    for (const p of patientsWithFinancials) {
      const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
      for (const fr of p.financialRows) {
        lines.push(
          [
            escapeCsvCell(p.patientId),
            escapeCsvCell(name),
            (Number(p.currentBalance ?? 0)).toFixed(2),
            escapeCsvCell(fr.type),
            escapeCsvCell(fr.date),
            escapeCsvCell(fr.procedureCode),
            (Number(fr.billed ?? 0)).toFixed(2),
            (Number(fr.paid ?? 0)).toFixed(2),
            (Number(fr.adjusted ?? 0)).toFixed(2),
            (Number(fr.totalDue ?? 0)).toFixed(2),
            escapeCsvCell(fr.status),
          ].join(",")
        );
      }
    }

    const fname = `report-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    return res.send(lines.join("\n"));
  } catch (err: any) {
    console.error("[/api/reports/export] error:", err?.message ?? err, err?.stack);
    return res.status(500).json({ message: "Export error" });
  }
});

export default router;
