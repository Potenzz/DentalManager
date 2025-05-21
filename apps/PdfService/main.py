from flask import Flask, request, jsonify
import fitz  # PyMuPDF
import re

app = Flask(__name__)

@app.route("/extract", methods=["POST"])
def extract():
    file = request.files['pdf']
    doc = fitz.open(stream=file.read(), filetype="pdf")
    text = "".join(page.get_text() for page in doc)

    name = re.search(r"Name:\s*(.*)", text)
    email = re.search(r"Email:\s*(.*)", text)

    return jsonify({
        "text": text,
        "name": name.group(1).strip() if name else "",
        "email": email.group(1).strip() if email else ""
    })

if __name__ == "__main__":
    app.run(port=5001)
