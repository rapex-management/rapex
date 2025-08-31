#!/usr/bin/env python
"""
Comprehensive Frontend API Integration Test
Tests all merchant admin functionalities through the frontend API proxy
"""

import requests
import json
import time

class FrontendAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.frontend_base = "http://localhost:3000"
        self.test_results = []
        self.auth_token = None
        
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
    
    def test_frontend_accessibility(self):
        """Test if frontend is accessible"""
        try:
            response = requests.get(f"{self.frontend_base}/admin/login", timeout=10)
            if response.status_code == 200:
                self.log_test("Frontend Accessibility", True, "Frontend is accessible")
                return True
            else:
                self.log_test("Frontend Accessibility", False, f"Frontend returned {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Frontend Accessibility", False, f"Cannot reach frontend: {str(e)}")
            return False
    
    def test_admin_login_api(self):
        """Test admin login through frontend proxy"""
        try:
            login_data = {
                "identifier": "admin",
                "password": "admin123"
            }
            
            response = self.session.post(
                f"{self.frontend_base}/api/proxy/admin/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access')
                if self.auth_token:
                    self.session.headers.update({
                        'Authorization': f'Bearer {self.auth_token}'
                    })
                    self.log_test("Admin Login API", True, "Successfully authenticated through frontend")
                    return True
                else:
                    self.log_test("Admin Login API", False, "No access token in response")
                    return False
            else:
                self.log_test("Admin Login API", False, f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login API", False, f"Login API error: {str(e)}")
            return False
    
    def test_merchant_list_api(self):
        """Test merchant list API through frontend proxy"""
        try:
            response = self.session.get(
                f"{self.frontend_base}/api/proxy/merchants",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                merchant_count = len(data.get('results', []))
                self.log_test("Merchant List API", True, f"Retrieved {merchant_count} merchants")
                return True
            else:
                self.log_test("Merchant List API", False, f"API failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Merchant List API", False, f"API error: {str(e)}")
            return False
    
    def test_merchant_statistics_api(self):
        """Test merchant statistics API"""
        try:
            response = self.session.get(
                f"{self.frontend_base}/api/proxy/merchants/statistics",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                total_merchants = data.get('total_merchants', 0)
                self.log_test("Statistics API", True, f"Statistics retrieved: {total_merchants} total merchants")
                return True
            else:
                self.log_test("Statistics API", False, f"Statistics API failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Statistics API", False, f"Statistics API error: {str(e)}")
            return False
    
    def test_merchant_filtering_api(self):
        """Test merchant filtering through API"""
        try:
            # Test with various filters
            filters = [
                {"status_filter": "active"},
                {"status_filter": "pending"},
                {"search": "test"},
                {"page": "1", "page_size": "5"}
            ]
            
            for filter_params in filters:
                response = self.session.get(
                    f"{self.frontend_base}/api/proxy/merchants",
                    params=filter_params,
                    headers={"Authorization": f"Bearer {self.auth_token}"}
                )
                
                if response.status_code != 200:
                    self.log_test("Filtering API", False, f"Filter {filter_params} failed: {response.status_code}")
                    return False
            
            self.log_test("Filtering API", True, "All filter combinations work")
            return True
            
        except Exception as e:
            self.log_test("Filtering API", False, f"Filtering API error: {str(e)}")
            return False
    
    def test_merchant_detail_api(self):
        """Test merchant detail API"""
        try:
            # First get a merchant ID
            response = self.session.get(
                f"{self.frontend_base}/api/proxy/merchants",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                merchants = data.get('results', [])
                if merchants:
                    merchant_id = merchants[0]['id']
                    
                    # Now get merchant details
                    detail_response = self.session.get(
                        f"{self.frontend_base}/api/proxy/merchants/{merchant_id}",
                        headers={"Authorization": f"Bearer {self.auth_token}"}
                    )
                    
                    if detail_response.status_code == 200:
                        self.log_test("Merchant Detail API", True, f"Retrieved details for merchant {merchant_id}")
                        return True
                    else:
                        self.log_test("Merchant Detail API", False, f"Detail API failed: {detail_response.status_code}")
                        return False
                else:
                    self.log_test("Merchant Detail API", False, "No merchants to test with")
                    return False
            else:
                self.log_test("Merchant Detail API", False, "Cannot get merchant list for detail test")
                return False
                
        except Exception as e:
            self.log_test("Merchant Detail API", False, f"Detail API error: {str(e)}")
            return False
    
    def test_merchant_status_update_api(self):
        """Test merchant status update API"""
        try:
            # Get a merchant to test with
            response = self.session.get(
                f"{self.frontend_base}/api/proxy/merchants",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                merchants = data.get('results', [])
                if merchants:
                    merchant_id = merchants[0]['id']
                    
                    # Test status update
                    status_response = self.session.post(
                        f"{self.frontend_base}/api/proxy/merchants/{merchant_id}/status",
                        json={"status": 0, "reason": "Frontend API test"},
                        headers={"Authorization": f"Bearer {self.auth_token}"}
                    )
                    
                    if status_response.status_code == 200:
                        self.log_test("Status Update API", True, "Status update successful")
                        return True
                    else:
                        self.log_test("Status Update API", False, f"Status update failed: {status_response.status_code}")
                        return False
                else:
                    self.log_test("Status Update API", False, "No merchants to test with")
                    return False
            else:
                self.log_test("Status Update API", False, "Cannot get merchant list for status test")
                return False
                
        except Exception as e:
            self.log_test("Status Update API", False, f"Status update API error: {str(e)}")
            return False
    
    def test_batch_action_api(self):
        """Test batch action API"""
        try:
            # Get merchants for batch test
            response = self.session.get(
                f"{self.frontend_base}/api/proxy/merchants",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                merchants = data.get('results', [])
                if len(merchants) >= 2:
                    merchant_ids = [m['id'] for m in merchants[:2]]
                    
                    # Test batch action
                    batch_response = self.session.post(
                        f"{self.frontend_base}/api/proxy/merchants/batch-action",
                        json={
                            "merchant_ids": merchant_ids,
                            "action": "approve",
                            "reason": "Frontend API batch test"
                        },
                        headers={"Authorization": f"Bearer {self.auth_token}"}
                    )
                    
                    if batch_response.status_code == 200:
                        self.log_test("Batch Action API", True, "Batch action successful")
                        return True
                    else:
                        self.log_test("Batch Action API", False, f"Batch action failed: {batch_response.status_code}")
                        return False
                else:
                    self.log_test("Batch Action API", False, "Not enough merchants for batch test")
                    return False
            else:
                self.log_test("Batch Action API", False, "Cannot get merchant list for batch test")
                return False
                
        except Exception as e:
            self.log_test("Batch Action API", False, f"Batch action API error: {str(e)}")
            return False
    
    def test_merchant_creation_api(self):
        """Test merchant creation API"""
        try:
            import uuid
            unique_id = uuid.uuid4().hex[:8]
            
            create_data = {
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
                json=create_data,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code in [200, 201]:
                self.log_test("Merchant Creation API", True, "Merchant created successfully")
                return True
            else:
                self.log_test("Merchant Creation API", False, f"Creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Merchant Creation API", False, f"Creation API error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all frontend API tests"""
        print("🚀 Starting Frontend API Integration Tests")
        print("=" * 60)
        
        tests = [
            self.test_frontend_accessibility,
            self.test_admin_login_api,
            self.test_merchant_list_api,
            self.test_merchant_statistics_api,
            self.test_merchant_filtering_api,
            self.test_merchant_detail_api,
            self.test_merchant_status_update_api,
            self.test_batch_action_api,
            self.test_merchant_creation_api
        ]
        
        success_count = 0
        for test in tests:
            if test():
                success_count += 1
            time.sleep(1)  # Small delay between tests
        
        self.print_summary()
        return success_count == len(tests)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 FRONTEND API TEST SUMMARY")
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
    tester = FrontendAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All frontend API tests passed!")
    else:
        print("💥 Some frontend API tests failed - these need to be fixed!")
