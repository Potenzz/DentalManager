from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
from selenium_claimSubmitWorker import AutomationMassHealth
from selenium_eligibilityCheckWorker import AutomationMassHealthEligibilityCheck
from selenium_claimStatusCheckWorker import AutomationMassHealthClaimStatusCheck
import os

from dotenv import load_dotenv
load_dotenv() 

app = FastAPI()
# Allow 1 selenium session at a time
semaphore = asyncio.Semaphore(1)

# Manual counters to track active & queued jobs
active_jobs = 0
waiting_jobs = 0
lock = asyncio.Lock()  # To safely update counters


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend domain for security
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint: Step 1 — Start the automation of submitting Claim.
@app.post("/claimsubmit")
async def start_workflow(request: Request):
    global active_jobs, waiting_jobs
    data = await request.json()

    async with lock:
        waiting_jobs += 1

    async with semaphore: 
        async with lock:
            waiting_jobs -= 1
            active_jobs += 1

        try:
            bot = AutomationMassHealth(data)
            result = bot.main_workflow("https://providers.massdhp.com/providers_login.asp")

            if result.get("status") != "success":
                return {"status": "error", "message": result.get("message")}
            
            return result
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            async with lock:
                active_jobs -= 1
    
# Endpoint: Step 2 — Start the automation of cheking eligibility
@app.post("/eligibility-check")
async def start_workflow(request: Request):
    global active_jobs, waiting_jobs
    data = await request.json()

    async with lock:
        waiting_jobs += 1

    async with semaphore:
        async with lock:
            waiting_jobs -= 1
            active_jobs += 1
        try:
            bot = AutomationMassHealthEligibilityCheck(data)
            result = bot.main_workflow("https://providers.massdhp.com/providers_login.asp")

            if result.get("status") != "success":
                return {"status": "error", "message": result.get("message")}
            
            return result
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            async with lock:
                active_jobs -= 1
    
# Endpoint: Step 3 — Start the automation of cheking claim status
@app.post("/claim-status-check")
async def start_workflow(request: Request):
    global active_jobs, waiting_jobs
    data = await request.json()

    async with lock:
        waiting_jobs += 1

    async with semaphore:
        async with lock:
            waiting_jobs -= 1
            active_jobs += 1
        try:
            bot = AutomationMassHealthClaimStatusCheck(data)
            result = bot.main_workflow("https://providers.massdhp.com/providers_login.asp")

            if result.get("status") != "success":
                return {"status": "error", "message": result.get("message")}
            
            return result
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            async with lock:
                active_jobs -= 1

# ✅ Status Endpoint
@app.get("/status")
async def get_status():
    async with lock:
        return {
            "active_jobs": active_jobs,
            "queued_jobs": waiting_jobs,
            "status": "busy" if active_jobs > 0 or waiting_jobs > 0 else "idle"
        }

if __name__ == "__main__":
    host = os.getenv("HOST")
    port = int(os.getenv("PORT"))
    uvicorn.run(app, host=host, port=port)
