import { InputServiceLine } from "@repo/db/types";
import Decimal from "decimal.js";
import rawCodeTable from "@/assets/data/procedureCodes.json";
import { PROCEDURE_COMBOS } from "./procedureCombos";

/* ----------------------------- Types ----------------------------- */
export type CodeRow = {
  "Procedure Code": string;
  Description?: string;
  Price?: string | number | null;
  PriceLTEQ21?: string | number | null;
  PriceGT21?: string | number | null;
  [k: string]: unknown;
};
const CODE_TABLE = rawCodeTable as CodeRow[];

export type ClaimFormLike = {
  serviceDate: string; // form-level service date
  serviceLines: InputServiceLine[];
};

export type ApplyOptions = {
  append?: boolean;
  startIndex?: number;
  lineDate?: string;
  clearTrailing?: boolean;
  replaceAll?: boolean;
};
/* ----------------------------- Helpers ----------------------------- */

export const COMBO_BUTTONS = Object.values(PROCEDURE_COMBOS).map((c) => ({
  id: c.id,
  label: c.label,
}));

// Build a fast lookup map keyed by normalized code
const normalizeCode = (code: string) => code.replace(/\s+/g, "").toUpperCase();

const CODE_MAP: Map<string, CodeRow> = (() => {
  const m = new Map<string, CodeRow>();
  for (const r of CODE_TABLE) {
    const k = normalizeCode(String(r["Procedure Code"] || ""));
    if (k && !m.has(k)) m.set(k, r);
  }
  return m;
})();

// this function is solely for abbrevations feature in claim-form
export function getDescriptionForCode(
  code: string | undefined
): string | undefined {
  if (!code) return undefined;
  const row = CODE_MAP.get(normalizeCode(code));
  return row?.Description;
}

const isBlankPrice = (v: unknown) => {
  if (v == null) return true;
  const s = String(v).trim().toUpperCase();
  return s === "" || s === "IC" || s === "NC";
};

const toDecimalOrZero = (v: unknown): Decimal => {
  if (isBlankPrice(v)) return new Decimal(0);
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return new Decimal(Number.isFinite(n) ? n : 0);
};

// Accepts string or Date, supports MM/DD/YYYY and YYYY-MM-DD
type DateInput = string | Date;

const parseDate = (d: DateInput): Date => {
  if (d instanceof Date)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const s = String(d).trim();
  // MM/DD/YYYY
  const mdy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const m1 = mdy.exec(s);
  if (m1) {
    const mm = Number(m1[1]);
    const dd = Number(m1[2]);
    const yyyy = Number(m1[3]);
    return new Date(yyyy, mm - 1, dd);
  }
  // YYYY-MM-DD
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const m2 = ymd.exec(s);
  if (m2) {
    const yyyy = Number(m2[1]);
    const mm = Number(m2[2]);
    const dd = Number(m2[3]);
    return new Date(yyyy, mm - 1, dd);
  }
  // Fallback
  return new Date(s);
};

const ageOnDate = (dob: DateInput, on: DateInput): number => {
  const birth = parseDate(dob);
  const ref = parseDate(on);
  let age = ref.getFullYear() - birth.getFullYear();
  const hadBirthday =
    ref.getMonth() > birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
};

/**
 * Price chooser that respects your age rules and IC/NC semantics.
 * - If <=21 → PriceLTEQ21 (if present and not IC/NC/blank) else Price.
 * - If >21  → PriceGT21   (if present and not IC/NC/blank) else Price.
 * - If chosen field is IC/NC/blank → 0 (leave empty).
 */
export function pickPriceForRowByAge(row: CodeRow, age: number): Decimal {
  if (age <= 21) {
    if (!isBlankPrice(row.PriceLTEQ21)) return toDecimalOrZero(row.PriceLTEQ21);
  } else {
    if (!isBlankPrice(row.PriceGT21)) return toDecimalOrZero(row.PriceGT21);
  }
  // Fallback to Price if tiered not available/blank
  if (!isBlankPrice(row.Price)) return toDecimalOrZero(row.Price);
  return new Decimal(0);
}

/**
 * Gets price for a code using age & code table.
 */
function getPriceForCodeWithAgeFromMap(
  map: Map<string, CodeRow>,
  code: string,
  age: number
): Decimal {
  const row = map.get(normalizeCode(code));
  return row ? pickPriceForRowByAge(row, age) : new Decimal(0);
}

