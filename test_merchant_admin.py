#!/usr/bin/env python
"""
Comprehensive test script for Merchant Admin functionalities
Tests all CRUD operations, status updates, batch actions, and error handling
"""

import requests
import json
import uuid
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test admin credentials - you may need to adjust these
TEST_ADMIN = {
    "identifier": "admin",
    "password": "admin123"
}

class MerchantAdminTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        self.created_merchant_ids = []
        
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
                self.auth_token = data.get('access') or data.get('access_token') or data.get('token')
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
    
    def test_merchant_list(self):
        """Test merchant listing endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/merchants/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Merchant List", True, 
                             f"Retrieved {len(data.get('results', []))} merchants")
                return data
            else:
                self.log_test("Merchant List", False, 
                             f"Failed to retrieve merchants: {response.text}")
                return None
        except Exception as e:
            self.log_test("Merchant List", False, f"Exception: {str(e)}")
            return None
    
    def test_merchant_statistics(self):
        """Test merchant statistics endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/merchants/statistics/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Merchant Statistics", True, 
                             f"Retrieved statistics: {data.get('total_merchants', 0)} total merchants")
                return data
            else:
                self.log_test("Merchant Statistics", False, 
                             f"Failed to retrieve statistics: {response.text}")
                return None
        except Exception as e:
            self.log_test("Merchant Statistics", False, f"Exception: {str(e)}")
            return None
    
    def test_create_merchant(self):
        """Test merchant creation"""
        merchant_data = {
            "username": f"testmerchant_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123!",
            "confirm_password": "TestPass123!",
            "merchant_name": "Test Merchant Store",
            "owner_name": "Test Owner",
            "phone": "+639123456789",
            "zipcode": "1234",
            "province": "Metro Manila",
            "city_municipality": "Quezon City",
            "barangay": "Test Barangay",
            "street_name": "Test Street",
            "house_number": "123",
            "business_registration": 2,
            "settlement_emails": ["test@example.com"],
            "withdrawal_option": "bank_transfer"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/merchants/create/", json=merchant_data)
            if response.status_code == 201:
                data = response.json()
                merchant_id = data.get('id')
                if merchant_id:
                    self.created_merchant_ids.append(merchant_id)
                self.log_test("Create Merchant", True, 
                             f"Created merchant: {merchant_data['merchant_name']}")
                return data
            else:
                self.log_test("Create Merchant", False, 
                             f"Failed to create merchant: {response.text}")
                return None
        except Exception as e:
            self.log_test("Create Merchant", False, f"Exception: {str(e)}")
            return None
    
    def test_merchant_detail(self, merchant_id):
        """Test merchant detail retrieval"""
        try:
            response = self.session.get(f"{API_BASE}/merchants/{merchant_id}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Merchant Detail", True, 
                             f"Retrieved details for merchant: {data.get('merchant_name', 'Unknown')}")
                return data
            else:
                self.log_test("Merchant Detail", False, 
                             f"Failed to retrieve merchant detail: {response.text}")
                return None
        except Exception as e:
            self.log_test("Merchant Detail", False, f"Exception: {str(e)}")
            return None
    
    def test_update_merchant(self, merchant_id):
        """Test merchant update"""
        update_data = {
            "merchant_name": "Updated Test Merchant Store",
            "owner_name": "Updated Test Owner",
            "phone": "+639987654321"
        }
        
        try:
            response = self.session.patch(f"{API_BASE}/merchants/{merchant_id}/update/", 
                                        json=update_data)
            if response.status_code == 200:
                self.log_test("Update Merchant", True, 
                             f"Successfully updated merchant {merchant_id}")
                return True
            else:
                self.log_test("Update Merchant", False, 
                             f"Failed to update merchant: {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Merchant", False, f"Exception: {str(e)}")
            return False
    
    def test_merchant_status_update(self, merchant_id):
        """Test merchant status update"""
        status_data = {
            "status": 0,  # Active
            "reason": "Approved by automated test"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/merchants/{merchant_id}/status/", 
                                       json=status_data)
            if response.status_code == 200:
                self.log_test("Status Update", True, 
                             f"Successfully updated status for merchant {merchant_id}")
                return True
            else:
                self.log_test("Status Update", False, 
                             f"Failed to update status: {response.text}")
                return False
        except Exception as e:
            self.log_test("Status Update", False, f"Exception: {str(e)}")
            return False
    
    def test_batch_actions(self):
        """Test batch actions on merchants"""
        if len(self.created_merchant_ids) < 1:
            # Try to get existing merchants for batch testing
            try:
                response = self.session.get(f"{API_BASE}/merchants/")
                if response.status_code == 200:
                    data = response.json()
                    merchants = data.get('results', [])
                    if len(merchants) >= 2:
                        merchant_ids = [m['id'] for m in merchants[:2]]
                        batch_data = {
                            "merchant_ids": merchant_ids,
                            "action": "approve",
                            "reason": "Batch approval test"
                        }
                        
                        response = self.session.post(f"{API_BASE}/merchants/batch-action/", 
                                                   json=batch_data)
                        if response.status_code == 200:
                            data = response.json()
                            self.log_test("Batch Actions", True, 
                                         f"Batch action successful: {data.get('message', '')}")
                            return True
                        else:
                            self.log_test("Batch Actions", False, 
                                         f"Batch action failed: {response.text}")
                            return False
                    else:
                        self.log_test("Batch Actions", False, "Not enough existing merchants for batch actions")
                        return False
                else:
                    self.log_test("Batch Actions", False, "Could not retrieve merchants for batch test")
                    return False
            except Exception as e:
                self.log_test("Batch Actions", False, f"Exception: {str(e)}")
                return False
        
        batch_data = {
            "merchant_ids": self.created_merchant_ids[:2],
            "action": "approve",
            "reason": "Batch approval test"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/merchants/batch-action/", 
                                       json=batch_data)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Batch Actions", True, 
                             f"Batch action successful: {data.get('message', '')}")
                return True
            else:
                self.log_test("Batch Actions", False, 
                             f"Batch action failed: {response.text}")
                return False
        except Exception as e:
            self.log_test("Batch Actions", False, f"Exception: {str(e)}")
            return False
    
    def test_merchant_filtering(self):
        """Test merchant list filtering"""
        filters = [
            {"status_filter": "active"},
            {"status_filter": "pending"},
            {"date_from": "2025-01-01"},
            {"search": "test"}
        ]
        
        for filter_params in filters:
            try:
                response = self.session.get(f"{API_BASE}/merchants/", params=filter_params)
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Filter Test ({filter_params})", True, 
                                 f"Filter applied successfully, got {len(data.get('results', []))} results")
                else:
                    self.log_test(f"Filter Test ({filter_params})", False, 
                                 f"Filter failed: {response.text}")
            except Exception as e:
                self.log_test(f"Filter Test ({filter_params})", False, f"Exception: {str(e)}")
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        # Test with invalid merchant ID
        fake_id = str(uuid.uuid4())
        try:
            response = self.session.get(f"{API_BASE}/merchants/{fake_id}/")
            if response.status_code == 404:
                self.log_test("Error Handling - Invalid ID", True, 
                             "Correctly returned 404 for invalid merchant ID")
            else:
                self.log_test("Error Handling - Invalid ID", False, 
                             f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling - Invalid ID", False, f"Exception: {str(e)}")
        
        # Test with invalid status update
        if self.created_merchant_ids:
            invalid_status_data = {"status": 999, "reason": "Invalid status test"}
            try:
                response = self.session.post(f"{API_BASE}/merchants/{self.created_merchant_ids[0]}/status/", 
                                           json=invalid_status_data)
                if response.status_code == 400:
                    self.log_test("Error Handling - Invalid Status", True, 
                                 "Correctly rejected invalid status")
                else:
                    self.log_test("Error Handling - Invalid Status", False, 
                                 f"Expected 400, got {response.status_code}")
            except Exception as e:
                self.log_test("Error Handling - Invalid Status", False, f"Exception: {str(e)}")
    
    def cleanup_test_merchants(self):
        """Clean up test merchants"""
        for merchant_id in self.created_merchant_ids:
            try:
                delete_data = {"reason": "Test cleanup"}
                response = self.session.delete(f"{API_BASE}/merchants/{merchant_id}/delete/", 
                                             json=delete_data)
                if response.status_code == 200:
                    self.log_test("Cleanup", True, f"Deleted test merchant {merchant_id}")
                else:
                    self.log_test("Cleanup", False, 
                                 f"Failed to delete merchant {merchant_id}: {response.text}")
            except Exception as e:
                self.log_test("Cleanup", False, f"Cleanup exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting Merchant Admin Functionality Tests")
        print("=" * 60)
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Test basic listing and statistics
        merchant_list_data = self.test_merchant_list()
        self.test_merchant_statistics()
        
        # Test merchant creation
        created_merchant = self.test_create_merchant()
        
        if created_merchant and created_merchant.get('id'):
            merchant_id = created_merchant['id']
            
            # Test detail retrieval
            self.test_merchant_detail(merchant_id)
            
            # Test updates
            self.test_update_merchant(merchant_id)
            
            # Test status updates
            self.test_merchant_status_update(merchant_id)
        
        # Test with existing merchants from list if available
        if merchant_list_data and merchant_list_data.get('results'):
            existing_merchants = merchant_list_data['results']
            if len(existing_merchants) > 0:
                existing_merchant_id = existing_merchants[0]['id']
                
                # Test detail retrieval on existing merchant
                self.test_merchant_detail(existing_merchant_id)
                
                # Test update on existing merchant
                self.test_update_merchant(existing_merchant_id)
        
        # Create another merchant for batch testing
        created_merchant2 = self.test_create_merchant()
        
        # Test batch actions
        self.test_batch_actions()
        
        # Test filtering
        self.test_merchant_filtering()
        
        # Test error handling
        self.test_error_handling()
        
        # Clean up created merchants
        self.cleanup_test_merchants()
        
        # Print summary
        self.print_summary()
        
        return all(test['success'] for test in self.test_results)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
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
    tester = MerchantAdminTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("💥 Some tests failed!")
        sys.exit(1)
