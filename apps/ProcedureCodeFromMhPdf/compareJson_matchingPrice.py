#!/usr/bin/env python3
"""
Compare prices between two JSON files (file1 vs file2) — CONFIG-DRIVEN version.

Behavior:
- Loads two JSON arrays of records (file1 and file2).
- Indexes by procedure code (tries common keys like "Procedure Code", "Code", etc).
- Normalizes money tokens: removes $ and commas, treats "NC" as literal.
- Compares all three price fields:
    - Price
    - PriceLTEQ21
    - PriceGT21
  Matching rules:
    - If both records have the same named field, compare them.
    - If file1 has only a single "Price" and file2 has PriceLTEQ21 / PriceGT21,
      the script will compare file1.Price to BOTH PriceLTEQ21 and PriceGT21 (and
      report mismatch if file1.Price differs from either).
    - "NC" only equals "NC".
    - Numeric tokens compared numerically within tolerance (default 0.005).
- Produces output JSON (configured below) listing:
    - mismatches: detailed entries for codes that differ
    - only_in_file1: codes found only in file1
    - only_in_file2: codes found only in file2
    - summary

Edit the CONFIG block below, then run the script.
"""

import json
import re
from typing import List, Dict, Any, Optional

# =========================
# CONFIG — EDIT THESE ONLY
# =========================
FILE1_PATH = "procedureCodes_v2.json"         # path to file 1 (your base/reference file)
FILE2_PATH = "output.json"         # path to file 2 (the file to compare)
OUT_PATH = "price_diffs.json"     # output JSON writing mismatches
TOLERANCE = 0.005                 # numeric tolerance for floats
CODE_KEY_CANDIDATES = ("Procedure Code", "Code", "procedure_code", "procedure code")
# If True: when file1 has single "Price" and file2 has both LTEQ/GT values,
# compare file1.Price against both fields and flag mismatch if either differs.
COMPARE_SINGLE_PRICE_AGAINST_BOTH = True
# =========================

_money_re = re.compile(r"^\s*(NC|\$?\s*[\d,]+(?:\.\d{1,2})?)\s*$", re.IGNORECASE)


def normalize_money_token(token: Optional[str]) -> Optional[str]:
    """Normalize money token to canonical string or 'NC'. Return None if missing/empty."""
    if token is None:
        return None
    t = str(token).strip()
    if not t:
        return None
    m = _money_re.match(t)
    if not m:
        # unknown format — return trimmed token so mismatch is visible
        return t
    val = m.group(1)
    if val.upper() == "NC":
        return "NC"
    val = val.replace("$", "").replace(",", "").strip()
    # Remove trailing zeros from decimals, but preserve integer form
    if "." in val:
        val = val.rstrip("0").rstrip(".")
    return val


def numeric_compare(a: Optional[str], b: Optional[str], tol: float = TOLERANCE) -> bool:
    """Compare normalized tokens. NC compares only equal to NC. Otherwise numeric compare."""
    if a is None or b is None:
        return False
    if a == b:
        return True
    if a.upper() == "NC" or b.upper() == "NC":
        return a.upper() == b.upper()
    try:
        return abs(float(a) - float(b)) <= tol
    except Exception:
        # fallback to exact match if non-numeric
        return a == b


