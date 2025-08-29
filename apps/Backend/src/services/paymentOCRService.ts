import axios from "axios";
import FormData from "form-data";

export async function forwardToPaymentOCRService(
  files: Express.Multer.File | Express.Multer.File[]
): Promise<any> {
  const arr = Array.isArray(files) ? files : [files];

  const form = new FormData();
  for (const f of arr) {
    form.append("files", f.buffer, {
      filename: f.originalname,
      contentType: f.mimetype, // image/jpeg, image/png, image/tiff, etc.
      knownLength: f.size,
    });
  }

  const url = `http://localhost:5003/extract/json`;

  try {
    const resp = await axios.post<{ rows: any }>(url, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000, // OCR can be heavy; adjust as needed
    });
    return resp.data?.rows ?? [];
  } catch (err: any) {
    // Bubble up a useful error message
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail || err?.message || "Unknown error";
    throw new Error(`Payment OCR request failed${status ? ` (${status})` : ""}: ${detail}`);
  }
}
