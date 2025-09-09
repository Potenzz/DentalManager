from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import fitz  # PyMuPDF
import re
import os

from dotenv import load_dotenv
load_dotenv() 

app = FastAPI()

# Optional: allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in production
    allow_methods=["*"],
    allow_headers=["*"],
)

DOB_RE = re.compile(r'(?<!\d)(\d{1,2})/(\d{1,2})/(\d{4})(?!\d)')
ID_RE  = re.compile(r'^\d{8,14}$')  # 8–14 digits, whole line

# lines that tell us we've moved past the name/DOB area
STOP_WORDS = {
    'eligibility', 'coverage', 'age band', 'date of', 'service',
    'tooth', 'number', 'surface', 'procedure', 'code', 'description',
    'provider', 'printed on', 'member id', 'name', 'date of birth'
}

@app.post("/extract")
async def extract(pdf: UploadFile = File(...)):
    if not pdf:
        raise HTTPException(status_code=400, detail="Missing 'pdf' file")

    content = await pdf.read()
    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to open PDF: {e}")
    
    # Extract text from all pages
    text = "\n".join(page.get_text("text") for page in doc)
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    member_id = ""
    name = ""
    dob = ""

    # 1) Find the first plausible member ID (8–14 digits)
    id_idx = -1
    for i, line in enumerate(lines):
        if ID_RE.match(line):
            member_id = line
            id_idx = i
            break

    if id_idx == -1:
        return {"memberId": "", "name": "", "dob": ""}

    # 2) Scan forward to collect name + DOB; handle both same-line and next-line cases
    collected = []
    j = id_idx + 1
    while j < len(lines):
        low = lines[j].lower()
        if any(sw in low for sw in STOP_WORDS):
            break
        collected.append(lines[j])
        # If we already found a DOB, we can stop early
        if DOB_RE.search(lines[j]):
            break
        j += 1

    # Flatten the collected chunk to search for a date (works if DOB is on same line or next)
    blob = " ".join(collected).strip()

    m = DOB_RE.search(blob)
    if m:
        dob = m.group(0)
        # name is everything before the date within the same blob
        name = blob[:m.start()].strip()
    else:
        # fallback: if we didn't find a date, assume first collected line(s) are name
        name = blob

    return {
        "memberId": member_id,
        "name": name,
        "dob": dob
    }

if __name__ == "__main__":
    host = os.getenv("HOST")
    port = int(os.getenv("PORT"))
    uvicorn.run(app, host=host, port=port)
