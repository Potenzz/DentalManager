from selenium import webdriver
from selenium.common import TimeoutException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import Select
import time
from datetime import datetime
import tempfile
import base64
import os
import requests
import json

class AutomationMassHealth:    
    last_instance = None  

    def __init__(self, data):
        self.headless = False
        self.driver = None
        AutomationMassHealth.last_instance = self

        self.data = data
        self.claim = data.get("claim", {})
        self.pdfs = data.get("pdfs", [])

        # Flatten values for convenience
        self.memberId = self.claim.get("memberId", "")
        self.dateOfBirth = self.claim.get("dateOfBirth", "")
        self.remarks = self.claim.get("remarks", "")
        self.massdhp_username = self.claim.get("massdhpUsername", "")
        self.massdhp_password = self.claim.get("massdhpPassword", "")
        self.serviceLines = self.claim.get("serviceLines", [])
        self.missingTeethStatus = self.claim.get("missingTeethStatus", "")
        self.missingTeeth = self.claim.get("missingTeeth", {})
    
    @staticmethod
    def get_last_instance():
        return AutomationMassHealth.last_instance

    def config_driver(self):
        options = webdriver.ChromeOptions()
        if self.headless:
            options.add_argument("--headless")
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

            print("Login submitted successfully.")
            return "Success"

        except Exception as e: 
            print(f"Error while logging in: {e}")
            return "ERROR:LOGIN FAILED"

    def step1(self):
        wait = WebDriverWait(self.driver, 30)

        try:
            claim_upload_link = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//a[text()='Claim Upload']"))
            )
            claim_upload_link.click()

            time.sleep(3)

            # Fill Member ID
            member_id_input = wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text1"]')))
            member_id_input.clear()
            member_id_input.send_keys(self.memberId)

            # Fill DOB parts
            try:
                dob_parts = self.dateOfBirth.split("/")
                month= dob_parts[0].zfill(2)   # "12"
                day= dob_parts[1].zfill(2)   # "13"
                year = dob_parts[2]          # "1965"
            except Exception as e:
                print(f"Error parsing DOB: {e}")
                return "ERROR: PARSING DOB"


            wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text2"]'))).send_keys(month)
            wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text3"]'))).send_keys(day)
            wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Text4"]'))).send_keys(year)

            # Rendering Provider NPI dropdown
            npi_dropdown = wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Select1"]')))
            select_npi = Select(npi_dropdown)
            select_npi.select_by_index(1)  

            # Office Location dropdown
            location_dropdown = wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="Select2"]')))
            select_location = Select(location_dropdown)
            select_location.select_by_index(1)  

            # Click Continue button
            continue_btn = wait.until(EC.element_to_be_clickable((By.XPATH, '//input[@type="submit" and @value="Continue"]')))
            continue_btn.click()
            

            # Check for error message
            try:
                error_msg = WebDriverWait(self.driver, 5).until(EC.presence_of_element_located(
                    (By.XPATH, "//td[@class='text_err_msg' and contains(text(), 'Invalid Member ID or Date of Birth')]")
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

        wait = WebDriverWait(self.driver, 30)
        
        # already waiting in step1 last part, so no time sleep.

        # 1 - Procedure Codes part
        try:
            for proc in self.serviceLines:
                # Wait for Procedure Code dropdown and select code
                select_element = wait.until(EC.presence_of_element_located((By.XPATH, "//select[@id='Select3']")))
                Select(select_element).select_by_value(proc['procedureCode'])

                # Fill Procedure Date if present
                if proc.get("procedureDate"):
                    try:
                        # Try to normalize date to MM/DD/YYYY format
                        parsed_date = datetime.strptime(proc["procedureDate"], "%Y-%m-%d")
                        formatted_date = parsed_date.strftime("%m/%d/%Y")

                        date_xpath = "//input[@name='ProcedureDate']"
                        wait.until(EC.presence_of_element_located((By.XPATH, date_xpath))).clear()
                        self.driver.find_element(By.XPATH, date_xpath).send_keys(formatted_date)

                    except ValueError:
                        # Invalid date format - skip filling ProcedureDate field
                        pass

                # Fill Oral Cavity Area if present
                if proc.get("oralCavityArea"):
                    oral_xpath = "//input[@name='OralCavityArea']"
                    wait.until(EC.presence_of_element_located((By.XPATH, oral_xpath))).clear()
                    self.driver.find_element(By.XPATH, oral_xpath).send_keys(proc["oralCavityArea"])

                # Fill Tooth Number if present
                if proc.get("toothNumber"):
                    tooth_num_dropdown = wait.until(EC.presence_of_element_located((By.XPATH, "//select[@name='ToothNumber']")))
                    select_tooth = Select(tooth_num_dropdown)
                    select_tooth.select_by_value(proc["toothNumber"])


                # Fill Tooth Surface if present
                if proc.get("toothSurface"):
                    surface = proc["toothSurface"]
                    checkbox_xpath = f"//input[@type='checkbox' and @name='TS_{surface}']"
                    checkbox = wait.until(EC.element_to_be_clickable((By.XPATH, checkbox_xpath)))
                    if not checkbox.is_selected():
                        checkbox.click()


                # Fill Fees if present
                if proc.get("billedAmount"):
                    fees_xpath = "//input[@name='ProcedureFee']"
                    wait.until(EC.presence_of_element_located((By.XPATH, fees_xpath))).clear()
                    self.driver.find_element(By.XPATH, fees_xpath).send_keys(proc["billedAmount"])

                # Click "Add Procedure" button
                add_proc_xpath = "//input[@type='submit' and @value='Add Procedure']"
                wait.until(EC.element_to_be_clickable((By.XPATH, add_proc_xpath))).click()

                time.sleep(1)


            print("Procedure codes submitted successfully.")
            

        except Exception as e: 
            print(f"Error while filling Procedure Codes: {e}")
            return "ERROR:PROCEDURE CODES"

        # 2 - Upload PDFs: 
        try: 
            pdfs_abs = [proc for proc in self.pdfs]

            with tempfile.TemporaryDirectory() as tmp_dir:
                for pdf_obj in pdfs_abs:
                    base64_data = pdf_obj["bufferBase64"]
                    file_name = pdf_obj.get("originalname", "tempfile.pdf")

                    # Full path with original filename inside temp dir
                    tmp_file_path = os.path.join(tmp_dir, file_name)

                    # Decode and save
                    with open(tmp_file_path, "wb") as tmp_file:
                        tmp_file.write(base64.b64decode(base64_data))

                    # Upload using Selenium
                    file_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='FileName' and @type='file']")))
                    file_input.send_keys(tmp_file_path)

                    upload_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Upload File']")))
                    upload_button.click()

                    time.sleep(3)
        except Exception as e: 
            print(f"Error while uploading PDFs: {e}")
            return "ERROR:PDF FAILED"

        # 3 - Indicate Missing Teeth Part
        try: 
            # Handle the missing teeth section based on the status
            missing_status = self.missingTeethStatus.strip() if self.missingTeethStatus else "No_missing"
            
            if missing_status == "No_missing":
                missing_teeth_no = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='checkbox' and @name='PAU_Step3_Checkbox1']")))
                missing_teeth_no.click()

            elif missing_status == "endentulous":
                missing_teeth_edentulous = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='checkbox' and @name='PAU_Step3_Checkbox2']")))
                missing_teeth_edentulous.click()

            elif missing_status == "Yes_missing":
                missing_teeth_dict = self.missingTeeth

                # For each tooth in the missing teeth dict, select the dropdown option
                for tooth_name, value in missing_teeth_dict.items():
                    if value:  # only if there's a value to select
                        select_element = wait.until(EC.presence_of_element_located((By.XPATH, f"//select[@name='{tooth_name}']")))
                        select_obj = Select(select_element)
                        select_obj.select_by_value(value)

            
            # Wait for upload button and click it
            update_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Update Missing Teeth']")))
            update_button.click()
            
            time.sleep(3)
        except Exception as e: 
            print(f"Error while filling missing teeth: {e}")
            return "ERROR:MISSING TEETH FAILED"

        
        # 4 - Update Remarks
        try:
            if self.remarks.strip():  
                textarea = wait.until(EC.presence_of_element_located((By.XPATH, "//textarea[@name='Remarks']")))
                textarea.clear()
                textarea.send_keys(self.remarks)

                # Wait for update button and click it
                update_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Update Remarks']")))
                update_button.click()
                
                time.sleep(3)
            
        except Exception as e: 
            print(f"Error while filling remarks: {e}")
            return "ERROR:REMARKS FAILED"

        return "Success"
    

    def reach_to_pdf(self):
        wait = WebDriverWait(self.driver, 30)

        try:
            print("Waiting for PDF link to appear on success page...")
            pdf_link_element = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '.pdf')]"))
            )
            print("PDF link found. Clicking it...")

            # Click the PDF link
            pdf_link_element.click()
            time.sleep(5)

            existing_windows = self.driver.window_handles

            # Wait for the new tab
            WebDriverWait(self.driver, 90).until(
                lambda d: len(d.window_handles) > len(existing_windows)
            )

            print("Switching to PDF tab...")
            self.driver.switch_to.window(self.driver.window_handles[1])


            time.sleep(2)
            current_url = self.driver.current_url
            print(f"Switched to PDF tab. Current URL: {current_url}")


             # Get full PDF URL in case it's a relative path
            pdf_url = pdf_link_element.get_attribute("href")
            if not pdf_url.startswith("http"):
                base_url = self.driver.current_url.split("/providers")[0]
                pdf_url = f"{base_url}/{pdf_url}"

            # Get cookies from Selenium session, saving just for my referece while testing. in prod just use below one line
            # cookies = {c['name']: c['value'] for c in self.driver.get_cookies()} 
            # 1. Get raw Selenium cookies (list of dicts)
            raw_cookies = self.driver.get_cookies()
            with open("raw_cookies.txt", "w") as f:
                json.dump(raw_cookies, f, indent=2)

            formatted_cookies = {c['name']: c['value'] for c in raw_cookies}
            with open("formatted_cookies.txt", "w") as f:
                for k, v in formatted_cookies.items():
                    f.write(f"{k}={v}\n")

            # Use requests to download the file using session cookies
            print("Downloading PDF content via requests...")
            pdf_response = requests.get(pdf_url, cookies=formatted_cookies)

            if pdf_response.status_code == 200:
                print("PDF successfully fetched (bytes length):")
                return {
                "status": "success",
                "pdf_bytes": base64.b64encode(pdf_response.content).decode(),
            }
            else:
                print("Failed to fetch PDF. Status:", pdf_response.status_code, pdf_response)
                return {
                "status": "error",
                "message": pdf_response,
            }

        except Exception as e:
            print(f"ERROR: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
            }
        
    def main_workflow_upto_step2(self, url):
        self.config_driver()
        print("Reaching Site :", url)
        self.driver.maximize_window()
        self.driver.get(url)
        time.sleep(3)

        if self.login().startswith("ERROR"):
            return {"status": "error", "message": "Login failed"}

        if self.step1().startswith("ERROR"):
            return {"status": "error", "message": "Step1 failed"}

        if self.step2().startswith("ERROR"):
            return {"status": "error", "message": "Step2 failed"}

        print("Waiting for user to manually submit form in browser...")
        return {
            "status": "waiting_for_user",
            "message": "Automation paused. Please submit the form manually in browser."
        }