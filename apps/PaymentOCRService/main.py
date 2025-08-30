from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, PlainTextResponse
from typing import List, Optional
import io
import os
import asyncio

from dotenv import load_dotenv
load_dotenv() 

from complete_pipeline_adapter import process_images_to_rows,rows_to_csv_bytes

app = FastAPI(
    title="Payment OCR Services API",
    description="FastAPI wrapper around the OCR pipeline (Google Vision + deskew + line grouping + extraction).",
    version="1.0.0",
)

# Concurrency/semaphore (optional but useful for OCR)
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", "2"))
semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

active_jobs = 0
waiting_jobs = 0
lock = asyncio.Lock()

# CORS
cors_origins = os.getenv("CORS_ORIGINS", "*")
allow_origins = ["*"] if cors_origins.strip() == "*" else [o.strip() for o in cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}

# -------------------------------------------------
# Health + status
# -------------------------------------------------
@app.get("/health", response_class=PlainTextResponse)
def health():
    creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    return f"OK | GOOGLE_APPLICATION_CREDENTIALS set: {bool(creds)}"

@app.get("/status")
async def get_status():
    async with lock:
        return {
            "active_jobs": active_jobs,
            "queued_jobs": waiting_jobs,
            "max_concurrency": MAX_CONCURRENCY,
            "status": "busy" if active_jobs > 0 or waiting_jobs > 0 else "idle",
        }

# -------------------------------------------------
# Helpers
# -------------------------------------------------
def _validate_files(files: List[UploadFile]):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    bad = [f.filename for f in files if os.path.splitext(f.filename or "")[1].lower() not in ALLOWED_EXTS]
    if bad:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file types: {', '.join(bad)}. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"
        )

# -------------------------------------------------
# Endpoints
# -------------------------------------------------
@app.post("/extract/json")
async def extract_json(files: List[UploadFile] = File(...)):
    _validate_files(files)

    async with lock:
        global waiting_jobs
        waiting_jobs += 1

    async with semaphore:
        async with lock:
            waiting_jobs -= 1
            global active_jobs
            active_jobs += 1

        try:
            blobs = [await f.read() for f in files]
            names = [f.filename or "upload.bin" for f in files]
            rows = process_images_to_rows(blobs, names)  # calls pipeline
            return JSONResponse(content={"rows": rows})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing error: {e}")
        finally:
            async with lock:
                active_jobs -= 1

@app.post("/extract/csvtext", response_class=PlainTextResponse)
async def extract_csvtext(files: List[UploadFile] = File(...)):
    _validate_files(files)

    async with lock:
        global waiting_jobs
        waiting_jobs += 1

    async with semaphore:
        async with lock:
            waiting_jobs -= 1
            global active_jobs
            active_jobs += 1

        try:
            blobs = [await f.read() for f in files]
            names = [f.filename or "upload.bin" for f in files]
            rows = process_images_to_rows(blobs, names)
            csv_bytes = rows_to_csv_bytes(rows)
            return PlainTextResponse(csv_bytes.decode("utf-8"), media_type="text/csv")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing error: {e}")
        finally:
            async with lock:
                active_jobs -= 1

@app.post("/extract/csv")
async def extract_csv(files: List[UploadFile] = File(...), filename: Optional[str] = None):
    _validate_files(files)

    async with lock:
        global waiting_jobs
        waiting_jobs += 1

    async with semaphore:
        async with lock:
            waiting_jobs -= 1
            global active_jobs
            active_jobs += 1

        try:
            blobs = [await f.read() for f in files]
            names = [f.filename or "upload.bin" for f in files]
            rows = process_images_to_rows(blobs, names)
            csv_bytes = rows_to_csv_bytes(rows)
            out_name = filename or "medical_billing_extract.csv"
            return StreamingResponse(
                io.BytesIO(csv_bytes),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing error: {e}")
        finally:
            async with lock:
                active_jobs -= 1

# -------------------------------------------------
# Entrypoint (same pattern as your selenium app)
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST")
    port = int(os.getenv("PORT"))
    reload_flag = os.getenv("RELOAD", "false").lower() == "true"
    uvicorn.run(app, host=host, port=port, reload=reload_flag)
