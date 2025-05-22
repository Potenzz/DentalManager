import axios from "axios";
import FormData from "form-data";
import { Express } from "express";

export interface ExtractedData {
  name?: string;
  memberId?: string;
  dob?: string;
  [key: string]: any; 
}

export default async function forwardToPythonService(
  file: Express.Multer.File
): Promise<ExtractedData> {
  const form = new FormData();
  form.append("pdf", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  const response = await axios.post<ExtractedData>(
    "http://localhost:5001/extract",
    form,
    {
      headers: form.getHeaders(),
    }
  );

  return response.data;
}
