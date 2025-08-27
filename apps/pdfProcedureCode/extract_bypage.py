import re
import json
from typing import List, Dict
import fitz  # PyMuPDF


# =========================
# CONFIG — EDIT THESE ONLY
# =========================
PDF_PATH = "MH.pdf"   # path to your PDF
PAGES = [2]                   # 0-based page indexes to parse, e.g., [2] for the page you showed
OUT_PATH = "output.json"      # where to write JSON
FIRST_PRICE_IS_LTE21 = True   # True => first price line is <=21; False => first price is >21
PRINT_PAGE_TEXT = False       # set True if you want to print the raw page text for sanity check
# =========================


# --- patterns ---
code_line_re = re.compile(r"^\s*(D\d{4})\s*$")
# a price token is either '$123', '$1,234.50', '123', '123.45', or 'NC'
price_line_re = re.compile(r"^\s*(?:\$\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?|NC)\s*$", re.IGNORECASE)
# lines that definitely start a notes block we should ignore once prices are done
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


def get_page_lines(pdf_path: str, pages: List[int]) -> List[str]:
    doc = fitz.open(pdf_path)
    try:
        max_idx = len(doc) - 1
        for p in pages:
            if p < 0 or p > max_idx:
                raise ValueError(f"Invalid page index {p}. Valid range is 0..{max_idx}.")
        lines: List[str] = []
        for p in pages:
            text = doc.load_page(p).get_text("text") or ""
            if PRINT_PAGE_TEXT:
                print(f"\n--- RAW PAGE {p} ---\n{text}")
            # keep line boundaries; later we parse line-by-line
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
                # blank line inside description — consider description ended if the next is a price
                # but we don't advance here; break and let price parsing handle it
                break
            if code_line_re.match(s):
                # next code — no prices found; abandon this broken record
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
            # if we encounter a note/flags block, skip forward until the next code/blank
            if note_starters_re.match(s) or s in {"Y", "NC"}:
                # skip this block quickly
                i += 1
                # keep skipping subsequent non-empty, non-code lines until a blank or next code
                while i < n:
                    t = lines[i].strip()
                    if not t or code_line_re.match(t):
                        break
                    i += 1
                # now let the outer loop proceed
                continue
            # unrecognized line: if prices already found, we can break; else skip
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
                # next record will pick this up
                break
            i += 1

    return out


def extract_pdf_to_json(pdf_path: str, pages: List[int], out_path: str) -> List[Dict[str, str]]:
    lines = get_page_lines(pdf_path, pages)
    data = extract_records(lines)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return data


if __name__ == "__main__":
    data = extract_pdf_to_json(PDF_PATH, PAGES, OUT_PATH)
    print(f"Wrote {len(data)} rows to {OUT_PATH}")
    print(json.dumps(data, ensure_ascii=False, indent=2))
