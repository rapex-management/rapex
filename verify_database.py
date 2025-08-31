#!/usr/bin/env python
"""
Database Verification Script
Verifies that all merchant admin actions are properly reflected in the database
"""

import requests
import json

class DatabaseVerifier:
    def __init__(self):
        self.session = requests.Session()
        self.backend_base = "http://localhost:8000/api"
        self.auth_token = None
        
    def authenticate(self):
        """Authenticate with admin credentials"""
        try:
            response = self.session.post(
                f"{self.backend_base}/auth/admin/login/",
                json={"identifier": "admin", "password": "admin123"}
            )
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access')
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                print("✅ Database connection authenticated")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def verify_merchant_data(self):
        """Verify merchant data in database"""
        try:
            response = self.session.get(f"{self.backend_base}/merchants")
            if response.status_code == 200:
                data = response.json()
                merchants = data.get('results', [])
                print(f"✅ Database contains {len(merchants)} merchants")
                
                # Check status distribution
                status_counts = {}
                for merchant in merchants:
                    status = merchant.get('status', 'unknown')
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                print("📊 Status Distribution:")
                for status, count in status_counts.items():
                    status_name = {
                        0: "Pending",
                        1: "Active", 
                        2: "Rejected",
                        3: "Suspended"
                    }.get(status, f"Status {status}")
                    print(f"   {status_name}: {count}")
                
                return True
            else:
                print(f"❌ Failed to fetch merchants: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Database verification error: {str(e)}")
            return False
    
    def verify_recent_actions(self):
        """Check for recent merchant actions"""
        try:
            response = self.session.get(f"{self.backend_base}/merchants?ordering=-updated_at&page_size=5")
            if response.status_code == 200:
                data = response.json()
                recent_merchants = data.get('results', [])
                print(f"\n🕐 Most Recently Updated Merchants:")
                for merchant in recent_merchants:
                    name = merchant.get('merchant_name', 'Unknown')
                    updated = merchant.get('updated_at', 'Unknown')
                    status = merchant.get('status', 'Unknown')
                    print(f"   {name} - Status: {status} - Updated: {updated[:19]}")
                return True
            else:
                print(f"❌ Failed to fetch recent actions: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Recent actions verification error: {str(e)}")
            return False
    
    def verify_database_integrity(self):
        """Verify database integrity and consistency"""
        try:
            # Check statistics endpoint
            stats_response = self.session.get(f"{self.backend_base}/merchants/statistics")
            if stats_response.status_code == 200:
                stats = stats_response.json()
                print(f"\n📈 Database Statistics:")
                print(f"   Total Merchants: {stats.get('total_merchants', 0)}")
                print(f"   Active: {stats.get('active_merchants', 0)}")
                print(f"   Pending: {stats.get('pending_merchants', 0)}")
                print(f"   Rejected: {stats.get('rejected_merchants', 0)}")
                print(f"   Suspended: {stats.get('suspended_merchants', 0)}")
                return True
            else:
                print(f"❌ Failed to fetch statistics: {stats_response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Database integrity check error: {str(e)}")
            return False
    
    def test_action_reflection(self):
        """Test that actions are properly reflected in database"""
        try:
            # Get a merchant to test with
            response = self.session.get(f"{self.backend_base}/merchants?page_size=1")
            if response.status_code == 200:
                data = response.json()
                merchants = data.get('results', [])
                if merchants:
                    merchant = merchants[0]
                    merchant_id = merchant['id']
                    original_status = merchant['status']
                    
                    print(f"\n🔬 Testing Action Reflection:")
                    print(f"   Testing with merchant: {merchant.get('merchant_name', 'Unknown')}")
                    print(f"   Original status: {original_status}")
                    
                    # Test status update
                    new_status = 1 if original_status != 1 else 0
                    update_response = self.session.post(
                        f"{self.backend_base}/merchants/{merchant_id}/status/",
                        json={"status": new_status, "reason": "Database verification test"}
                    )
                    
                    if update_response.status_code == 200:
                        # Verify the change
                        verify_response = self.session.get(f"{self.backend_base}/merchants/{merchant_id}")
                        if verify_response.status_code == 200:
                            updated_merchant = verify_response.json()
                            current_status = updated_merchant['status']
                            if current_status == new_status:
                                print(f"   ✅ Status successfully updated to: {current_status}")
                                
                                # Restore original status
                                restore_response = self.session.post(
                                    f"{self.backend_base}/merchants/{merchant_id}/status/",
                                    json={"status": original_status, "reason": "Restore after test"}
                                )
                                if restore_response.status_code == 200:
                                    print(f"   ✅ Status restored to original: {original_status}")
                                return True
                            else:
                                print(f"   ❌ Status not updated correctly: expected {new_status}, got {current_status}")
                                return False
                        else:
                            print(f"   ❌ Failed to verify status change: {verify_response.status_code}")
                            return False
                    else:
                        print(f"   ❌ Failed to update status: {update_response.status_code}")
                        return False
                else:
                    print("   ❌ No merchants available for testing")
                    return False
            else:
                print(f"   ❌ Failed to fetch merchants for testing: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Action reflection test error: {str(e)}")
            return False
    
    def run_verification(self):
        """Run complete database verification"""
        print("🔍 RAPEX Database Verification")
        print("=" * 50)
        
        if not self.authenticate():
            return False
        
        success_count = 0
        tests = [
            ("Merchant Data Verification", self.verify_merchant_data),
            ("Recent Actions Check", self.verify_recent_actions),
            ("Database Integrity Check", self.verify_database_integrity),
            ("Action Reflection Test", self.test_action_reflection)
        ]
        
        for test_name, test_func in tests:
            print(f"\n🧪 {test_name}:")
            if test_func():
                success_count += 1
        
        print("\n" + "=" * 50)
        print(f"📊 Verification Summary: {success_count}/{len(tests)} tests passed")
        
        if success_count == len(tests):
            print("🎉 All database verifications passed!")
            print("✅ All merchant admin actions are properly reflected in the database")
        else:
            print("⚠️ Some database verifications failed")
        
        return success_count == len(tests)

if __name__ == "__main__":
    verifier = DatabaseVerifier()
    verifier.run_verification()
