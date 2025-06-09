import axios from "axios";

export interface SeleniumPayload {
  claim: any;
  pdfs: {
    originalname: string;
    bufferBase64: string;
  }[];
}

export async function forwardToSeleniumAgent(
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

  const response = await axios.post("http://localhost:5002/start-workflow", payload);
  return response.data;
}

export async function forwardToSeleniumAgent2(
): Promise<any> {

  const response = await axios.post("http://localhost:5002/fetch-pdf");
  return response.data;
}
