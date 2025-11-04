import axios from "axios";

export interface SeleniumPayload {
  claim: any;
  pdfs: {
    originalname: string;
    bufferBase64: string;
  }[];
  images: {
    originalname: string;
    bufferBase64: string;
  }[];
}

export async function forwardToSeleniumClaimPreAuthAgent(
  claimData: any,
  files: Express.Multer.File[]
): Promise<any> {
  const pdfs = files
    .filter((file) => file.mimetype === "application/pdf")
    .map((file) => ({
      originalname: file.originalname,
      bufferBase64: file.buffer.toString("base64"),
    }));

  const images = files
    .filter((file) => file.mimetype.startsWith("image/"))
    .map((file) => ({
      originalname: file.originalname,
      bufferBase64: file.buffer.toString("base64"),
    }));

  const payload: SeleniumPayload = {
    claim: claimData,
    pdfs,
    images,
  };

  const result = await axios.post(
    "http://localhost:5002/claim-pre-auth",
    payload
  );
  if (result.data.status === "error") {
    const errorMsg =
      typeof result.data.message === "string"
        ? result.data.message
        : result.data.message?.msg || "Selenium agent error";
    throw new Error(errorMsg);
  }

  return result.data;
}
