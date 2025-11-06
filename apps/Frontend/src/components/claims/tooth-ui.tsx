import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__NONE__" as const;
export type ToothVal = "" | "X" | "O";

interface ToothProps {
  name: string;
  value: ToothVal;                          // "" | "X" | "O"
  onChange: (name: string, v: ToothVal) => void;
}

/**
 * Clean, single select:
 * - Empty state shows a blank trigger (no "None" text).
 * - First menu item sets empty value, but its label is visually blank.
 * - Cell fills column width so the grid can wrap -> no overflow.
 */
function ToothSelect({ name, value, onChange }: ToothProps) {
  const label = name.replace("T_", "");
  const uiValue = (value === "" ? NONE : value) as typeof NONE | "X" | "O";

  return (
    <div className="flex flex-col items-center w-full h-16 rounded-lg border bg-white p-1">
      <div className="text-[10px] leading-none opacity-70 mb-1">{label}</div>

      <Select
        value={uiValue}
        onValueChange={(v) => onChange(name, v === NONE ? "" : (v as ToothVal))}
      >
        <SelectTrigger
          aria-label={`${name} selection`}
          className="
            h-8 w-full px-2 text-xs justify-center
            data-[placeholder]:opacity-0  /* hide placeholder text entirely */
          "
        >
          {/* placeholder is a single space so trigger height stays stable */}
          <SelectValue placeholder=" " />
        </SelectTrigger>

        <SelectContent position="popper" sideOffset={6} align="center" className="z-50">
          {/* blank option -> sets empty string; visually blank, still accessible */}
          <SelectItem value={NONE}>
            {/* visually blank but keeps item height/click area */}
            <span className="sr-only">Empty</span>
            {" "}
          </SelectItem>
          <SelectItem value="X">X</SelectItem>
          <SelectItem value="O">O</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export const ToothSelectRadix = React.memo(
  ToothSelect,
  (prev, next) => prev.value === next.value && prev.name === next.name
);

export function TeethGrid({
  title,
  toothNames,
  values,
  onChange,
}: {
  title: string;
  toothNames: string[];
  values: Record<string, ToothVal | undefined>;
  onChange: (name: string, v: ToothVal) => void;
}) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-center font-medium mb-2">{title}</div>

      {/* responsive grid that auto-fits cells; no horizontal overflow */}
      <div
        className="
          grid gap-2
          [grid-template-columns:repeat(auto-fit,minmax(4.5rem,1fr))]
        "
      >
        {toothNames.map((name) => (
          <ToothSelectRadix
            key={name}
            name={name}
            value={(values[name] as ToothVal) ?? ""}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}


// ——— Missing Teeth helpers for claim-view and edit modal———
type MissingMap = Record<string, ToothVal | undefined>;

export function toStatusLabel(s?: string) {
  if (!s) return "Unknown";
  if (s === "No_missing") return "No Missing";
  if (s === "endentulous") return "Edentulous";
  if (s === "Yes_missing") return "Specify Missing";
  // best-effort prettify
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function safeParseMissingTeeth(raw: unknown): MissingMap {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as MissingMap;
    } catch {}
    return {};
  }
  if (typeof raw === "object") return raw as MissingMap;
  return {};
}

const PERM = new Set(Array.from({ length: 32 }, (_, i) => `T_${i + 1}`));
const PRIM = new Set(Array.from("ABCDEFGHIJKLMNOPQRST").map((ch) => `T_${ch}`));

export function splitTeeth(map: MissingMap) {
  const permanent: Array<{ name: string; v: ToothVal }> = [];
  const primary: Array<{ name: string; v: ToothVal }> = [];
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    if (PERM.has(k)) permanent.push({ name: k, v });
    else if (PRIM.has(k)) primary.push({ name: k, v });
  }
  // stable, human-ish order
  permanent.sort((a, b) => Number(a.name.slice(2)) - Number(b.name.slice(2)));
  primary.sort((a, b) => a.name.localeCompare(b.name));
  return { permanent, primary };
}

export function ToothChip({ name, v }: { name: string; v: ToothVal }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs bg-white">
      <span className="font-medium">{name.replace("T_", "")}</span>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded border">
        {v}
      </span>
    </span>
  );
}
