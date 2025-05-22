import fitz  # PyMuPDF
import re

def extract_from_pdf(file_path):
    doc = fitz.open(file_path)
    text = "\n".join(page.get_text() for page in doc)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    member_id = ""
    name = ""
    dob = ""
                          
    for i, line in enumerate(lines):
        if line.isdigit() and (len(line) <= 14 or len(line) >= 8):
            member_id = line
            name_lines = []
            j = i + 1
            while j < len(lines) and not re.match(r"\d{1,2}/\d{1,2}/\d{4}", lines[j]):
                name_lines.append(lines[j])
                j += 1
            name = " ".join(name_lines).strip()

            if j < len(lines):
                dob = lines[j].strip()
            break

    return {
        "memberId": member_id,
        "name": name,
        "dob": dob
    }

if __name__ == "__main__":
    result = extract_from_pdf("PDF_To_Test/sample1.pdf")
    print(result)