def load_json(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array in {path}")
    return data


def build_index(records: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Index records by procedure code. First match wins for duplicates."""
    idx: Dict[str, Dict[str, Any]] = {}
    for rec in records:
        code = None
        for k in CODE_KEY_CANDIDATES:
            if k in rec and rec[k]:
                code = str(rec[k]).strip()
                break
        if not code:
            # try to find any field with a Dxxxx-like value
            for v in rec.values():
                if isinstance(v, str) and re.match(r"^\s*D\d{4}\s*$", v):
                    code = v.strip()
                    break
        if not code:
            continue
        if code in idx:
            # duplicate: keep first occurrence
            continue
        idx[code] = rec
    return idx


def extract_price_fields(rec: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """
    Return dict with normalized values for 'Price', 'PriceLTEQ21', and 'PriceGT21'.
    Keys always present with None when missing.
    """
    return {
        "Price": normalize_money_token(rec.get("Price")),
        "PriceLTEQ21": normalize_money_token(rec.get("PriceLTEQ21")),
        "PriceGT21": normalize_money_token(rec.get("PriceGT21")),
    }


def compare_code_records(code: str, rec1: Dict[str, Any], rec2: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Compare price fields for a single code. Return mismatch dict if any mismatch present, else None.
    Mismatch dict includes file1/file2 price fields and per-field mismatch details.
    """
    p1 = extract_price_fields(rec1)
    p2 = extract_price_fields(rec2)

    mismatches = []

    # 1) Compare same-named fields if both present
    for key in ("Price", "PriceLTEQ21", "PriceGT21"):
        a = p1.get(key)
        b = p2.get(key)
        if a is None and b is None:
            continue
        if a is None or b is None:
            # present in one but not the other: count as mismatch
            mismatches.append({"field": key, "file1": a, "file2": b, "reason": "missing_in_one"})
            continue
        if not numeric_compare(a, b):
            mismatches.append({"field": key, "file1": a, "file2": b, "reason": "value_mismatch"})

    # 2) Special-case: if file1 has only single Price, and file2 has LTEQ/GT present,
    #    optionally compare file1.Price against each of them.
    if COMPARE_SINGLE_PRICE_AGAINST_BOTH:
        # Only apply if file1.Price exists and file1 does NOT have LTEQ/GT (both None),
        # but file2 has at least one of LTEQ/GT.
        file1_has_price = p1.get("Price") is not None
        file1_has_any_special = (p1.get("PriceLTEQ21") is not None) or (p1.get("PriceGT21") is not None)
        file2_has_any_special = (p2.get("PriceLTEQ21") is not None) or (p2.get("PriceGT21") is not None)
        if file1_has_price and (not file1_has_any_special) and file2_has_any_special:
            # compare file1.Price to each present file2 special price
            left = p1.get("Price")
            for special_key in ("PriceLTEQ21", "PriceGT21"):
                right = p2.get(special_key)
                if right is None:
                    continue
                # If already recorded a same-named mismatch for this special_key above,
                # that mismatch covered the case where file1 was missing that named field.
                # But since file1 lacked that special field, we still want to compare single Price vs special.
                if not numeric_compare(left, right):
                    mismatches.append({
                        "field": f"Price_vs_{special_key}",
                        "file1": left,
                        "file2": right,
                        "reason": "single_price_vs_special_mismatch"
                    })

    if mismatches:
        return {
            "Procedure Code": code,
            "Description_file1": rec1.get("Description"),
            "Description_file2": rec2.get("Description"),
            "file1_prices": p1,
            "file2_prices": p2,
            "mismatches": mismatches
        }
    return None


def main():
    # load inputs
    data1 = load_json(FILE1_PATH)
    data2 = load_json(FILE2_PATH)

    idx1 = build_index(data1)
    idx2 = build_index(data2)

    codes_all = sorted(set(list(idx1.keys()) + list(idx2.keys())))

    mismatched: List[Dict[str, Any]] = []
    only_in_file1: List[str] = []
    only_in_file2: List[str] = []

    for code in codes_all:
        rec1 = idx1.get(code)
        rec2 = idx2.get(code)
        if rec1 is None:
            only_in_file2.append(code)
            continue
        if rec2 is None:
            only_in_file1.append(code)
            continue
        diff = compare_code_records(code, rec1, rec2)
        if diff:
            mismatched.append(diff)

    out = {
        "summary": {
            "total_codes_found": len(codes_all),
            "only_in_file1_count": len(only_in_file1),
            "only_in_file2_count": len(only_in_file2),
            "mismatched_count": len(mismatched),
        },
        "only_in_file1": only_in_file1,
        "only_in_file2": only_in_file2,
        "mismatches": mismatched
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # brief console summary
    print(f"Compared {len(codes_all)} procedure codes.")
    print(f"Only in {FILE1_PATH}: {len(only_in_file1)} codes.")
    print(f"Only in {FILE2_PATH}: {len(only_in_file2)} codes.")
    print(f"Mismatched prices: {len(mismatched)} codes.")
    print(f"Wrote detailed diffs to {OUT_PATH}")


if __name__ == "__main__":
    main()
