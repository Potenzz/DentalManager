from selenium import webdriver
from selenium.common import TimeoutException
from selenium.common.exceptions import ElementNotInteractableException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import Select
import time
from datetime import datetime
from dotenv import load_dotenv
import os
load_dotenv()

procedure_codes = [
    {
        "procedure_code": "D0210", 
        "procedure_date": "06/30/2025", 
        "oralCavityArea": "", 
        "toothNumber": "", 
        "toothSurface": "",
        "fees":"19"
    },
    {
        "procedure_code": "D0250", 
        "procedure_date": "06/30/2025", 
        "oralCavityArea": "here", 
        "toothNumber": "15", 
        "toothSurface": "B",
        "fees":"190"
    }
]

pdfs = ["PDF_To_Test/sample1.pdf", "PDF_To_Test/sample2.pdf"]

data = {
    "massdhp_username": os.getenv("MASSDHP_USERNAME"),
    "massdhp_password": os.getenv("MASSDHP_PASSWORD"),
    "memberId": os.getenv("memberId"),
    "dob":os.getenv("dob"),
    "procedure_codes": procedure_codes,
    "pdfs" : pdfs,
    "missingTeethStatus": "Yes_missing", # can be Yes_missing , No_missing, or endentulous
    "missingTeeth": {
        # Tooth name: selection ("X" for missing, "O" for "To be Pulled")

        # for permanent type : T_n : X or O   ( n here is teeth number like 1, 2, 3)
        "T_1": "X",
        "T_32": "O",

        # for primay type: T_x : X or 0 (x here is alphabet)
        "T_A": "X", 
        "T_B": "O",
    }, 
    "remarks": "Hello remarks"
}

class AutomationMassDHP:      
    def __init__(self):
        self.headless = False
        self.driver = None

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
            email_field.send_keys(data["massdhp_username"])

            # Enter password
            password_field = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='Pass' and @type='password']")))
            password_field.clear()
            password_field.send_keys(data["massdhp_password"])

            # Click login
            login_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Login']")))
            login_button.click()

            print("Login submitted successfully.")

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
            member_id_input.send_keys(data["memberId"])

            # Fill DOB parts
            try:
                dob_parts = data["dob"].split("/")
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

        except Exception as e: 
            print(f"Error while step1 i.e Cheking the MemberId and DOB in: {e}")
            return "ERROR:STEP1"

    def step2(self):

        wait = WebDriverWait(self.driver, 30)
        
        # already waiting in step1 last part, so no time sleep.

        # 1 - Procedure Codes part
        try:
            for proc in data["procedure_codes"]:
                # Wait for Procedure Code dropdown and select code

                select_element = wait.until(EC.presence_of_element_located((By.XPATH, "//select[@id='Select3']")))
                Select(select_element).select_by_value(proc['procedure_code'])

                # Fill Procedure Date if present
                if proc.get("procedure_date"):
                    try:
                        # Try to normalize date to MM/DD/YYYY format
                        parsed_date = datetime.strptime(proc["procedure_date"], "%m/%d/%Y")
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
                if proc.get("fees"):
                    fees_xpath = "//input[@name='ProcedureFee']"
                    wait.until(EC.presence_of_element_located((By.XPATH, fees_xpath))).clear()
                    self.driver.find_element(By.XPATH, fees_xpath).send_keys(proc["fees"])

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
            pdfs_abs = [os.path.abspath(pdf) for pdf in data["pdfs"]]

            for pdf in pdfs_abs:
                # Wait for file input and upload file
                file_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='FileName' and @type='file']")))
                file_input.send_keys(pdf)
                
                # Wait for upload button and click it
                upload_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Upload File']")))
                upload_button.click()
                
                time.sleep(3)   
        except Exception as e: 
            print(f"Error while uploading PDFs: {e}")
            return "ERROR:PDF FAILED"

        # 3 - Indicate Missing Teeth Part
        try: 
            # Handle the missing teeth section based on the status
            missing_status = data.get("missingTeethStatus")
            
            if missing_status == "No_missing":
                missing_teeth_no = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='checkbox' and @name='PAU_Step3_Checkbox1']")))
                missing_teeth_no.click()

            elif missing_status == "endentulous":
                missing_teeth_edentulous = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='checkbox' and @name='PAU_Step3_Checkbox2']")))
                missing_teeth_edentulous.click()

            elif missing_status == "Yes_missing":
                missing_teeth_dict = data.get("missingTeeth", {})

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
            textarea = wait.until(EC.presence_of_element_located((By.XPATH, "//textarea[@name='Remarks']")))
            textarea.clear()
            textarea.send_keys(data["remarks"])

            # Wait for update button and click it
            update_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Update Remarks']")))
            update_button.click()
            
            time.sleep(3)
            
        except Exception as e: 
            print(f"Error while filling remarks: {e}")
            return "ERROR:REMARKS FAILED"


    def main_workflow(self, url):
        self.config_driver()
        print("Reaching Site :", url)
        self.driver.maximize_window()
        self.driver.get(url)
        time.sleep(3)
        value = self.login()
        if value.startswith("ERROR"):
            self.driver.close()
            return value
        

        time.sleep(5)
        value2 = self.step1()
        if value2.startswith("ERROR"):
            self.driver.close()
            return value2

        time.sleep(5)
        value3 = self.step2()
        if value3.startswith("ERROR"):
            self.driver.close()
            return value3


        input("should Close?") # here it sholud get confirmation from the frontend, 
        

        self.driver.close()


obj1 = AutomationMassDHP()
obj1.main_workflow(url= "https://providers.massdhp.com/providers_login.asp")