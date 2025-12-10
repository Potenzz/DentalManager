import os
import time
import asyncio
from typing import Dict, Any
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException
import pickle

from selenium_DDMA_eligibilityCheckWorker import AutomationDeltaDentalMAEligibilityCheck

# In-memory session store
sessions: Dict[str, Dict[str, Any]] = {}

SESSION_OTP_TIMEOUT = int(os.getenv("SESSION_OTP_TIMEOUT", "120"))  # seconds


def make_session_entry() -> str:
    """Create a new session entry and return its ID."""
    import uuid
    sid = str(uuid.uuid4())
    sessions[sid] = {
        "status": "created",     # created -> running -> waiting_for_otp -> otp_submitted -> completed / error
        "created_at": time.time(),
        "last_activity": time.time(),
        "bot": None,             # worker instance
        "driver": None,          # selenium webdriver
        "otp_event": asyncio.Event(),
        "otp_value": None,
        "result": None,
        "message": None,
        "type": None,
    }
    return sid


async def cleanup_session(sid: str, message: str | None = None):
    """
    Close driver (if any), wake OTP waiter, set final state, and remove session entry.
    Idempotent: safe to call multiple times.
    """
    s = sessions.get(sid)
    if not s:
        return
    try:
        # Ensure final state
        try:
            if s.get("status") not in ("completed", "error", "not_found"):
                s["status"] = "error"
            if message:
                s["message"] = message
        except Exception:
            pass

        # Wake any OTP waiter (so awaiting coroutines don't hang)
        try:
            ev = s.get("otp_event")
            if ev and not ev.is_set():
                ev.set()
        except Exception:
            pass

        # Attempt to quit driver (may already be dead)
        driver = s.get("driver")
        if driver:
            try:
                driver.quit()
            except Exception:
                # ignore errors from quit (session already gone)
                pass

    finally:
        # Remove session entry from map
        sessions.pop(sid, None)
        print(f"[helpers] cleaned session {sid}")

async def _remove_session_later(sid: str, delay: int = 20):
    await asyncio.sleep(delay)
    await cleanup_session(sid)


