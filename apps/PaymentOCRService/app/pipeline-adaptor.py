import os
import tempfile
from typing import List, Dict
import pandas as pd

# Import your existing functions directly from complete_pipeline.py
from complete_pipeline import (
    smart_deskew_with_lines,
    extract_all_clients_from_lines,
)

def _process_single_image_bytes(blob: bytes, display_name: str) -> List[Dict]:
    """
    Saves bytes to a temp file (so OpenCV + Google Vision can read it),
    runs your existing pipeline functions, and returns extracted rows.
    """
    suffix = os.path.splitext(display_name)[1] or ".jpg"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(blob)
            tmp_path = tmp.name

        # Uses Google Vision + deskew + post-line grouping
        info = smart_deskew_with_lines(tmp_path, None, clamp_deg=30.0, use_vision=True)
        post_lines = info.get("post_lines", []) if info else []
        rows = extract_all_clients_from_lines(post_lines) if post_lines else []

        # Add source file information (same as your Streamlit app)
        for r in rows:
            r["Source File"] = display_name

        # If nothing parsed, still return a placeholder row to indicate failure (optional)
        if not rows:
            rows.append({
                'Patient Name': "", 'Patient ID': "", 'ICN': "", 'CDT Code': "",
                'Tooth': "", 'Date SVC': "",
                'Billed Amount': "", 'Allowed Amount': "", 'Paid Amount': "",
                'Extraction Success': False, 'Source File': display_name,
            })

        return rows

    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

def process_images_to_rows(blobs: List[bytes], filenames: List[str]) -> List[Dict]:
    """
    Public API used by FastAPI routes.
    blobs: list of image bytes
    filenames: matching names for display / Source File column
    """
    all_rows: List[Dict] = []
    for blob, name in zip(blobs, filenames):
        rows = _process_single_image_bytes(blob, name)
        all_rows.extend(rows)

    return all_rows

def rows_to_csv_bytes(rows: List[Dict]) -> bytes:
    """
    Convert pipeline rows to CSV bytes (for frontend to consume as a table).
    """
    df = pd.DataFrame(rows)
    # Keep a stable column order if present (mirrors your Excel order)
    desired = [
        'Patient Name', 'Patient ID', 'ICN', 'CDT Code', 'Tooth', 'Date SVC',
        'Billed Amount', 'Allowed Amount', 'Paid Amount',
        'Extraction Success', 'Source File'
    ]
    cols = [c for c in desired if c in df.columns] + [c for c in df.columns if c not in desired]
    df = df[cols]
    return df.to_csv(index=False).encode("utf-8")
