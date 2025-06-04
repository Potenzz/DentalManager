from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from selenium_worker import AutomationMassDHP

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend domain for security
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/run")
async def run_bot(request: Request):
    data = await request.json()
    try:
        bot = AutomationMassDHP(data)
        result = bot.main_workflow("https://providers.massdhp.com/providers_login.asp")
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
