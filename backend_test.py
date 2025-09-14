#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Airdrop Daily Tracker
Tests all backend endpoints with various scenarios including valid/invalid requests and edge cases.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import time

# Backend URL from environment
BACKEND_URL = "https://token-tracker-app.preview.emergentagent.com/api"

class AirdropAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_results = []
        self.sample_user_id = str(uuid.uuid4())
        self.sample_airdrop_id = None
        self.sample_task_id = None
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def test_get_airdrops(self):
        """Test GET /api/airdrops endpoint"""
        print("\n=== Testing GET /api/airdrops ===")
        
        try:
            # Test 1: Get all airdrops
            response = requests.get(f"{self.base_url}/airdrops", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.sample_airdrop_id = data[0].get('id')
                    self.sample_task_id = data[0].get('tasks', [{}])[0].get('id') if data[0].get('tasks') else None
                    self.log_test("GET /api/airdrops - All airdrops", True, 
                                f"Retrieved {len(data)} airdrops", {"count": len(data)})
                else:
                    self.log_test("GET /api/airdrops - All airdrops", False, 
                                "No airdrops returned or invalid format")
            else:
                self.log_test("GET /api/airdrops - All airdrops", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/airdrops - All airdrops", False, f"Exception: {str(e)}")
            
        try:
            # Test 2: Filter by blockchain
            response = requests.get(f"{self.base_url}/airdrops?blockchain=ethereum", timeout=10)
            if response.status_code == 200:
                data = response.json()
                ethereum_airdrops = [a for a in data if a.get('blockchain') == 'ethereum']
                self.log_test("GET /api/airdrops - Filter by blockchain", True, 
                            f"Retrieved {len(ethereum_airdrops)} ethereum airdrops")
            else:
                self.log_test("GET /api/airdrops - Filter by blockchain", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/airdrops - Filter by blockchain", False, f"Exception: {str(e)}")
            
        try:
            # Test 3: Filter by status
            response = requests.get(f"{self.base_url}/airdrops?status=active", timeout=10)
            if response.status_code == 200:
                data = response.json()
                active_airdrops = [a for a in data if a.get('status') == 'active']
                self.log_test("GET /api/airdrops - Filter by status", True, 
                            f"Retrieved {len(active_airdrops)} active airdrops")
            else:
                self.log_test("GET /api/airdrops - Filter by status", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/airdrops - Filter by status", False, f"Exception: {str(e)}")
            
        try:
            # Test 4: Limit parameter
            response = requests.get(f"{self.base_url}/airdrops?limit=2", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if len(data) <= 2:
                    self.log_test("GET /api/airdrops - Limit parameter", True, 
                                f"Limit respected, got {len(data)} airdrops")
                else:
                    self.log_test("GET /api/airdrops - Limit parameter", False, 
                                f"Limit not respected, got {len(data)} airdrops")
            else:
                self.log_test("GET /api/airdrops - Limit parameter", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/airdrops - Limit parameter", False, f"Exception: {str(e)}")
    
    def test_get_airdrop_by_id(self):
        """Test GET /api/airdrops/{id} endpoint"""
        print("\n=== Testing GET /api/airdrops/{id} ===")
        
        if not self.sample_airdrop_id:
            self.log_test("GET /api/airdrops/{id} - Valid ID", False, 
                        "No sample airdrop ID available from previous test")
            return
            
        try:
            # Test 1: Valid airdrop ID
            response = requests.get(f"{self.base_url}/airdrops/{self.sample_airdrop_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('id') == self.sample_airdrop_id:
                    self.log_test("GET /api/airdrops/{id} - Valid ID", True, 
                                f"Retrieved airdrop: {data.get('name')}")
                else:
                    self.log_test("GET /api/airdrops/{id} - Valid ID", False, 
                                "ID mismatch in response")
            else:
                self.log_test("GET /api/airdrops/{id} - Valid ID", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/airdrops/{id} - Valid ID", False, f"Exception: {str(e)}")
            
        try:
            # Test 2: Invalid airdrop ID
            invalid_id = "invalid-airdrop-id-123"
            response = requests.get(f"{self.base_url}/airdrops/{invalid_id}", timeout=10)
            if response.status_code == 404:
                self.log_test("GET /api/airdrops/{id} - Invalid ID", True, 
                            "Correctly returned 404 for invalid ID")
            else:
                self.log_test("GET /api/airdrops/{id} - Invalid ID", False, 
                            f"Expected 404, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("GET /api/airdrops/{id} - Invalid ID", False, f"Exception: {str(e)}")
    
    def test_get_blockchains(self):
        """Test GET /api/blockchains endpoint"""
        print("\n=== Testing GET /api/blockchains ===")
        
        try:
            response = requests.get(f"{self.base_url}/blockchains", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if blockchains have required fields
                    first_blockchain = data[0]
                    if all(key in first_blockchain for key in ['id', 'name', 'symbol']):
                        self.log_test("GET /api/blockchains", True, 
                                    f"Retrieved {len(data)} supported blockchains")
                    else:
                        self.log_test("GET /api/blockchains", False, 
                                    "Blockchain objects missing required fields")
                else:
                    self.log_test("GET /api/blockchains", False, 
                                "No blockchains returned or invalid format")
            else:
                self.log_test("GET /api/blockchains", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/blockchains", False, f"Exception: {str(e)}")
    
    def test_user_management(self):
        """Test user management endpoints"""
        print("\n=== Testing User Management APIs ===")
        
        try:
            # Test 1: Get user (should create if not exists)
            response = requests.get(f"{self.base_url}/users/{self.sample_user_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('id') == self.sample_user_id:
                    self.log_test("GET /api/users/{user_id} - New user", True, 
                                "User created/retrieved successfully")
                else:
                    self.log_test("GET /api/users/{user_id} - New user", False, 
                                "User ID mismatch in response")
            else:
                self.log_test("GET /api/users/{user_id} - New user", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/users/{user_id} - New user", False, f"Exception: {str(e)}")
            
        try:
            # Test 2: Daily check-in
            response = requests.post(f"{self.base_url}/users/{self.sample_user_id}/checkin", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'points_earned' in data and 'total_points' in data and 'streak' in data:
                    self.log_test("POST /api/users/{user_id}/checkin - First checkin", True, 
                                f"Earned {data.get('points_earned')} points, streak: {data.get('streak')}")
                else:
                    self.log_test("POST /api/users/{user_id}/checkin - First checkin", False, 
                                "Missing required fields in response")
            else:
                self.log_test("POST /api/users/{user_id}/checkin - First checkin", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/users/{user_id}/checkin - First checkin", False, f"Exception: {str(e)}")
            
        try:
            # Test 3: Duplicate check-in (should be rejected)
            response = requests.post(f"{self.base_url}/users/{self.sample_user_id}/checkin", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "Already checked in today" in data.get('message', ''):
                    self.log_test("POST /api/users/{user_id}/checkin - Duplicate", True, 
                                "Correctly rejected duplicate check-in")
                else:
                    self.log_test("POST /api/users/{user_id}/checkin - Duplicate", False, 
                                "Should have rejected duplicate check-in")
            else:
                self.log_test("POST /api/users/{user_id}/checkin - Duplicate", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/users/{user_id}/checkin - Duplicate", False, f"Exception: {str(e)}")
    
    def test_airdrop_tracking(self):
        """Test airdrop tracking endpoints"""
        print("\n=== Testing Airdrop Tracking APIs ===")
        
        if not self.sample_airdrop_id:
            self.log_test("Airdrop Tracking Tests", False, 
                        "No sample airdrop ID available")
            return
            
        try:
            # Test 1: Start tracking an airdrop
            response = requests.post(f"{self.base_url}/users/{self.sample_user_id}/airdrops/{self.sample_airdrop_id}/track", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "tracking started" in data.get('message', '').lower():
                    self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/track", True, 
                                "Airdrop tracking started successfully")
                else:
                    self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/track", False, 
                                f"Unexpected response: {data.get('message')}")
            else:
                self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/track", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/track", False, f"Exception: {str(e)}")
            
        try:
            # Test 2: Get user's tracked airdrops
            response = requests.get(f"{self.base_url}/users/{self.sample_user_id}/airdrops", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    tracked_airdrop = next((a for a in data if a.get('airdrop_id') == self.sample_airdrop_id), None)
                    if tracked_airdrop:
                        self.log_test("GET /api/users/{user_id}/airdrops", True, 
                                    f"Found {len(data)} tracked airdrops")
                    else:
                        self.log_test("GET /api/users/{user_id}/airdrops", False, 
                                    "Previously tracked airdrop not found")
                else:
                    self.log_test("GET /api/users/{user_id}/airdrops", False, 
                                "Invalid response format")
            else:
                self.log_test("GET /api/users/{user_id}/airdrops", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/users/{user_id}/airdrops", False, f"Exception: {str(e)}")
            
        if self.sample_task_id:
            try:
                # Test 3: Complete a task
                response = requests.post(f"{self.base_url}/users/{self.sample_user_id}/airdrops/{self.sample_airdrop_id}/tasks/{self.sample_task_id}/complete", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if 'progress' in data:
                        self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/tasks/{task_id}/complete", True, 
                                    f"Task completed, progress: {data.get('progress')}%")
                    else:
                        self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/tasks/{task_id}/complete", False, 
                                    "Missing progress in response")
                else:
                    self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/tasks/{task_id}/complete", False, 
                                f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_test("POST /api/users/{user_id}/airdrops/{airdrop_id}/tasks/{task_id}/complete", False, f"Exception: {str(e)}")
        else:
            self.log_test("Task Completion Test", False, "No sample task ID available")
    
    def test_eligibility_checking(self):
        """Test eligibility checking endpoint"""
        print("\n=== Testing Eligibility Checking API ===")
        
        if not self.sample_airdrop_id:
            self.log_test("Eligibility Check Tests", False, 
                        "No sample airdrop ID available")
            return
            
        try:
            # Test 1: Valid eligibility check
            test_wallet = "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87"
            payload = {
                "wallet_address": test_wallet,
                "airdrop_id": self.sample_airdrop_id
            }
            response = requests.post(f"{self.base_url}/eligibility/check", 
                                   json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ['airdrop_id', 'wallet_address', 'is_eligible', 'details']
                if all(field in data for field in required_fields):
                    self.log_test("POST /api/eligibility/check - Valid request", True, 
                                f"Eligibility: {data.get('is_eligible')}")
                else:
                    self.log_test("POST /api/eligibility/check - Valid request", False, 
                                "Missing required fields in response")
            else:
                self.log_test("POST /api/eligibility/check - Valid request", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/eligibility/check - Valid request", False, f"Exception: {str(e)}")
            
        try:
            # Test 2: Invalid wallet address
            payload = {
                "wallet_address": "",
                "airdrop_id": self.sample_airdrop_id
            }
            response = requests.post(f"{self.base_url}/eligibility/check", 
                                   json=payload, timeout=10)
            if response.status_code == 400:
                self.log_test("POST /api/eligibility/check - Invalid wallet", True, 
                            "Correctly rejected empty wallet address")
            else:
                self.log_test("POST /api/eligibility/check - Invalid wallet", False, 
                            f"Expected 400, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("POST /api/eligibility/check - Invalid wallet", False, f"Exception: {str(e)}")
            
        try:
            # Test 3: Invalid airdrop ID
            payload = {
                "wallet_address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
                "airdrop_id": "invalid-airdrop-id"
            }
            response = requests.post(f"{self.base_url}/eligibility/check", 
                                   json=payload, timeout=10)
            if response.status_code == 404:
                self.log_test("POST /api/eligibility/check - Invalid airdrop ID", True, 
                            "Correctly rejected invalid airdrop ID")
            else:
                self.log_test("POST /api/eligibility/check - Invalid airdrop ID", False, 
                            f"Expected 404, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("POST /api/eligibility/check - Invalid airdrop ID", False, f"Exception: {str(e)}")
    
    def test_error_handling(self):
        """Test various error scenarios"""
        print("\n=== Testing Error Handling ===")
        
        try:
            # Test 1: Non-existent endpoint
            response = requests.get(f"{self.base_url}/nonexistent", timeout=10)
            if response.status_code == 404:
                self.log_test("Error Handling - Non-existent endpoint", True, 
                            "Correctly returned 404 for non-existent endpoint")
            else:
                self.log_test("Error Handling - Non-existent endpoint", False, 
                            f"Expected 404, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Error Handling - Non-existent endpoint", False, f"Exception: {str(e)}")
            
        try:
            # Test 2: Invalid JSON payload
            response = requests.post(f"{self.base_url}/eligibility/check", 
                                   data="invalid json", 
                                   headers={'Content-Type': 'application/json'}, 
                                   timeout=10)
            if response.status_code in [400, 422]:
                self.log_test("Error Handling - Invalid JSON", True, 
                            f"Correctly rejected invalid JSON with HTTP {response.status_code}")
            else:
                self.log_test("Error Handling - Invalid JSON", False, 
                            f"Expected 400/422, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Error Handling - Invalid JSON", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting comprehensive backend API testing...")
        print(f"Backend URL: {self.base_url}")
        print(f"Test User ID: {self.sample_user_id}")
        
        start_time = time.time()
        
        # Run all test suites
        self.test_get_airdrops()
        self.test_get_airdrop_by_id()
        self.test_get_blockchains()
        self.test_user_management()
        self.test_airdrop_tracking()
        self.test_eligibility_checking()
        self.test_error_handling()
        
        end_time = time.time()
        
        # Generate summary
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"\n{'='*60}")
        print(f"🏁 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⏱️  Duration: {end_time - start_time:.2f} seconds")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test['success']:
                    print(f"  • {test['test']}: {test['details']}")
        
        return {
            'total': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'success_rate': (passed_tests/total_tests)*100,
            'duration': end_time - start_time,
            'details': self.test_results
        }

if __name__ == "__main__":
    tester = AirdropAPITester()
    results = tester.run_all_tests()
    
    # Save detailed results to file
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")