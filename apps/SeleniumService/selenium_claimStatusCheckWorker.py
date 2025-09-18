from selenium import webdriver
from selenium.common import TimeoutException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
from io import BytesIO
from PIL import Image

class AutomationMassHealthClaimStatusCheck:    
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
            EC.element_to_be_clickable((By.XPATH, "//a[text()='Claim Status']"))
            )
            eligibility_link.click()

            time.sleep(3)

            # Fill Member ID
            member_id_input = wait.until(EC.presence_of_element_located((By.XPATH, '//input[@name="MAMedicaidID"]')))
            member_id_input.clear()
            member_id_input.send_keys(self.memberId)

            # Click Search button
            search_btn = wait.until(EC.element_to_be_clickable((By.XPATH, '//input[@id="Submit1"]')))
            search_btn.click()

            time.sleep(2)

             # Check for error message
            try:
                error_msg = WebDriverWait(self.driver, 5).until(EC.presence_of_element_located(
                    (By.XPATH, "//font[contains(text(), 'Your search did not return any results. Please try again.')]")
                ))
                if error_msg:
                    return  "ERROR: THIS MEMBERID HAS NO CLAIM RESULTS"
            except TimeoutException:
                pass

            # check success message
            try:
                success_msg = WebDriverWait(self.driver, 5).until(EC.presence_of_element_located(
                    (By.XPATH, "//td[contains(text(), 'Your search returned')]")
                ))
                if not success_msg:
                    return  "ERROR: THIS MEMBERID HAS NO CLAIM RESULTS"
            except TimeoutException:
                pass

            return "Success"

        except Exception as e: 
            print(f"Error while step1 i.e Cheking the MemberId and DOB in: {e}")
            return "ERROR:STEP1"

    
    def step2(self):
        try:
            # ---- Take full page screenshot ----
            screenshot_path = os.path.join(self.download_dir, f"ss_{self.memberId}.png")

            # JS to get sizes
            total_width = self.driver.execute_script("return Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, document.documentElement.clientWidth);")
            total_height = self.driver.execute_script("return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.documentElement.clientHeight);")
            viewport_width = self.driver.execute_script("return document.documentElement.clientWidth;")
            viewport_height = self.driver.execute_script("return window.innerHeight;")

            # Ensure integers
            total_width = int(total_width)
            total_height = int(total_height)
            viewport_width = int(viewport_width)
            viewport_height = int(viewport_height)

            # number of vertical steps
            rectangles = []
            y = 0
            while y < total_height:
                top = y
                height = viewport_height if (y + viewport_height) <= total_height else (total_height - y)
                rectangles.append((0, top, viewport_width, top + height))
                y += viewport_height

            stitched_image = Image.new('RGB', (total_width, total_height))
            stitched_y = 0

            for idx, rect in enumerate(rectangles):
                scroll_y = rect[1]
                # Scroll to the position (do not trigger reload)
                self.driver.execute_script(f"window.scrollTo(0, {scroll_y});")
                # Allow time for lazy content to load after scroll (tweak if needed)
                time.sleep(0.35)

                # capture viewport screenshot as PNG bytes
                png = self.driver.get_screenshot_as_png()  # returns bytes
                img = Image.open(BytesIO(png))


                # If full page width > viewport width (rare), optionally resize/crop:
                if img.width != total_width:
                    # Try to crop or expand: prefer cropping center horizontally
                    img = img.crop((0, 0, total_width, img.height))

                # Compute paste height (might be partial for last slice)
                paste_height = rect[3] - rect[1]  # rect bottom - rect top
                # If captured image has same viewport height, we may need to crop to paste_height
                if img.height > paste_height:
                    img = img.crop((0, 0, img.width, paste_height))

                stitched_image.paste(img, (0, rect[1]))

            # Save stitched image
            stitched_image.save(screenshot_path)

            print("Screenshot saved at:", screenshot_path)

            return {
                "status": "success",
                "ss_path":screenshot_path
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