// helper keeping lines empty,
export const makeEmptyLine = (lineDate: string): InputServiceLine => ({
  procedureCode: "",
  procedureDate: lineDate,
  oralCavityArea: "",
  toothNumber: "",
  toothSurface: "",
  totalBilled: new Decimal(0),
  totalAdjusted: new Decimal(0),
  totalPaid: new Decimal(0),
});

// Ensure the array has at least `min` lines; append blank ones if needed.
const ensureCapacity = (
  lines: (InputServiceLine | undefined)[],
  min: number,
  lineDate: string
) => {
  while (lines.length < min) {
    lines.push(makeEmptyLine(lineDate));
  }
};

/* ------------------------- Main entry points ------------------------- */

/**
 * Map prices for ALL existing lines in a form (your "Map Price" button),
 * using patient's DOB and the form's serviceDate (or per-line procedureDate).
 * Returns a NEW form object (immutable).
 */
export function mapPricesForForm<T extends ClaimFormLike>(params: {
  form: T;
  patientDOB: DateInput;
}): T {
  const { form, patientDOB } = params;
  return {
    ...form,
    serviceLines: form.serviceLines.map((ln) => {
      const age = ageOnDate(patientDOB, form.serviceDate);
      const code = normalizeCode(ln.procedureCode || "");
      if (!code) return { ...ln };
      const price = getPriceForCodeWithAgeFromMap(CODE_MAP, code, age);
      return { ...ln, procedureCode: code, totalBilled: price };
    }),
  };
}

/**
 * Apply a preset combo (fills codes & prices) using patientDOB and serviceDate.
 * Returns a NEW form object (immutable).
 */
export function applyComboToForm<T extends ClaimFormLike>(
  form: T,
  comboId: keyof typeof PROCEDURE_COMBOS,
  patientDOB: DateInput,
  options: ApplyOptions = {}
): T {
  const preset = PROCEDURE_COMBOS[String(comboId)];
  if (!preset) return form;

  const {
    append = true,
    startIndex,
    lineDate = form.serviceDate,
    clearTrailing = false,
    replaceAll = false, // NEW
  } = options;

  const next: T = { ...form, serviceLines: [...form.serviceLines] };

  // Replace-all: blank all existing and start from 0
  if (replaceAll) {
    for (let i = 0; i < next.serviceLines.length; i++) {
      next.serviceLines[i] = makeEmptyLine(lineDate);
    }
  }

  // determine insertion index
  let insertAt = 0;
  if (!replaceAll) {
    if (append) {
      let last = -1;
      next.serviceLines.forEach((ln, i) => {
        if (ln.procedureCode?.trim()) last = i;
      });
      insertAt = Math.max(0, last + 1);
    } else if (typeof startIndex === "number") {
      insertAt = Math.max(
        0,
        Math.min(startIndex, next.serviceLines.length - 1)
      );
    }
  } // if replaceAll, insertAt stays 0

  // Make sure we have enough rows for the whole combo
  ensureCapacity(next.serviceLines, insertAt + preset.codes.length, lineDate);

  // Age on the specific line date we will set
  const age = ageOnDate(patientDOB, lineDate);

  for (let j = 0; j < preset.codes.length; j++) {
    const i = insertAt + j;
    if (i >= next.serviceLines.length) break;

    const codeRaw = preset.codes[j];
    if (!codeRaw) continue;
    const code = normalizeCode(codeRaw);
    const price = getPriceForCodeWithAgeFromMap(CODE_MAP, code, age);

    const original = next.serviceLines[i];

    next.serviceLines[i] = {
      ...original,
      procedureCode: code,
      procedureDate: lineDate,
      oralCavityArea: original?.oralCavityArea ?? "",
      toothNumber:
      preset.toothNumbers?.[j] ??
      original?.toothNumber ??
      "", 
      toothSurface: original?.toothSurface ?? "",
      totalBilled: price,
      totalAdjusted: new Decimal(0),
      totalPaid: new Decimal(0),
    } as InputServiceLine;
  }

  if (replaceAll || clearTrailing) {
    const after = insertAt + preset.codes.length;
    for (let i = after; i < next.serviceLines.length; i++) {
      next.serviceLines[i] = makeEmptyLine(lineDate);
    }
  }

  return next;
}
