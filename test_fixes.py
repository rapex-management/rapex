#!/usr/bin/env python
"""
Quick test script to verify the fixes work
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test admin credentials
TEST_ADMIN = {
    "identifier": "admin",
    "password": "admin123"
}

def test_fixes():
    session = requests.Session()
    
    # Authenticate
    print("🔐 Authenticating...")
    response = session.post(f"{API_BASE}/auth/admin/login/", json=TEST_ADMIN)
    if response.status_code == 200:
        data = response.json()
        auth_token = data.get('access')
        session.headers.update({'Authorization': f'Bearer {auth_token}'})
        print("✅ Authentication successful")
    else:
        print("❌ Authentication failed")
        return False
    
    # Test pagination
    print("\n📄 Testing pagination...")
    response = session.get(f"{API_BASE}/merchants/?page=1&page_size=2")
    if response.status_code == 200:
        data = response.json()
        if 'results' in data and 'count' in data:
            print(f"✅ Pagination working: {len(data['results'])} results, total: {data['count']}")
        else:
            print("❌ Pagination response format issue")
    else:
        print(f"❌ Pagination failed: {response.status_code}")
    
    # Test status update
    print("\n🔄 Testing status update...")
    # Get a merchant to test with
    response = session.get(f"{API_BASE}/merchants/")
    if response.status_code == 200:
        data = response.json()
        merchants = data.get('results', [])
        if merchants:
            merchant_id = merchants[0]['id']
            status_data = {"status": 0, "reason": "Test status update"}
            response = session.post(f"{API_BASE}/merchants/{merchant_id}/status/", json=status_data)
            if response.status_code == 200:
                print("✅ Status update working")
            else:
                print(f"❌ Status update failed: {response.status_code} - {response.text}")
        else:
            print("❌ No merchants found for status test")
    else:
        print("❌ Could not retrieve merchants for status test")
    
    # Test batch action with valid data
    print("\n📦 Testing batch action...")
    response = session.get(f"{API_BASE}/merchants/")
    if response.status_code == 200:
        data = response.json()
        merchants = data.get('results', [])
        if len(merchants) >= 2:
            merchant_ids = [m['id'] for m in merchants[:2]]
            batch_data = {
                "merchant_ids": merchant_ids,
                "action": "approve",
                "reason": "Batch test"
            }
            response = session.post(f"{API_BASE}/merchants/batch-action/", json=batch_data)
            if response.status_code == 200:
                print("✅ Batch action working")
            else:
                print(f"❌ Batch action failed: {response.status_code} - {response.text}")
        else:
            print("❌ Not enough merchants for batch test")
    else:
        print("❌ Could not retrieve merchants for batch test")
    
    print("\n🎉 Fix verification complete!")

if __name__ == "__main__":
    test_fixes()
