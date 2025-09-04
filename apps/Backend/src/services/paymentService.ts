import Decimal from "decimal.js";
import {
  NewTransactionPayload,
  OcrRow,
  Payment,
  PaymentMethod,
  paymentMethodOptions,
  PaymentStatus,
} from "@repo/db/types";
import { storage } from "../storage";
import { prisma } from "@repo/db/client";
import { convertOCRDate } from "../utils/dateUtils";

/**
 * Validate transactions against a payment record
 */
export async function validateTransactions(
  paymentId: number,
  serviceLineTransactions: NewTransactionPayload["serviceLineTransactions"],
  options?: { isReversal?: boolean }
) {
  const paymentRecord = await storage.getPaymentById(paymentId);
  if (!paymentRecord) {
    throw new Error("Payment not found");
  }

  // Choose service lines from claim if present, otherwise direct payment service lines(OCR Based datas)
  const serviceLines = paymentRecord.claim
    ? paymentRecord.claim.serviceLines
    : paymentRecord.serviceLines;

  if (!serviceLines || serviceLines.length === 0) {
    throw new Error("No service lines available for this payment");
  }

  for (const txn of serviceLineTransactions) {
    const line = serviceLines.find((sl) => sl.id === txn.serviceLineId);

    if (!line) {
      throw new Error(`Invalid service line: ${txn.serviceLineId}`);
    }

    const paidAmount = new Decimal(txn.paidAmount ?? 0);
    const adjustedAmount = new Decimal(txn.adjustedAmount ?? 0);

    if (!options?.isReversal && (paidAmount.lt(0) || adjustedAmount.lt(0))) {
      throw new Error("Amounts cannot be negative");
    }

    if (paidAmount.eq(0) && adjustedAmount.eq(0)) {
      throw new Error("Must provide a payment or adjustment");
    }
    if (!options?.isReversal && paidAmount.gt(line.totalDue)) {
      throw new Error(
        `Paid amount exceeds due for service line ${txn.serviceLineId}`
      );
    }
  }

  return paymentRecord;
}

/**
 * Apply transactions to a payment & recalc totals
 */
export async function applyTransactions(
  paymentId: number,
  serviceLineTransactions: NewTransactionPayload["serviceLineTransactions"],
  userId: number
): Promise<Payment> {
  return prisma.$transaction(async (tx) => {
    // 1. Insert service line transactions + recalculate each service line
    for (const txn of serviceLineTransactions) {
      await tx.serviceLineTransaction.create({
        data: {
          paymentId,
          serviceLineId: txn.serviceLineId,
          transactionId: txn.transactionId,
          paidAmount: new Decimal(txn.paidAmount),
          adjustedAmount: new Decimal(txn.adjustedAmount || 0),
          method: txn.method,
          receivedDate: txn.receivedDate,
          payerName: txn.payerName,
          notes: txn.notes,
        },
      });

      // Recalculate service line totals
      const aggLine = await tx.serviceLineTransaction.aggregate({
        _sum: { paidAmount: true, adjustedAmount: true },
        where: { serviceLineId: txn.serviceLineId },
      });

      const serviceLine = await tx.serviceLine.findUniqueOrThrow({
        where: { id: txn.serviceLineId },
        select: { totalBilled: true },
      });

      const totalPaid = aggLine._sum.paidAmount || new Decimal(0);
      const totalAdjusted = aggLine._sum.adjustedAmount || new Decimal(0);
      const totalDue = serviceLine.totalBilled
        .minus(totalPaid)
        .minus(totalAdjusted);

      await tx.serviceLine.update({
        where: { id: txn.serviceLineId },
        data: {
          totalPaid,
          totalAdjusted,
          totalDue,
          status:
            totalDue.lte(0) && totalPaid.gt(0)
              ? "PAID"
              : totalPaid.gt(0)
                ? "PARTIALLY_PAID"
                : "UNPAID",
        },
      });
    }

    // 2. Recalc payment totals
    const aggPayment = await tx.serviceLineTransaction.aggregate({
      _sum: { paidAmount: true, adjustedAmount: true },
      where: { paymentId },
    });

    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: { totalBilled: true },
    });

    const totalPaid = aggPayment._sum.paidAmount || new Decimal(0);
    const totalAdjusted = aggPayment._sum.adjustedAmount || new Decimal(0);
    const totalDue = payment.totalBilled.minus(totalPaid).minus(totalAdjusted);

    let status: PaymentStatus;
    if (totalDue.lte(0) && totalPaid.gt(0)) status = "PAID";
    else if (totalPaid.gt(0)) status = "PARTIALLY_PAID";
    else status = "PENDING";

    return tx.payment.update({
      where: { id: paymentId },
      data: { totalPaid, totalAdjusted, totalDue, status, updatedById: userId },
    });
  });
}

