import axios from "axios";

export interface SeleniumPayload {
  claim: any;
  pdfs: {
    originalname: string;
    bufferBase64: string;
  }[];
}

export default async function forwardToSeleniumAgent(
  claimData: any,
  files: Express.Multer.File[]
): Promise<any> {
  const payload: SeleniumPayload = {
    claim: claimData,
    pdfs: files.map(file => ({
      originalname: file.originalname,
      bufferBase64: file.buffer.toString("base64"),
    })),
  };

  const response = await axios.post("http://localhost:5002/run", payload);
  return response.data;
}
