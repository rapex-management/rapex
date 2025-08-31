#!/usr/bin/env python
"""
Merchant Login Flow Test
Tests the complete merchant login and dashboard flow
"""

import requests
import json
import time

class MerchantFlowTester:
    def __init__(self):
        self.session = requests.Session()
        self.frontend_base = "http://localhost:3000"
        self.backend_base = "http://localhost:8000/api"
        self.test_results = []
        
    def log_test(self, test_name, success, message="", data=None):
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "data": data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
    
    def test_merchant_registration(self):
        """Test merchant registration to create a test account"""
        try:
            import uuid
            unique_id = uuid.uuid4().hex[:8]
            
            registration_data = {
                "username": f"testmerchant_{unique_id}",
                "email": f"test_{unique_id}@example.com",
                "password": "TestPass123!",
                "confirm_password": "TestPass123!",
                "merchant_name": f"Test Merchant {unique_id}",
                "owner_name": "Test Owner",
                "phone": "+639123456789",
                "zipcode": "1234",
                "province": "Metro Manila",
                "city_municipality": "Quezon City",
                "barangay": "Test Barangay",
                "street_name": "Test Street",
                "house_number": "123",
                "business_registration": 2
            }
            
            response = self.session.post(
                f"{self.frontend_base}/api/proxy/merchants/create",
                json=registration_data
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.test_merchant = {
                    "username": registration_data["username"],
                    "email": registration_data["email"],
                    "password": registration_data["password"]
                }
                self.log_test("Merchant Registration", True, f"Created test merchant: {registration_data['username']}")
                return True
            else:
                self.log_test("Merchant Registration", False, f"Registration failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Merchant Registration", False, f"Registration error: {str(e)}")
            return False
    
    def test_merchant_login_api(self):
        """Test merchant login through frontend API"""
        try:
            # Use existing merchant credentials or create new ones
            if not hasattr(self, 'test_merchant'):
                # Try with a standard test account
                self.test_merchant = {
                    "username": "admin",  # Try with admin first
                    "email": "admin",
                    "password": "admin123"
                }
            
            login_data = {
                "identifier": self.test_merchant["username"],
                "password": self.test_merchant["password"]
            }
            
            response = self.session.post(
                f"{self.frontend_base}/api/proxy/merchant/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access')
                if self.auth_token:
                    self.log_test("Merchant Login API", True, "Login successful, token received")
                    return True
                else:
                    self.log_test("Merchant Login API", False, "No access token in response")
                    return False
            else:
                # Try creating a new test merchant
                if self.test_merchant["username"] != "admin" or not hasattr(self, 'registration_attempted'):
                    self.registration_attempted = True
                    if self.test_merchant_registration():
                        return self.test_merchant_login_api()
                
                self.log_test("Merchant Login API", False, f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Merchant Login API", False, f"Login error: {str(e)}")
            return False
    
    def test_dashboard_endpoint(self):
        """Test merchant dashboard API endpoint"""
        try:
            if not hasattr(self, 'auth_token') or not self.auth_token:
                self.log_test("Dashboard Endpoint", False, "No auth token available")
                return False
            
            response = self.session.get(
                f"{self.frontend_base}/api/proxy/merchant/dashboard",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['merchant_info', 'statistics']
                
                if all(field in data for field in required_fields):
                    self.log_test("Dashboard Endpoint", True, f"Dashboard data loaded successfully")
                    return True
                else:
                    self.log_test("Dashboard Endpoint", False, "Dashboard missing required fields")
                    return False
            else:
                self.log_test("Dashboard Endpoint", False, f"Dashboard API failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Endpoint", False, f"Dashboard error: {str(e)}")
            return False
    
    def test_frontend_pages(self):
        """Test frontend page accessibility"""
        try:
            pages_to_test = [
                ("/merchant/login", "Merchant Login Page"),
                ("/merchant/dashboard", "Merchant Dashboard Page"),
                ("/merchant", "Merchant Index Page")
            ]
            
            all_passed = True
            for path, name in pages_to_test:
                try:
                    response = requests.get(f"{self.frontend_base}{path}", timeout=10)
                    if response.status_code == 200:
                        self.log_test(f"Frontend - {name}", True, f"Page accessible at {path}")
                    else:
                        self.log_test(f"Frontend - {name}", False, f"Page returned {response.status_code}")
                        all_passed = False
                except Exception as e:
                    self.log_test(f"Frontend - {name}", False, f"Page error: {str(e)}")
                    all_passed = False
            
            return all_passed
            
        except Exception as e:
            self.log_test("Frontend Pages", False, f"Frontend test error: {str(e)}")
            return False
    
    def test_redirect_functionality(self):
        """Test that dashboard redirect works"""
        try:
            response = requests.get(f"{self.frontend_base}/merchant/dashboard", allow_redirects=False)
            
            # Check if it's a redirect or if the page loads
            if response.status_code in [200, 302, 307]:
                self.log_test("Dashboard Redirect", True, "Dashboard route is functional")
                return True
            else:
                self.log_test("Dashboard Redirect", False, f"Dashboard route failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Redirect", False, f"Redirect test error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run complete merchant login flow test"""
        print("🚀 Starting Merchant Login Flow Tests")
        print("=" * 60)
        
        tests = [
            ("Frontend Pages", self.test_frontend_pages),
            ("Dashboard Redirect", self.test_redirect_functionality),
            ("Merchant Login API", self.test_merchant_login_api),
            ("Dashboard Endpoint", self.test_dashboard_endpoint),
        ]
        
        success_count = 0
        for test_name, test_func in tests:
            print(f"\n🧪 Running {test_name}...")
            if test_func():
                success_count += 1
            time.sleep(1)
        
        self.print_summary()
        return success_count == len(tests)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 MERCHANT FLOW TEST SUMMARY")
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
        
        print("\n🎯 MERCHANT DASHBOARD STATUS:")
        if passed_tests == total_tests:
            print("✅ Merchant dashboard is FULLY FUNCTIONAL!")
            print("✅ Login → Dashboard flow is working perfectly!")
            print("✅ All API endpoints are operational!")
        else:
            print("⚠️ Some issues detected in merchant flow")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = MerchantFlowTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All merchant flow tests passed! Dashboard is ready!")
    else:
        print("💥 Some tests failed - check the issues above")
