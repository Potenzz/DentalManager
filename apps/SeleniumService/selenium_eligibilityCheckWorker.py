from selenium import webdriver
from selenium.common import TimeoutException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os

class AutomationMassHealthEligibilityCheck:    
    def __init__(self, data):
        self.headless = False
        self.driver = None

        self.data = data.get("data")

        # Flatten values for convenience
        self.memberId = self.data.get("memberId", "")
        self.dateOfBirth = self.data.get("dateOfBirth", "")
        self.massdhp_username = self.data.get("massdhpUsername", "")
        self.massdhp_password = self.data.get("massdhpPassword", "")

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
        wait = WebDriverWait(self.driver, 30)

        try:
            # Enter email
            email_field = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='Email' and @type='text']")))
            email_field.clear()
            email_field.send_keys(self.massdhp_username)

            # Enter password
            password_field = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='Pass' and @type='password']")))
            password_field.clear()
            password_field.send_keys(self.massdhp_password)

            # Click login
            login_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Login']")))
            login_button.click()

            return "Success"

        except Exception as e: 
            print(f"Error while logging in: {e}")
            return "ERROR:LOGIN FAILED"

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
        wait = WebDriverWait(self.driver, 90)

        def wait_for_pdf_download(timeout=60):
            for _ in range(timeout):
                files = [f for f in os.listdir(self.download_dir) if f.endswith(".pdf")]
                if files:
                    return os.path.join(self.download_dir, files[0])
                time.sleep(1)
            raise TimeoutError("PDF did not download in time")
        try:

            eligibilityElement = wait.until(EC.presence_of_element_located((By.XPATH, 
            f"//table[@id='Table3']//tr[td[contains(text(), '{self.memberId}')]]/td[3]")))
            eligibilityText = eligibilityElement.text

            report_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Click here')]")))
            report_link.click()

            pdf_path = wait_for_pdf_download()
            print("PDF downloaded at:", pdf_path)

            return {
                "status": "success",
                "eligibility": eligibilityText,
                "pdf_path": pdf_path
            }
        except Exception as e:
            print(f"ERROR: {str(e)}")
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
            self.driver.quit()
