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
            # Wait until page is fully loaded
            try:
                WebDriverWait(self.driver, 30).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
            except Exception:
                # proceed anyway if not perfect
                print("Warning: document.readyState did not become 'complete' within timeout")

            # ---- Take full page screenshot ----
            screenshot_path = os.path.join(self.download_dir, f"ss_{self.memberId}.png")

            # Get sizes and devicePixelRatio (DPR)
            total_width = int(self.driver.execute_script(
                "return Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, document.documentElement.clientWidth);"
            ))
            total_height = int(self.driver.execute_script(
                "return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.documentElement.clientHeight);"
            ))
            viewport_width = int(self.driver.execute_script("return document.documentElement.clientWidth;"))
            viewport_height = int(self.driver.execute_script("return window.innerHeight;"))
            dpr = float(self.driver.execute_script("return window.devicePixelRatio || 1;"))

            # Debug print
            print(f"total: {total_width}x{total_height}, viewport: {viewport_width}x{viewport_height}, dpr: {dpr}")
            
             # Build slice rectangles in CSS pixels
            rectangles = []
            y = 0
            while y < total_height:
                top = y
                height = viewport_height if (y + viewport_height) <= total_height else (total_height - y)
                rectangles.append((0, top, viewport_width, top + height))
                y += viewport_height

            stitched_image = Image.new('RGB', (total_width, total_height))


            for idx, rect in enumerate(rectangles):
                scroll_y = rect[1]
                # Scroll to target Y and wait until pageYOffset is near target
                self.driver.execute_script(f"window.scrollTo(0, {scroll_y});")

                # Wait until the browser actually reports the desired scroll position (with a tolerance)
                max_wait = 5.0
                start = time.time()
                while time.time() - start < max_wait:
                    try:
                        cur = int(self.driver.execute_script("return Math.round(window.pageYOffset || window.scrollY || 0);"))
                    except Exception:
                        cur = -1
                    # Accept small differences due to rounding / subpixel scrolling
                    if abs(cur - scroll_y) <= 2:
                        break
                    time.sleep(0.05)
                else:
                    # timed out waiting for scroll to finish - print but continue
                    print(f"Warning: scroll to {scroll_y} didn't reach expected offset (got {cur})")

                # Small buffer to let lazy content for this slice load (tweak if needed)
                time.sleep(0.6)

                
                # capture viewport screenshot as PNG bytes
                png = self.driver.get_screenshot_as_png()
                img = Image.open(BytesIO(png)).convert("RGB")

                # The captured PNG width/height are in *device pixels* (scaled by dpr).
                # Compute crop box in device pixels.
                css_viewport_w = viewport_width
                css_viewport_h = viewport_height
                dev_viewport_w = int(round(css_viewport_w * dpr))
                dev_viewport_h = int(round(css_viewport_h * dpr))

                # If captured image dimensions differ from expected device viewport,
                # try to adjust (some platforms include browser chrome etc.). We'll compute offsets intelligently.
                cap_w, cap_h = img.width, img.height

                # If cap_h > dev_viewport_h (e.g., when headless gives larger image),
                # center vertically or just use top-left crop of size dev_viewport_h.
                crop_left = 0
                crop_top = 0
                crop_right = min(cap_w, dev_viewport_w)
                crop_bottom = min(cap_h, dev_viewport_h)

                # Defensive: if screenshot is smaller than expected, adjust crop sizes
                if crop_right <= crop_left or crop_bottom <= crop_top:
                    print("Captured image smaller than expected viewport; using full captured image.")
                    crop_left, crop_top, crop_right, crop_bottom = 0, 0, cap_w, cap_h

                cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))

                # Convert back to CSS pixels for paste: compute paste height based on rect height
                paste_height_css = rect[3] - rect[1]  # CSS pixels
                # The cropped image height in CSS pixels:
                cropped_css_height = int(round(cropped.height / dpr))

                # If the cropped CSS height is larger than required (last slice), crop it in CSS space
                if cropped_css_height > paste_height_css:
                    # compute pixels to keep in device pixels
                    keep_dev_h = int(round(paste_height_css * dpr))
                    cropped = cropped.crop((0, 0, cropped.width, keep_dev_h))
                    cropped_css_height = paste_height_css

                # Convert cropped (device pixels) back to image suitable for pasting:
                # For pasting into stitched_image we need CSS-pixel sized image.
                # Resize from device pixels to CSS pixels if DPR != 1
                if dpr != 1.0:
                    target_w = int(round(cropped.width / dpr))
                    target_h = int(round(cropped.height / dpr))
                    cropped = cropped.resize((target_w, target_h), Image.LANCZOS)

                # Paste at the correct vertical CSS pixel position
                paste_y = rect[1]
                stitched_image.paste(cropped, (0, paste_y))

            # Save final stitched image
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
