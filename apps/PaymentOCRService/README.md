# Medical Billing OCR API (FastAPI)

## 1) Prereqs
- Google Cloud Vision service-account JSON.
- `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to that JSON.
- Tesseract installed (for fallback OCR), and on PATH.

## 2) Install & run (local)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
uvicorn app.main:app --reload --port 8080
