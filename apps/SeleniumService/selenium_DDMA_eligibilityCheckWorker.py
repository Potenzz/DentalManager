from selenium import webdriver
from selenium.common import TimeoutException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
import shutil
import stat

class AutomationDeltaDentalMAEligibilityCheck:    
    def __init__(self, data):
        self.headless = False
        self.driver = None

        self.data = data.get("data", {}) if isinstance(data, dict) else {}


        # Flatten values for convenience
        self.memberId = self.data.get("memberId", "")
        self.dateOfBirth = self.data.get("dateOfBirth", "")
        self.massddma_username = self.data.get("massddmaUsername", "")
        self.massddma_password = self.data.get("massddmaPassword", "")

        self.download_dir = os.path.abspath("seleniumDownloads")
        os.makedirs(self.download_dir, exist_ok=True)
    

    def config_driver(self):
        options = webdriver.ChromeOptions()
        if self.headless:
            options.add_argument("--headless")

        # Add PDF download preferences
        prefs = {
            "download.default_directory": self.download_dir,
            "plugins.always_open_pdf_externally": True,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True
        }
        options.add_experimental_option("prefs", prefs)

        s = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=s, options=options)
        self.driver = driver

    def login(self):
        """
        Attempts login and detects OTP.
        Returns:
          - "Success" -> logged in
          - "OTP_REQUIRED" -> page requires OTP (we do NOT block here)
          - "ERROR:..." -> error occurred
        """
        wait = WebDriverWait(self.driver, 30)
        try:
            email_field = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='username' and @type='text']")))
            email_field.clear()
            email_field.send_keys(self.massddma_username)

            password_field = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='password' and @type='password']")))
            password_field.clear()
            password_field.send_keys(self.massddma_password)
            
             # Click Remember me checkbox
            remember_me_checkbox = wait.until(EC.element_to_be_clickable(
                (By.XPATH, "//label[.//span[contains(text(),'Remember me')]]")
            ))
            remember_me_checkbox.click()
            
            login_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@type='button' and @aria-label='Sign in']")))
            login_button.click()


            # 1) Detect OTP presence (adjust the XPath/attributes to the actual site)
            try:
                otp_candidate = WebDriverWait(self.driver, 30).until(
                    EC.presence_of_element_located(
                        (By.XPATH, "//input[contains(@aria-lable,'Verification code') or contains(@placeholder,'Enter your verification code')]")
                    )
                )
                if otp_candidate:
                    print("[DDMA worker] OTP input detected -> OTP_REQUIRED")
                    return "OTP_REQUIRED"
            except TimeoutException:
                pass

            # 2) Detect successful login by presence of a known post-login element
            try:
                logged_in_el = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, "//a[text()='Member Eligibility' or contains(., 'Member Eligibility')]"))
                )
                if logged_in_el:
                    return "Success"
            except TimeoutException:
                # last chance: see if URL changed
                if "dashboard" in self.driver.current_url or "providers" in self.driver.current_url:
                    return "Success"

            return "ERROR:LOGIN FAILED - unable to detect success or OTP"
        except Exception as e:
            print(f"[DDMA worker] login exception: {e}")
            return f"ERROR:LOGIN FAILED: {e}"

    def step1(self):
        wait = WebDriverWait(self.driver, 30)

        try:
            eligibility_link = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//a[text()='Member Eligibility']"))
            )
            eligibility_link.click()

            time.sleep(3)

            # Fill Member ID
            member_id_input = wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text1"]')))
            member_id_input.clear()
            member_id_input.send_keys(self.memberId)

            # Fill DOB parts
            try:
                dob_parts = self.dateOfBirth.split("-")
                year = dob_parts[0]           # "1964"
                month = dob_parts[1].zfill(2) # "04"
                day = dob_parts[2].zfill(2)   # "17"
            except Exception as e:
                print(f"Error parsing DOB: {e}")
                return "ERROR: PARSING DOB"

            wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text2"]'))).send_keys(month)
            wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text3"]'))).send_keys(day)
            wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text4"]'))).send_keys(year)

            # Click Continue button
            continue_btn = wait.until(EC.element_to_be_clickable((By.XPATH, '//input[@type="submit" and @value="Add Member"]')))
            continue_btn.click()
            
            # Check for error message
            try:
                error_msg = WebDriverWait(self.driver, 5).until(EC.presence_of_element_located(
                    (By.XPATH, "//td[@class='text_err_msg' and contains(text(), 'Invalid Medicaid ID or Date of Birth')]")
                ))
                if error_msg:
                    print("Error: Invalid Member ID or Date of Birth.")
                    return  "ERROR: INVALID MEMBERID OR DOB"
            except TimeoutException:
                pass

            return "Success"

        except Exception as e: 
            print(f"Error while step1 i.e Cheking the MemberId and DOB in: {e}")
            return "ERROR:STEP1"

    
    def step2(self):
        def wait_for_pdf_download(timeout=60):
            for _ in range(timeout):
                files = [f for f in os.listdir(self.download_dir) if f.endswith(".pdf")]
                if files:
                    return os.path.join(self.download_dir, files[0])
                time.sleep(1)
            raise TimeoutError("PDF did not download in time")

        def _unique_target_path():
            """
            Create a unique filename using memberId.
            """
            safe_member = "".join(c for c in str(self.memberId) if c.isalnum() or c in "-_.")
            filename = f"eligibility_{safe_member}.pdf"
            return os.path.join(self.download_dir, filename)

        wait = WebDriverWait(self.driver, 90)
        tmp_created_path = None

        try:

            eligibilityElement = wait.until(EC.presence_of_element_located((By.XPATH, 
            f"//table[@id='Table3']//tr[td[contains(text(), '{self.memberId}')]]/td[3]")))
            eligibilityText = eligibilityElement.text

            txReportElement = wait.until(EC.element_to_be_clickable((By.XPATH,
            f"//table[@id='Table3']//tr[td[contains(text(), '{self.memberId}')]]//input[@value='Tx Report']"
            )))

            txReportElement.click()

            # wait for the PDF to fully appear
            downloaded_path = wait_for_pdf_download()
            # generate unique target path (include memberId)
            target_path = _unique_target_path()
            # It's possible Chrome writes a file with a fixed name: copy/rename it to our target name.
            shutil.copyfile(downloaded_path, target_path)
            # ensure the copied file is writable / stable
            os.chmod(target_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)


            print("PDF downloaded at:", target_path)

            return {
                "status": "success",
                "eligibility": eligibilityText,
                "pdf_path": target_path
            }
        except Exception as e:
            print(f"ERROR: {str(e)}")

            # Empty the download folder (remove files / symlinks only)
            try:
                dl = os.path.abspath(self.download_dir)
                if os.path.isdir(dl):
                    for name in os.listdir(dl):
                        item = os.path.join(dl, name)
                        try:
                            if os.path.isfile(item) or os.path.islink(item):
                                os.remove(item)
                                print(f"[cleanup] removed: {item}")
                        except Exception as rm_err:
                            print(f"[cleanup] failed to remove {item}: {rm_err}")
                    print(f"[cleanup] emptied download dir: {dl}")
                else:
                    print(f"[cleanup] download dir does not exist: {dl}")
            except Exception as cleanup_exc:
                print(f"[cleanup] unexpected error while cleaning downloads dir: {cleanup_exc}")


            return {
                "status": "error",
                "message": str(e),
            }

        finally:
            if self.driver:
                self.driver.quit()

    def main_workflow(self, url):
        try: 
            self.config_driver()
            self.driver.maximize_window()
            self.driver.get(url)
            time.sleep(3)

            login_result = self.login()
            if login_result.startswith("ERROR"):
                return {"status": "error", "message": login_result}
            if login_result == "OTP_REQUIRED":
                return {"status": "otp_required", "message": "OTP required after login"}

            step1_result = self.step1()
            if step1_result.startswith("ERROR"):
                return {"status": "error", "message": step1_result}

            step2_result = self.step2()
            if step2_result.get("status") == "error":
                return {"status": "error", "message": step2_result.get("message")}

            return step2_result
        except Exception as e: 
            return {
                "status": "error",
                "message": e
            }
        
        finally:
            try:
                if self.driver:
                    self.driver.quit()
            except Exception:
                pass
