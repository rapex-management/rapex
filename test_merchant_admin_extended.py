#!/usr/bin/env python
"""
Extended test script for specific merchant admin functionalities that need verification
"""

import requests
import json
import uuid
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test admin credentials
TEST_ADMIN = {
    "identifier": "admin",
    "password": "admin123"
}

class ExtendedMerchantAdminTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message="", data=None):
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        
    def authenticate(self):
        """Authenticate as admin user"""
        try:
            response = self.session.post(f"{API_BASE}/auth/admin/login/", json=TEST_ADMIN)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access')
                if self.auth_token:
                    self.session.headers.update({
                        'Authorization': f'Bearer {self.auth_token}'
                    })
                    self.log_test("Authentication", True, "Successfully authenticated as admin")
                    return True
                else:
                    self.log_test("Authentication", False, "No token in response")
                    return False
            else:
                self.log_test("Authentication", False, f"Login failed: {response.text}")
                return False
        except Exception as e:
            self.log_test("Authentication", False, f"Authentication error: {str(e)}")
            return False

    def test_all_status_updates(self):
        """Test all possible status updates"""
        # Get a merchant to test with
        response = self.session.get(f"{API_BASE}/merchants/")
        if response.status_code != 200:
            self.log_test("Status Updates Setup", False, "Could not retrieve merchants")
            return False
        
        data = response.json()
        merchants = data.get('results', [])
        if not merchants:
            self.log_test("Status Updates Setup", False, "No merchants available for testing")
            return False
        
        merchant_id = merchants[0]['id']
        
        # Test all status values
        status_tests = [
            (0, "Active"),
            (1, "Banned"),
            (2, "Frozen"),
            (3, "Deleted"),
            (4, "Unverified"),
            (5, "Pending"),
            (6, "Rejected")
        ]
        
        for status_code, status_name in status_tests:
            try:
                status_data = {
                    "status": status_code,
                    "reason": f"Testing {status_name} status change"
                }
                
                response = self.session.post(f"{API_BASE}/merchants/{merchant_id}/status/", 
                                           json=status_data)
                if response.status_code == 200:
                    self.log_test(f"Status Update to {status_name}", True, 
                                 f"Successfully updated to {status_name}")
                else:
                    self.log_test(f"Status Update to {status_name}", False, 
                                 f"Failed: {response.text}")
            except Exception as e:
                self.log_test(f"Status Update to {status_name}", False, f"Exception: {str(e)}")

    def test_all_batch_actions(self):
        """Test all batch action types"""
        # Get merchants for batch testing
        response = self.session.get(f"{API_BASE}/merchants/")
        if response.status_code != 200:
            self.log_test("Batch Actions Setup", False, "Could not retrieve merchants")
            return False
        
        data = response.json()
        merchants = data.get('results', [])
        if len(merchants) < 2:
            self.log_test("Batch Actions Setup", False, "Not enough merchants for batch testing")
            return False
        
        merchant_ids = [m['id'] for m in merchants[:2]]
        
        # Test all batch actions
        batch_actions = [
            "approve",
            "reject", 
            "ban",
            "freeze",
            "delete",
            "activate"
        ]
        
        for action in batch_actions:
            try:
                batch_data = {
                    "merchant_ids": merchant_ids,
                    "action": action,
                    "reason": f"Testing {action} batch action"
                }
                
                response = self.session.post(f"{API_BASE}/merchants/batch-action/", 
                                           json=batch_data)
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Batch {action.title()}", True, 
                                 f"Success: {data.get('message', '')}")
                else:
                    self.log_test(f"Batch {action.title()}", False, 
                                 f"Failed: {response.text}")
            except Exception as e:
                self.log_test(f"Batch {action.title()}", False, f"Exception: {str(e)}")

    def test_merchant_delete(self):
        """Test merchant deletion/archiving"""
        # Get a merchant to delete
        response = self.session.get(f"{API_BASE}/merchants/")
        if response.status_code != 200:
            self.log_test("Delete Setup", False, "Could not retrieve merchants")
            return False
        
        data = response.json()
        merchants = data.get('results', [])
        if not merchants:
            self.log_test("Delete Setup", False, "No merchants available for deletion test")
            return False
        
        merchant_id = merchants[-1]['id']  # Use last merchant
        
        try:
            delete_data = {"reason": "Testing merchant deletion"}
            response = self.session.delete(f"{API_BASE}/merchants/{merchant_id}/delete/", 
                                         json=delete_data)
            if response.status_code == 200:
                self.log_test("Merchant Delete", True, "Successfully archived merchant")
            else:
                self.log_test("Merchant Delete", False, f"Failed: {response.text}")
        except Exception as e:
            self.log_test("Merchant Delete", False, f"Exception: {str(e)}")

    def test_input_validation(self):
        """Test input validation and edge cases"""
        # Test invalid merchant creation data
        invalid_merchant_data = {
            "username": "",  # Empty username
            "email": "invalid-email",  # Invalid email
            "password": "123",  # Short password
            "confirm_password": "456",  # Mismatched password
            "merchant_name": "",  # Empty merchant name
            "phone": "invalid-phone"  # Invalid phone
        }
        
        try:
            response = self.session.post(f"{API_BASE}/merchants/create/", json=invalid_merchant_data)
            if response.status_code == 400:
                self.log_test("Input Validation - Create", True, 
                             "Correctly rejected invalid merchant data")
            else:
                self.log_test("Input Validation - Create", False, 
                             f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Input Validation - Create", False, f"Exception: {str(e)}")
        
        # Test invalid status update
        fake_id = str(uuid.uuid4())
        invalid_status_data = {"status": 999}
        
        try:
            response = self.session.post(f"{API_BASE}/merchants/{fake_id}/status/", 
                                       json=invalid_status_data)
            if response.status_code in [400, 404]:
                self.log_test("Input Validation - Status", True, 
                             "Correctly rejected invalid status data")
            else:
                self.log_test("Input Validation - Status", False, 
                             f"Expected 400/404, got {response.status_code}")
        except Exception as e:
            self.log_test("Input Validation - Status", False, f"Exception: {str(e)}")
        
        # Test invalid batch action data
        invalid_batch_data = {
            "merchant_ids": ["invalid-uuid"],
            "action": "invalid_action"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/merchants/batch-action/", 
                                       json=invalid_batch_data)
            if response.status_code == 400:
                self.log_test("Input Validation - Batch", True, 
                             "Correctly rejected invalid batch data")
            else:
                self.log_test("Input Validation - Batch", False, 
                             f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Input Validation - Batch", False, f"Exception: {str(e)}")

    def test_statistics_details(self):
        """Test detailed statistics functionality"""
        try:
            response = self.session.get(f"{API_BASE}/merchants/statistics/")
            if response.status_code == 200:
                data = response.json()
                required_fields = [
                    'total_merchants', 'by_status', 'by_business_registration',
                    'recent_registrations', 'pending_verification', 'top_provinces'
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Statistics Details", True, 
                                 f"All required statistics fields present: {required_fields}")
                else:
                    self.log_test("Statistics Details", False, 
                                 f"Missing fields: {missing_fields}")
            else:
                self.log_test("Statistics Details", False, f"Failed: {response.text}")
        except Exception as e:
            self.log_test("Statistics Details", False, f"Exception: {str(e)}")

    def test_pagination_and_sorting(self):
        """Test pagination and sorting functionality"""
        # Test pagination
        try:
            response = self.session.get(f"{API_BASE}/merchants/?page=1&page_size=2")
            if response.status_code == 200:
                data = response.json()
                if 'results' in data and len(data['results']) <= 2:
                    self.log_test("Pagination", True, "Pagination working correctly")
                else:
                    self.log_test("Pagination", False, "Pagination not working properly")
            else:
                self.log_test("Pagination", False, f"Failed: {response.text}")
        except Exception as e:
            self.log_test("Pagination", False, f"Exception: {str(e)}")
        
        # Test sorting
        try:
            response = self.session.get(f"{API_BASE}/merchants/?ordering=-date_joined")
            if response.status_code == 200:
                self.log_test("Sorting", True, "Sorting by date_joined working")
            else:
                self.log_test("Sorting", False, f"Failed: {response.text}")
        except Exception as e:
            self.log_test("Sorting", False, f"Exception: {str(e)}")

    def run_extended_tests(self):
        """Run all extended test scenarios"""
        print("🔧 Starting Extended Merchant Admin Tests")
        print("=" * 60)
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run specific tests
        self.test_all_status_updates()
        self.test_all_batch_actions()
        self.test_merchant_delete()
        self.test_input_validation()
        self.test_statistics_details()
        self.test_pagination_and_sorting()
        
        # Print summary
        self.print_summary()
        
        return all(test['success'] for test in self.test_results)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 EXTENDED TEST SUMMARY")
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
    tester = ExtendedMerchantAdminTester()
    success = tester.run_extended_tests()
    
    if success:
        print("🎉 All extended tests passed!")
        sys.exit(0)
    else:
        print("💥 Some extended tests failed!")
        sys.exit(1)
