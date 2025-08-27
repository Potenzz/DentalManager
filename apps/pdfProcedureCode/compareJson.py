#!/usr/bin/env python3
"""
Compare a main dental JSON file with one or more other JSON files and
return all records whose 'Procedure Code' is NOT present in the main file.

- Matching key: 'Procedure Code' (case-insensitive, trimmed).
- Keeps the full record from the other files (including extra fields like 'Full Price').
- Deduplicates by Procedure Code across the collected "missing" results.

CONFIG: set MAIN_PATH, OTHER_PATHS, OUT_PATH below.
"""

import json
from pathlib import Path
from typing import List, Dict, Any

# =========================
# CONFIG — EDIT THESE ONLY
# =========================
MAIN_PATH = "procedureCodesMain.json"  # your main JSON (with PriceLTEQ21/PriceGT21)
OTHER_PATHS = [
    "procedureCodesOld.json",       # one or more other JSON files to compare against the main
    # "other2.json",
]
OUT_PATH = "not_in_main.json"  # where to write the results
# =========================


def _load_json_any(path: str) -> List[Dict[str, Any]]:
    """
    Load JSON. Accept:
      - a list of objects
      - a single object (wraps into a list)
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        # filter out non-dict items defensively
        return [x for x in data if isinstance(x, dict)]
    raise ValueError(f"Unsupported JSON top-level type in {path}: {type(data)}")


def _norm_code(record: Dict[str, Any]) -> str:
    # Normalize the 'Procedure Code' for matching
    code = str(record.get("Procedure Code", "")).strip().upper()
    # Some PDFs might have stray spaces, tabs, or zero-width chars
    code = "".join(ch for ch in code if not ch.isspace())
    return code


def collect_main_codes(main_path: str) -> set:
    main_items = _load_json_any(main_path)
    codes = {_norm_code(rec) for rec in main_items if _norm_code(rec)}
    return codes


def collect_missing_records(other_paths: List[str], main_codes: set) -> List[Dict[str, Any]]:
    missing: Dict[str, Dict[str, Any]] = {}  # map normalized code -> record
    for p in other_paths:
        items = _load_json_any(p)
        for rec in items:
            code_norm = _norm_code(rec)
            if not code_norm:
                continue
            if code_norm not in main_codes and code_norm not in missing:
                # Keep the full original record
                missing[code_norm] = rec
    # return in a stable, sorted order by code
    return [missing[k] for k in sorted(missing.keys())]


def main():
    # Validate files exist
    if not Path(MAIN_PATH).exists():
        raise FileNotFoundError(f"Main file not found: {MAIN_PATH}")
    for p in OTHER_PATHS:
        if not Path(p).exists():
            raise FileNotFoundError(f"Other file not found: {p}")

    main_codes = collect_main_codes(MAIN_PATH)
    missing_records = collect_missing_records(OTHER_PATHS, main_codes)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(missing_records, f, ensure_ascii=False, indent=2)

    print(f"Main codes: {len(main_codes)}")
    print(f"Missing from main: {len(missing_records)}")
    print(f"Wrote results to {OUT_PATH}")
    # Also echo to stdout
    print(json.dumps(missing_records, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
