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
        result = bot.main_workflow("https://providers.massdhp.com/providers_login.asp")

        if result.get("status") != "success":
            return {"status": "error", "message": result.get("message")}
        
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
