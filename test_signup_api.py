#!/usr/bin/env python
"""
Test script for merchant signup API
"""
import requests
import json

# Base URL for the API
BASE_URL = "http://localhost:8000/api"

def test_merchant_signup():
    """Test the merchant signup endpoint"""
    url = f"{BASE_URL}/auth/merchant/signup/"
    
    # Test data with correct field names
    form_data = {
        "username": "testmerchant123",
        "email": "test@merchant.com",
        "password": "TestPassword123!",
        "merchantName": "Test Food Stall",
        "ownerName": "John Doe",
        "phone": "+639123456789",
        "mccCategory": "0",  # Food Stall
        "zipcode": "1234",
        "province": "Metro Manila",
        "city_municipality": "Quezon City",
        "barangay": "Barangay Test",
        "street_name": "Test Street",
        "house_number": "123",
        "latitude": "14.6760",
        "longitude": "121.0437"
    }
    
    # Create a dummy file for testing
    files = {
        'document_0': ('test_document.pdf', b'dummy file content', 'application/pdf')
    }
    
    try:
        response = requests.post(url, data=form_data, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Merchant signup test PASSED")
            return True
        else:
            print("❌ Merchant signup test FAILED")
            return False
            
    except Exception as e:
        print(f"❌ Error testing signup: {e}")
        return False

def test_otp_verification():
    """Test the OTP verification endpoint"""
    url = f"{BASE_URL}/auth/merchant/verify-otp/"
    
    data = {
        "email": "test@merchant.com",
        "otp_code": "123456",
        "purpose": "merchant_signup"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code in [200, 400]:  # 400 is expected for invalid OTP
            print("✅ OTP verification endpoint test PASSED")
            return True
        else:
            print("❌ OTP verification endpoint test FAILED")
            return False
            
    except Exception as e:
        print(f"❌ Error testing OTP verification: {e}")
        return False

if __name__ == "__main__":
    print("Testing Merchant Signup API Endpoints...")
    print("=" * 50)
    
    # Test signup
    print("\n1. Testing Merchant Signup:")
    signup_result = test_merchant_signup()
    
    # Test OTP verification
    print("\n2. Testing OTP Verification:")
    otp_result = test_otp_verification()
    
    print("\n" + "=" * 50)
    print("Test Summary:")
    print(f"Signup API: {'✅ PASS' if signup_result else '❌ FAIL'}")
    print(f"OTP API: {'✅ PASS' if otp_result else '❌ FAIL'}")
