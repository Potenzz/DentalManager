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
        result = bot.main_workflow_upto_step2("https://abc.com/providers_login.asp")
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Endpoint: Step 2 — Extract the PDF content after manual submission
@app.post("/fetch-pdf")
async def fetch_pdf():
    try:
        bot = AutomationMassHealth().get_last_instance()
        pdf_data = bot.reach_to_pdf()

        if not pdf_data:
            return {"status": "error", "message": "Failed to fetch PDF"}
        return {"status": "success", "pdf_data": pdf_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
