from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse, PlainTextResponse
from typing import List, Optional
import io
import os

from app.pipeline_adapter import (
    process_images_to_rows,
    rows_to_csv_bytes,
)

app = FastAPI(
    title="Medical Billing OCR API",
    description="FastAPI wrapper around the complete OCR pipeline (Google Vision + deskew + line clustering + extraction).",
    version="1.0.0",
)

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}

@app.get("/health", response_class=PlainTextResponse)
def health():
    # Simple sanity check (also ensures GCP creds var visibility)
    creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    return f"OK | GOOGLE_APPLICATION_CREDENTIALS set: {bool(creds)}"

@app.post("/extract/json")
async def extract_json(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    # Validate extensions early (not bulletproof, but helpful)
    bad = [f.filename for f in files if os.path.splitext(f.filename or "")[1].lower() not in ALLOWED_EXTS]
    if bad:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file types: {', '.join(bad)}. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    # Read blobs in-memory
    blobs = []
    filenames = []
    for f in files:
        blobs.append(await f.read())
        filenames.append(f.filename or "upload.bin")

    try:
        rows = process_images_to_rows(blobs, filenames)
        # rows is a list[dict] where each dict contains the columns you already emit (Patient Name, etc.)
        return JSONResponse(content={"rows": rows})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {e}")

@app.post("/extract/csv")
async def extract_csv(files: List[UploadFile] = File(...), filename: Optional[str] = None):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    bad = [f.filename for f in files if os.path.splitext(f.filename or "")[1].lower() not in ALLOWED_EXTS]
    if bad:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file types: {', '.join(bad)}. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    blobs = []
    filenames = []
    for f in files:
        blobs.append(await f.read())
        filenames.append(f.filename or "upload.bin")

    try:
        rows = process_images_to_rows(blobs, filenames)
        csv_bytes = rows_to_csv_bytes(rows)
        out_name = filename or "medical_billing_extract.csv"
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {e}")
