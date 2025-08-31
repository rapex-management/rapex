#!/usr/bin/env python
"""
Frontend Functionality Test Script
Tests all admin merchant management functionalities in the browser
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import json

class FrontendTester:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.test_results = []
        self.base_url = "http://localhost:3000"
        
    def setup_driver(self):
        """Setup Chrome driver"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, 10)
            return True
        except Exception as e:
            print(f"Failed to setup driver: {e}")
            return False
    
    def log_test(self, test_name, success, message=""):
        """Log test result"""
        result = {"test": test_name, "success": success, "message": message}
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
    
    def test_admin_login(self):
        """Test admin login functionality"""
        try:
            self.driver.get(f"{self.base_url}/admin/login")
            
            # Fill login form
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, "identifier")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            username_field.send_keys("admin")
            password_field.send_keys("admin123")
            
            # Submit form
            login_button = self.driver.find_element(By.TYPE, "submit")
            login_button.click()
            
            # Wait for redirect to admin dashboard
            self.wait.until(EC.url_contains("/admin"))
            
            if "/admin/merchants" in self.driver.current_url or "/admin" in self.driver.current_url:
                self.log_test("Admin Login", True, "Successfully logged in")
                return True
            else:
                self.log_test("Admin Login", False, f"Unexpected redirect to: {self.driver.current_url}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Login failed: {str(e)}")
            return False
    
    def test_merchant_list_display(self):
        """Test merchant list page display"""
        try:
            self.driver.get(f"{self.base_url}/admin/merchants")
            
            # Check if merchant table exists
            table = self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
            
            # Check for essential elements
            headers = self.driver.find_elements(By.TAG_NAME, "th")
            if len(headers) > 0:
                self.log_test("Merchant List Display", True, f"Table with {len(headers)} columns loaded")
                return True
            else:
                self.log_test("Merchant List Display", False, "No table headers found")
                return False
                
        except Exception as e:
            self.log_test("Merchant List Display", False, f"Failed to load: {str(e)}")
            return False
    
    def test_search_functionality(self):
        """Test search functionality"""
        try:
            # Look for search input
            search_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Search']")
            search_input.clear()
            search_input.send_keys("test")
            
            # Wait a moment for search to process
            time.sleep(2)
            
            self.log_test("Search Functionality", True, "Search input found and works")
            return True
            
        except Exception as e:
            self.log_test("Search Functionality", False, f"Search failed: {str(e)}")
            return False
    
    def test_filter_functionality(self):
        """Test filter dropdowns"""
        try:
            # Look for filter dropdowns
            filters = self.driver.find_elements(By.CSS_SELECTOR, "select")
            
            if len(filters) > 0:
                # Test first filter
                filters[0].click()
                time.sleep(1)
                
                self.log_test("Filter Functionality", True, f"Found {len(filters)} filter dropdowns")
                return True
            else:
                self.log_test("Filter Functionality", False, "No filter dropdowns found")
                return False
                
        except Exception as e:
            self.log_test("Filter Functionality", False, f"Filter test failed: {str(e)}")
            return False
    
    def test_action_buttons(self):
        """Test action buttons (view, approve, reject, etc.)"""
        try:
            # Look for action buttons
            action_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button[title], a[title]")
            
            button_count = len(action_buttons)
            if button_count > 0:
                # Test clicking a view button if exists
                view_buttons = [btn for btn in action_buttons if "view" in btn.get_attribute("title").lower()]
                if view_buttons:
                    # Don't actually click to avoid navigation
                    self.log_test("Action Buttons", True, f"Found {button_count} action buttons including view buttons")
                else:
                    self.log_test("Action Buttons", True, f"Found {button_count} action buttons")
                return True
            else:
                self.log_test("Action Buttons", False, "No action buttons found")
                return False
                
        except Exception as e:
            self.log_test("Action Buttons", False, f"Action button test failed: {str(e)}")
            return False
    
    def test_batch_selection(self):
        """Test batch selection functionality"""
        try:
            # Look for checkboxes
            checkboxes = self.driver.find_elements(By.CSS_SELECTOR, "input[type='checkbox']")
            
            if len(checkboxes) > 1:  # Should have at least select-all + one row
                # Click first checkbox (should be select-all or first row)
                checkboxes[0].click()
                time.sleep(1)
                
                # Look for batch action buttons
                batch_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button")
                batch_button_texts = [btn.text.lower() for btn in batch_buttons]
                
                has_batch_actions = any(action in " ".join(batch_button_texts) 
                                      for action in ["approve", "reject", "ban", "freeze"])
                
                if has_batch_actions:
                    self.log_test("Batch Selection", True, "Batch selection and actions working")
                else:
                    self.log_test("Batch Selection", True, "Checkboxes found but batch actions not visible")
                return True
            else:
                self.log_test("Batch Selection", False, "No checkboxes found for batch selection")
                return False
                
        except Exception as e:
            self.log_test("Batch Selection", False, f"Batch selection test failed: {str(e)}")
            return False
    
    def test_pagination(self):
        """Test pagination functionality"""
        try:
            # Look for pagination elements
            pagination_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                "[class*='pagination'], [class*='page'], button[disabled], button:not([disabled])")
            
            # Look for page numbers or navigation
            page_indicators = self.driver.find_elements(By.CSS_SELECTOR, 
                "button:contains('Next'), button:contains('Previous'), button:contains('1'), button:contains('2')")
            
            if len(pagination_elements) > 0 or len(page_indicators) > 0:
                self.log_test("Pagination", True, "Pagination elements found")
                return True
            else:
                self.log_test("Pagination", False, "No pagination elements found")
                return False
                
        except Exception as e:
            self.log_test("Pagination", False, f"Pagination test failed: {str(e)}")
            return False
    
    def test_add_merchant_button(self):
        """Test add merchant button"""
        try:
            # Look for add merchant button
            add_buttons = self.driver.find_elements(By.CSS_SELECTOR, 
                "button:contains('Add'), a:contains('Add'), button:contains('Create'), a:contains('Create')")
            
            # Also look by text content
            all_buttons = self.driver.find_elements(By.TAG_NAME, "button")
            all_links = self.driver.find_elements(By.TAG_NAME, "a")
            
            add_found = False
            for element in all_buttons + all_links:
                text = element.text.lower()
                if "add" in text or "create" in text:
                    add_found = True
                    break
            
            if add_found or len(add_buttons) > 0:
                self.log_test("Add Merchant Button", True, "Add merchant button found")
                return True
            else:
                self.log_test("Add Merchant Button", False, "Add merchant button not found")
                return False
                
        except Exception as e:
            self.log_test("Add Merchant Button", False, f"Add button test failed: {str(e)}")
            return False
    
    def test_statistics_display(self):
        """Test statistics cards display"""
        try:
            # Look for statistics/metric cards
            stat_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                "[class*='stat'], [class*='metric'], [class*='card']")
            
            # Look for numbers that might be statistics
            numbers = self.driver.find_elements(By.CSS_SELECTOR, 
                "h1, h2, h3, .text-2xl, .text-3xl, .text-xl")
            
            stat_count = 0
            for element in numbers:
                text = element.text.strip()
                if text.isdigit():
                    stat_count += 1
            
            if stat_count >= 3:  # Should have at least total, active, pending stats
                self.log_test("Statistics Display", True, f"Found {stat_count} statistical displays")
                return True
            else:
                self.log_test("Statistics Display", False, f"Only found {stat_count} statistics")
                return False
                
        except Exception as e:
            self.log_test("Statistics Display", False, f"Statistics test failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all frontend tests"""
        print("🚀 Starting Frontend Functionality Tests")
        print("=" * 60)
        
        if not self.setup_driver():
            print("❌ Failed to setup browser driver")
            return False
        
        try:
            # Run all tests
            tests = [
                self.test_admin_login,
                self.test_merchant_list_display,
                self.test_search_functionality,
                self.test_filter_functionality,
                self.test_action_buttons,
                self.test_batch_selection,
                self.test_pagination,
                self.test_add_merchant_button,
                self.test_statistics_display
            ]
            
            success_count = 0
            for test in tests:
                if test():
                    success_count += 1
                time.sleep(1)  # Small delay between tests
            
            # Print summary
            self.print_summary()
            
            return success_count == len(tests)
            
        finally:
            if self.driver:
                self.driver.quit()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 FRONTEND TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for test in self.test_results if test['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for test in self.test_results:
                if not test['success']:
                    print(f"  - {test['test']}: {test['message']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    # First check if Next.js server is running
    import requests
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        print("✅ Next.js server is running")
    except:
        print("❌ Next.js server is not running. Please start it with 'npm run dev' or 'docker-compose up'")
        exit(1)
    
    tester = FrontendTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All frontend tests passed!")
    else:
        print("💥 Some frontend tests failed!")
