import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export interface SeleniumPayload {
  data: any;
  url?: string;
}

const SELENIUM_AGENT_BASE =
  process.env.SELENIUM_AGENT_BASE_URL;

export async function forwardToSeleniumDdmaEligibilityAgent(
  insuranceEligibilityData: any,
): Promise<any> {
  const payload: SeleniumPayload = {
    data: insuranceEligibilityData,
  };

  const url = `${SELENIUM_AGENT_BASE}/ddma-eligibility`;
  console.log(url)
  const result = await axios.post(
    `${SELENIUM_AGENT_BASE}/ddma-eligibility`,
    payload,
    { timeout: 5 * 60 * 1000 }
  );

  if (!result || !result.data) {
    throw new Error("Empty response from selenium agent");
  }

  if (result.data.status === "error") {
    const errorMsg =
      typeof result.data.message === "string"
        ? result.data.message
        : result.data.message?.msg || "Selenium agent error";
    throw new Error(errorMsg);
  }

  return result.data; // { status: "started", session_id }
}

export async function forwardOtpToSeleniumDdmaAgent(
  sessionId: string,
  otp: string
): Promise<any> {
  const result = await axios.post(`${SELENIUM_AGENT_BASE}/submit-otp`, {
    session_id: sessionId,
    otp,
  });

  if (!result || !result.data) throw new Error("Empty OTP response");
  if (result.data.status === "error") {
    const message =
      typeof result.data.message === "string"
        ? result.data.message
        : JSON.stringify(result.data);
    throw new Error(message);
  }

  return result.data;
}

export async function getSeleniumDdmaSessionStatus(
  sessionId: string
): Promise<any> {
  const result = await axios.get(
    `${SELENIUM_AGENT_BASE}/session/${sessionId}/status`
  );
  if (!result || !result.data) throw new Error("Empty session status");
  return result.data;
}