/**
 * Main entry point for updating payments
 */
export async function updatePayment(
  paymentId: number,
  serviceLineTransactions: NewTransactionPayload["serviceLineTransactions"],
  userId: number,
  options?: { isReversal?: boolean }
): Promise<Payment> {
  await validateTransactions(paymentId, serviceLineTransactions, options);
  return applyTransactions(paymentId, serviceLineTransactions, userId);
}

// handling full-ocr-payments-import

export const fullOcrPaymentService = {
  async importRows(rows: OcrRow[], userId: number) {
    const results: number[] = [];

    for (const [index, row] of rows.entries()) {
      try {
        if (!row.patientName || !row.insuranceId) {
          throw new Error(
            `Row ${index + 1}: missing patientName or insuranceId`
          );
        }
        if (!row.procedureCode) {
          throw new Error(`Row ${index + 1}: missing procedureCode`);
        }

        const billed = new Decimal(row.totalBilled ?? 0);
        const allowed = new Decimal(row.totalAllowed ?? row.totalBilled ?? 0);
        const paid = new Decimal(row.totalPaid ?? 0);

        const adjusted = billed.minus(allowed); // write-off

        // Step 1–3 in a transaction
        const { paymentId, serviceLineId } = await prisma.$transaction(
          async (tx) => {
            // 1. Find or create patient
            let patient = await tx.patient.findFirst({
              where: { insuranceId: row.insuranceId.toString() },
            });

            if (!patient) {
              const [firstNameRaw, ...rest] = (row.patientName ?? "")
                .trim()
                .split(" ");
              const firstName = firstNameRaw || "Unknown";
              const lastName = rest.length > 0 ? rest.join(" ") : "Unknown";

              patient = await tx.patient.create({
                data: {
                  firstName,
                  lastName,
                  insuranceId: row.insuranceId.toString(),
                  dateOfBirth: new Date(Date.UTC(1900, 0, 1)), // fallback (1900, jan, 1)
                  gender: "",
                  phone: "",
                  userId,
                },
              });
            }

            // 2. Create payment (claimId null) — IMPORTANT: start with zeros, due = billed
            const payment = await tx.payment.create({
              data: {
                patientId: patient.id,
                userId,
                totalBilled: billed,
                totalPaid: new Decimal(0),
                totalAdjusted: new Decimal(0),
                totalDue: billed,
                status: "PENDING", // updatePayment will fix it
                notes: `OCR import from ${row.sourceFile ?? "Unknown file"}`,
              },
            });

            // 3. Create service line — IMPORTANT: start with zeros, due = billed
            const serviceLine = await tx.serviceLine.create({
              data: {
                paymentId: payment.id,
                procedureCode: row.procedureCode,
                toothNumber: row.toothNumber ?? null,
                toothSurface: row.toothSurface ?? null,
                procedureDate: convertOCRDate(row.procedureDate),
                totalBilled: billed,
                totalPaid: new Decimal(0),
                totalAdjusted: new Decimal(0),
                totalDue: billed,
              },
            });

            return { paymentId: payment.id, serviceLineId: serviceLine.id };
          }
        );

        // Step 4: AFTER commit, recalc using updatePayment (global prisma can see it now)
        // Build transaction & let updatePayment handle recalculation
        const txn = {
          serviceLineId,
          paidAmount: paid.toNumber(),
          adjustedAmount: adjusted.toNumber(),
          method: "OTHER" as PaymentMethod,
          receivedDate: new Date(),
          notes: "OCR import",
        };

        await updatePayment(paymentId, [txn], userId);

        results.push(paymentId);
      } catch (err) {
        console.error(`❌ Failed to import OCR row ${index + 1}:`, err);
        throw err;
      }
    }

    return results;
  },
};