async def start_ddma_run(sid: str, data: dict, url: str):
    """
    Run the DDMA workflow for a session (WITHOUT managing semaphore/counters).
    Called by agent.py inside a wrapper that handles queue/counters.
    """
    s = sessions.get(sid)
    if not s:
        return {"status": "error", "message": "session not found"}

    s["status"] = "running"
    s["last_activity"] = time.time()

    try:
        bot = AutomationDeltaDentalMAEligibilityCheck({"data": data})
        bot.config_driver()

        s["bot"] = bot
        s["driver"] = bot.driver
        s["last_activity"] = time.time()

        # Navigate to login URL
        try:
            if not url:
                raise ValueError("URL not provided for DDMA run")
            bot.driver.maximize_window()
            bot.driver.get(url)
            await asyncio.sleep(1)
        except Exception as e:
            s["status"] = "error"
            s["message"] = f"Navigation failed: {e}"
            await cleanup_session(sid)
            return {"status": "error", "message": s["message"]}

        # Login
        try:
            login_result = bot.login(url)
        except WebDriverException as wde:
            s["status"] = "error"
            s["message"] = f"Selenium driver error during login: {wde}"
            await cleanup_session(sid, s["message"])
            return {"status": "error", "message": s["message"]}
        except Exception as e:
            s["status"] = "error"
            s["message"] = f"Unexpected error during login: {e}"
            await cleanup_session(sid, s["message"])
            return {"status": "error", "message": s["message"]}

        # OTP required path
        if isinstance(login_result, str) and login_result == "OTP_REQUIRED":
            s["status"] = "waiting_for_otp"
            s["message"] = "OTP required for login"
            s["last_activity"] = time.time()

            try:
                await asyncio.wait_for(s["otp_event"].wait(), timeout=SESSION_OTP_TIMEOUT)
            except asyncio.TimeoutError:
                s["status"] = "error"
                s["message"] = "OTP timeout"
                await cleanup_session(sid)
                return {"status": "error", "message": "OTP not provided in time"}

            otp_value = s.get("otp_value")
            if not otp_value:
                s["status"] = "error"
                s["message"] = "OTP missing after event"
                await cleanup_session(sid)
                return {"status": "error", "message": "OTP missing after event"}

            # Submit OTP in the same Selenium window
            try:
                driver = s["driver"]
                wait = WebDriverWait(driver, 30)

                otp_input = wait.until(
                    EC.presence_of_element_located(
                        (By.XPATH, "//input[contains(@aria-lable,'Verification code') or contains(@placeholder,'Enter your verification code')]")
                    )
                )
                otp_input.clear()
                otp_input.send_keys(otp_value)

                try:
                    submit_btn = wait.until(
                        EC.element_to_be_clickable(
                            (By.XPATH, "//button[@type='button' and @aria-label='Verify']")
                        )
                    )
                    submit_btn.click()
                except Exception:
                    otp_input.send_keys("\n")

                s["status"] = "otp_submitted"
                s["last_activity"] = time.time()
                await asyncio.sleep(0.5)

                # Wait for post-OTP login to complete and then save cookies
                try:
                    driver = s["driver"]
                    wait = WebDriverWait(driver, 30)
                    # Wait for dashboard element or URL change indicating success
                    logged_in_el = wait.until(
                        EC.presence_of_element_located(
                            (By.XPATH, "//a[text()='Member Eligibility' or contains(., 'Member Eligibility')]")
                        )
                    )
                    # If found, save cookies
                    if logged_in_el:
                        try:
                            # Prefer direct save to avoid subtle create_if_missing behavior
                            cookies = driver.get_cookies()
                            pickle.dump(cookies, open(bot.cookies_path, "wb"))
                            print(f"[start_ddma_run] Saved {len(cookies)} cookies after OTP to {bot.cookies_path}")
                        except Exception as e:
                            print("[start_ddma_run] Warning saving cookies after OTP:", e)
                except Exception as e:
                    # If waiting times out, still attempt a heuristic check by URL
                    cur = s["driver"].current_url if s.get("driver") else ""
                    print("[start_ddma_run] Post-OTP dashboard detection timed out. Current URL:", cur)
                    if "dashboard" in cur or "providers" in cur:
                        try:
                            cookies = s["driver"].get_cookies()
                            pickle.dump(cookies, open(bot.cookies_path, "wb"))
                            print(f"[start_ddma_run] Saved {len(cookies)} cookies after OTP (URL heuristic).")
                        except Exception as e2:
                            print("[start_ddma_run] Warning saving cookies after OTP (heuristic):", e2)

            except Exception as e:
                s["status"] = "error"
                s["message"] = f"Failed to submit OTP into page: {e}"
                await cleanup_session(sid)
                return {"status": "error", "message": s["message"]}

        elif isinstance(login_result, str) and login_result.startswith("ERROR"):
            s["status"] = "error"
            s["message"] = login_result
            await cleanup_session(sid)
            return {"status": "error", "message": login_result}

        # Step 1
        step1_result = bot.step1()
        if isinstance(step1_result, str) and step1_result.startswith("ERROR"):
            s["status"] = "error"
            s["message"] = step1_result
            await cleanup_session(sid)
            return {"status": "error", "message": step1_result}

        # Step 2 (PDF)
        step2_result = bot.step2()
        if isinstance(step2_result, dict) and step2_result.get("status") == "success":
            s["status"] = "completed"
            s["result"] = step2_result
            s["message"] = "completed"
            asyncio.create_task(_remove_session_later(sid, 30))
            return step2_result
        else:
            s["status"] = "error"
            if isinstance(step2_result, dict):
                s["message"] = step2_result.get("message", "unknown error")
            else:
                s["message"] = str(step2_result)
            await cleanup_session(sid)
            return {"status": "error", "message": s["message"]}

    except Exception as e:
        s["status"] = "error"
        s["message"] = f"worker exception: {e}"
        await cleanup_session(sid)
        return {"status": "error", "message": s["message"]}


def submit_otp(sid: str, otp: str) -> Dict[str, Any]:
    """Set OTP for a session and wake waiting runner."""
    s = sessions.get(sid)
    if not s:
        return {"status": "error", "message": "session not found"}
    if s.get("status") != "waiting_for_otp":
        return {"status": "error", "message": f"session not waiting for otp (state={s.get('status')})"}
    s["otp_value"] = otp
    s["last_activity"] = time.time()
    try:
        s["otp_event"].set()
    except Exception:
        pass
    return {"status": "ok", "message": "otp accepted"}


def get_session_status(sid: str) -> Dict[str, Any]:
    s = sessions.get(sid)
    if not s:
        return {"status": "not_found"}
    return {
        "session_id": sid,
        "status": s.get("status"),
        "message": s.get("message"),
        "created_at": s.get("created_at"),
        "last_activity": s.get("last_activity"),
        "result": s.get("result") if s.get("status") == "completed" else None,
    }
