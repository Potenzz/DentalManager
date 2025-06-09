from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from selenium_worker import AutomationMassHealth

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend domain for security
    allow_methods=["*"],
    allow_headers=["*"],
)


# Endpoint: Step 1 — Start the automation
@app.post("/start-workflow")
async def start_workflow(request: Request):
    data = await request.json()
    try:
        bot = AutomationMassHealth(data)
        result = bot.main_workflow_upto_step2("https://providers.massdhp.com/providers_login.asp")
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Endpoint: Step 2 — Extract the PDF content after manual submission
@app.post("/fetch-pdf")
async def fetch_pdf():
    try:
        bot = AutomationMassHealth.get_last_instance()
        if not bot:
            return {"status": "error", "message": "No running automation session"}
        
        pdf_data = bot.reach_to_pdf()
        if pdf_data.get("status") != "success":
            return {"status": "error", "message": pdf_data.get("message")}

        return {
            "status": "success",
            "pdf_url": pdf_data["pdf_url"],
            "pdf_base64": pdf_data["pdf_bytes"]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
