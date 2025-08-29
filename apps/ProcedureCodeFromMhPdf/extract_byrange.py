#!/usr/bin/env python3
"""
MassHealth dental PDF parser (PyMuPDF / fitz) — PAGE RANGE VERSION

Parses rows like:

D2160
Amalgam-three surfaces,
primary or permanent
$110
$92
Y
Y
...

Outputs a single JSON with records from the chosen page range (inclusive).

Config:
- PDF_PATH: path to the PDF
- PAGE_START, PAGE_END: 1-based page numbers (inclusive)
- FIRST_PRICE_IS_LTE21: True => first price line is <=21; False => first price is >21
- OUT_PATH: output JSON path
"""

import re
import json
from typing import List, Dict
import fitz  # PyMuPDF


# =========================
# CONFIG — EDIT THESE ONLY
# =========================
PDF_PATH = "MH.pdf"   # path to your PDF
PAGE_START = 1                # 1-based inclusive start page (e.g., 1)
PAGE_END   = 12               # 1-based inclusive end page   (e.g., 5)
OUT_PATH = "output.json"      # single JSON file containing all parsed rows
FIRST_PRICE_IS_LTE21 = True   # True => first price line is <=21; False => first price is >21
PRINT_PAGE_TEXT = False       # set True to print raw text for each page
# =========================


# --- patterns ---
code_line_re = re.compile(r"^\s*(D\d{4})\s*$")
# a price token is either '$123', '$1,234.50', '123', '123.45', or 'NC'
price_line_re = re.compile(r"^\s*(?:\$\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?|NC)\s*$", re.IGNORECASE)
# lines that definitely start a notes block to ignore once prices are done
note_starters_re = re.compile(r"^(Teeth\b|One of\b|--|—|–|Age limitation:|CR\b)", re.IGNORECASE)


def normalize_ws(s: str) -> str:
    s = s.replace("\u00a0", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\s*\n\s*", " ", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip(" ,.;:-•·\n\t")


def clean_money(token: str) -> str:
    if token.upper() == "NC":
        return "NC"
    return token.replace(",", "").lstrip("$").strip()


def get_page_lines(pdf_path: str, page_start_1b: int, page_end_1b: int) -> List[str]:
    if page_start_1b <= 0 or page_end_1b <= 0:
        raise ValueError("PAGE_START and PAGE_END must be >= 1 (1-based).")
    if page_start_1b > page_end_1b:
        raise ValueError("PAGE_START cannot be greater than PAGE_END.")

    doc = fitz.open(pdf_path)
    try:
        last_idx_0b = len(doc) - 1
        # convert to 0-based inclusive range
        start_0b = page_start_1b - 1
        end_0b = page_end_1b - 1
        if start_0b < 0 or end_0b > last_idx_0b:
            raise ValueError(f"Page range out of bounds. Valid 1-based range is 1..{last_idx_0b + 1}.")
        lines: List[str] = []
        for p in range(start_0b, end_0b + 1):
            text = doc.load_page(p).get_text("text") or ""
            if PRINT_PAGE_TEXT:
                print(f"\n--- RAW PAGE {p} (0-based; shown as {p+1} 1-based) ---\n{text}")
            lines.extend(text.splitlines())
        return lines
    finally:
        doc.close()


def extract_records(lines: List[str]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i].strip()

        # seek a code line
        mcode = code_line_re.match(line)
        if not mcode:
            i += 1
            continue

        code = mcode.group(1)
        i += 1

        # gather description lines until we encounter price lines
        desc_lines: List[str] = []
        # skip blank lines before description
        while i < n and not lines[i].strip():
            i += 1

        # collect description lines (usually 1–3) until first price token
        # stop also if we accidentally hit another code (defensive)
        j = i
        while j < n:
            s = lines[j].strip()
            if not s:
                break
            if code_line_re.match(s):
                # next code — description ended abruptly (malformed)
                break
            if price_line_re.match(s):
                # reached price section
                break
            if note_starters_re.match(s):
                # encountered a note before price — treat as end of description; prices may be missing
                break
            desc_lines.append(s)
            j += 1

        # advance i to where we left off
        i = j

        description = normalize_ws(" ".join(desc_lines))

        # collect up to two price tokens
        prices: List[str] = []
        while i < n and len(prices) < 2:
            s = lines[i].strip()
            if not s:
                i += 1
                continue
            if code_line_re.match(s):
                # new record — stop; this means we never got prices (malformed)
                break
            mprice = price_line_re.match(s)
            if mprice:
                prices.append(clean_money(mprice.group(1)))
                i += 1
                continue
            # if we encounter a note/flags block, skip forward until a blank or next code
            if note_starters_re.match(s) or s in {"Y", "NC"}:
                i += 1
                while i < n:
                    t = lines[i].strip()
                    if not t or code_line_re.match(t):
                        break
                    i += 1
                continue
            # unrecognized line: if we already captured some prices, break; else skip
            if prices:
                break
            i += 1

        if len(prices) < 2:
            # couldn't find 2 prices reliably; skip this record
            continue

        if FIRST_PRICE_IS_LTE21:
            price_lte21, price_gt21 = prices[0], prices[1]
        else:
            price_lte21, price_gt21 = prices[1], prices[0]

        out.append(
            {
                "Procedure Code": code,
                "Description": description,
                "PriceLTEQ21": price_lte21,
                "PriceGT21": price_gt21,
            }
        )

        # after prices, skip forward until next code or blank block end
        while i < n:
            s = lines[i].strip()
            if not s:
                i += 1
                break
            if code_line_re.match(s):
                break
            i += 1

    return out


def extract_pdf_range_to_json(pdf_path: str, page_start_1b: int, page_end_1b: int, out_path: str) -> List[Dict[str, str]]:
    lines = get_page_lines(pdf_path, page_start_1b, page_end_1b)
    data = extract_records(lines)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return data


if __name__ == "__main__":
    data = extract_pdf_range_to_json(PDF_PATH, PAGE_START, PAGE_END, OUT_PATH)
    print(f"Wrote {len(data)} rows to {OUT_PATH}")
    print(json.dumps(data, ensure_ascii=False, indent=2))
