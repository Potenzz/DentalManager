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

class AutomationMassHealth:    
    def __init__(self, data):
        self.headless = False
        self.driver = None

        self.data = data
        self.claim = data.get("claim", {})
        self.upload_files = data.get("pdfs", []) + data.get("images", [])

        # Flatten values for convenience
        self.memberId = self.claim.get("memberId", "")
        self.dateOfBirth = self.claim.get("dateOfBirth", "")
        self.remarks = self.claim.get("remarks", "")
        self.massdhp_username = self.claim.get("massdhpUsername", "")
        self.massdhp_password = self.claim.get("massdhpPassword", "")
        self.serviceLines = self.claim.get("serviceLines", [])
        self.missingTeethStatus = self.claim.get("missingTeethStatus", "")
        self.missingTeeth = self.claim.get("missingTeeth", {})
    

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
                    surfaces = proc["toothSurface"].split(",")  
                    for surface in surfaces:
                        surface = surface.strip()
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

        except Exception as e: 
            print(f"Error while filling Procedure Codes: {e}")
            return "ERROR:PROCEDURE CODES"

        # 2 - Upload PDFs: 
        try: 
            with tempfile.TemporaryDirectory() as tmp_dir:
                 for file_obj in self.upload_files:
                    base64_data = file_obj["bufferBase64"]
                    file_name = file_obj.get("originalname", "tempfile.bin")

                    # Ensure valid extension fallback if missing
                    if not any(file_name.lower().endswith(ext) for ext in [".pdf", ".jpg", ".jpeg", ".png", ".webp"]):
                        file_name += ".bin"

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
        
        # 5 - close buton
        try:
            close_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Submit Request']")))
            close_button.click()
            
            time.sleep(1)

            # Switch to alert and accept it
            try:
                wait.until(EC.alert_is_present())

                alert = self.driver.switch_to.alert
                alert.accept()
            except TimeoutException:
                print("No alert appeared after clicking the button.")
                
            time.sleep(1)

        except Exception as e: 
            print(f"Error while Closing: {e}")
            return "ERROR:CLOSE FAILED"

        return "Success"
    

    def reach_to_pdf(self):
        wait = WebDriverWait(self.driver, 90)
        try:
            pdf_link_element = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '.pdf')]"))
            )
            time.sleep(5)
            pdf_relative_url = pdf_link_element.get_attribute("href")

            if not pdf_relative_url.startswith("http"):
                full_pdf_url = f"https://providers.massdhp.com{pdf_relative_url}"
            else:
                full_pdf_url = pdf_relative_url
            
            print("FULL PDF LINK: ",full_pdf_url)
            return full_pdf_url

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
            if step2_result.startswith("ERROR"):
                return {"status": "error", "message": step2_result}
            
            reachToPdf_result = self.reach_to_pdf()
            if reachToPdf_result.startswith("ERROR"):
                return {"status": "error", "message": reachToPdf_result}

            return {
                    "status": "success",
                    "pdf_url": reachToPdf_result
                }
        except Exception as e: 
            return {
                "status": "error",
                "message": e
            }
