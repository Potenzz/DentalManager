from flask import Flask, request, jsonify
import fitz  # PyMuPDF
import re

app = Flask(__name__)

DOB_RE = re.compile(r'(?<!\d)(\d{1,2})/(\d{1,2})/(\d{4})(?!\d)')
ID_RE  = re.compile(r'^\d{8,14}$')  # 8–14 digits, whole line

# lines that tell us we've moved past the name/DOB area
STOP_WORDS = {
    'eligibility', 'coverage', 'age band', 'date of', 'service',
    'tooth', 'number', 'surface', 'procedure', 'code', 'description',
    'provider', 'printed on', 'member id', 'name', 'date of birth'
}

@app.route("/extract", methods=["POST"])
def extract():
    file = request.files['pdf']
    doc = fitz.open(stream=file.read(), filetype="pdf")
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
        return jsonify({"memberId": "", "name": "", "dob": ""})

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

    return jsonify({
        "memberId": member_id,
        "name": name,
        "dob": dob
    })

if __name__ == "__main__":
    app.run(port=5001)
