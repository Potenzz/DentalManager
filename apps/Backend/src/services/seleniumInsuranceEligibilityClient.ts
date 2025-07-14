import axios from "axios";

export interface SeleniumPayload {
  data: any;
}

export async function forwardToSeleniumInsuranceEligibilityAgent(
  insuranceEligibilityData: any
): Promise<any> {
  const payload: SeleniumPayload = {
    data: insuranceEligibilityData,
  };

  const result = await axios.post(
    "http://localhost:5002/eligibility-check",
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
