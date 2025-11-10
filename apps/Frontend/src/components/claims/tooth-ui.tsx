import React from "react";
import { Label } from "recharts";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

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

export type ToothVal = "X" | "O";
export type MissingMapStrict = Record<string, ToothVal>;

/* ---------- parsing helpers ---------- */
const PERM_NUMBERS = new Set(
  Array.from({ length: 32 }, (_, i) => String(i + 1))
);
const PRIM_LETTERS = new Set(Array.from("ABCDEFGHIJKLMNOPQRST"));

function normalizeToothToken(token: string): string | null {
  const t = token.trim().toUpperCase();
  if (!t) return null;
  if (PERM_NUMBERS.has(t)) return t; // 1..32
  if (t.length === 1 && PRIM_LETTERS.has(t)) return t; // A..T
  return null;
}

function listToEntries(list: string, val: ToothVal): Array<[string, ToothVal]> {
  if (!list) return [];
  const seen = new Set<string>();
  return list
    .split(/[,\s]+/g) // commas OR spaces
    .map(normalizeToothToken) // uppercase + validate
    .filter((t): t is string => !!t)
    .filter((t) => {
      // de-duplicate within field
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    })
    .map((t) => [`T_${t}`, val]);
}

/** Build map; 'O' overrides 'X' when duplicated across fields. */
export function mapFromLists(
  missingList: string,
  pullList: string
): MissingMapStrict {
  const map: MissingMapStrict = {};
  for (const [k, v] of listToEntries(missingList, "X")) map[k] = v;
  for (const [k, v] of listToEntries(pullList, "O")) map[k] = v;
  return map;
}

/** For initializing the inputs from an existing map (used only on mount or clear). */
export function listsFromMap(map: Record<string, ToothVal | undefined>): {
  missing: string;
  toPull: string;
} {
  const missing: string[] = [];
  const toPull: string[] = [];
  for (const [k, v] of Object.entries(map || {})) {
    if (v === "X") missing.push(k.replace(/^T_/, ""));
    else if (v === "O") toPull.push(k.replace(/^T_/, ""));
  }
  const sort = (a: string, b: string) => {
    const na = Number(a),
      nb = Number(b);
    const an = !Number.isNaN(na),
      bn = !Number.isNaN(nb);
    if (an && bn) return na - nb;
    if (an) return -1;
    if (bn) return 1;
    return a.localeCompare(b);
  };
  missing.sort(sort);
  toPull.sort(sort);
  return { missing: missing.join(", "), toPull: toPull.join(", ") };
}

/* ---------- UI ---------- */
export function MissingTeethSimple({
  value,
  onChange,
}: {
  /** Must match ClaimFormData.missingTeeth exactly */
  value: MissingMapStrict;
  onChange: (next: MissingMapStrict) => void;
}) {
  // initialize text inputs from incoming map
  const init = React.useMemo(() => listsFromMap(value), []); // only on mount
  const [missingField, setMissingField] = React.useState(init.missing);
  const [pullField, setPullField] = React.useState(init.toPull);

  // only resync when parent CLEARS everything (so your Clear All works)
  React.useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      setMissingField("");
      setPullField("");
    }
  }, [value]);

  const recompute = (mStr: string, pStr: string) => {
    onChange(mapFromLists(mStr, pStr));
  };

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          {/* simple text label (no recharts Label) */}
          <div className="text-sm font-medium">Tooth Number - Missing - X</div>
          <Input
            placeholder="e.g. 1,2,A,B"
            value={missingField}
            onChange={(e) => {
              const m = e.target.value.toUpperCase(); // keep uppercase in the field
              setMissingField(m);
              recompute(m, pullField);
            }}
            aria-label="Tooth Numbers — Missing"
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">
            Tooth Number - To be pulled - O
          </div>
          <Input
            placeholder="e.g. 4,5,D"
            value={pullField}
            onChange={(e) => {
              const p = e.target.value.toUpperCase(); // keep uppercase in the field
              setPullField(p);
              recompute(missingField, p);
            }}
            aria-label="Tooth Numbers — To be pulled"
          />
        </div>
      </div>
    </div>
  );
}
