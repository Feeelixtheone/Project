#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Public endpoint from the frontend .env
BACKEND_URL = "https://commission-rates.preview.emergentagent.com"

class HamzaRestaurantTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.session_token = None
        self.admin_email = "mutinyretreat37@gmail.com"
        self.admin_password = "karaplange2"
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            print(f"❌ {test_name}: FAILED {details}")
            
    def api_call(self, method: str, endpoint: str, data: Dict[str, Any] = None, 
                 headers: Dict[str, str] = None, token: str = None) -> tuple:
        """Make API call and return (success, response_data, status_code)"""
        url = f"{BACKEND_URL}{endpoint}"
        
        if headers is None:
            headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
                
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
                
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_admin_login(self):
        """Test admin login to get session token"""
        success, data, status = self.api_call(
            "POST", 
            "/api/auth/login",
            {
                "email": self.admin_email,
                "password": self.admin_password
            }
        )
        
        if success and "session_token" in data:
            self.session_token = data["session_token"]
            self.log_test("Admin Login", True, f"Admin logged in successfully")
            return True
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Response: {data}")
            return False

    def test_get_hamza_restaurant(self):
        """Test GET /api/restaurants/rest_hamza_sibiu"""
        success, data, status = self.api_call("GET", "/api/restaurants/rest_hamza_sibiu")
        
        if success and "name" in data:
            if "hamza" in data["name"].lower() and "sibiu" in data.get("address", "").lower():
                self.log_test("Get Hamza Restaurant", True, 
                             f"Found Hamza restaurant: {data['name']} at {data.get('address', 'N/A')}")
                return True
            else:
                self.log_test("Get Hamza Restaurant", False, 
                             f"Restaurant found but not Hamza from Sibiu: {data}")
                return False
        else:
            self.log_test("Get Hamza Restaurant", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_get_hamza_floorplan(self):
        """Test GET /api/restaurants/rest_hamza_sibiu/floorplan"""
        success, data, status = self.api_call("GET", "/api/restaurants/rest_hamza_sibiu/floorplan")
        
        if success and "tables" in data:
            table_count = len(data.get("tables", []))
            if table_count >= 40:
                self.log_test("Get Hamza Floor Plan", True, 
                             f"Floor plan has {table_count} tables (≥40 expected)")
                return True
            else:
                self.log_test("Get Hamza Floor Plan", False, 
                             f"Floor plan has only {table_count} tables, expected ≥40")
                return False
        else:
            self.log_test("Get Hamza Floor Plan", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_assign_table_photo(self):
        """Test POST /api/restaurants/rest_hamza_sibiu/floorplan/table-photo"""
        if not self.session_token:
            self.log_test("Assign Table Photo", False, "No admin session token")
            return False
            
        test_photo_url = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"
        success, data, status = self.api_call(
            "POST", 
            "/api/restaurants/rest_hamza_sibiu/floorplan/table-photo",
            {
                "table_number": "1",
                "photo_url": test_photo_url
            },
            token=self.session_token
        )
        
        if success:
            self.log_test("Assign Table Photo", True, 
                         f"Successfully assigned photo to table 1: {data}")
            return True
        else:
            self.log_test("Assign Table Photo", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_ai_table_detection(self):
        """Test POST /api/restaurants/rest_hamza_sibiu/floorplan/ai-detect"""
        if not self.session_token:
            self.log_test("AI Table Detection", False, "No admin session token")
            return False
            
        success, data, status = self.api_call(
            "POST", 
            "/api/restaurants/rest_hamza_sibiu/floorplan/ai-detect",
            token=self.session_token
        )
        
        if success and "count" in data:
            detected_count = data["count"]
            self.log_test("AI Table Detection", True, 
                         f"AI detected {detected_count} tables")
            return True
        else:
            self.log_test("AI Table Detection", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def run_all_tests(self):
        print(f"🧪 Starting Hamza Restaurant & Floor Plan Tests")
        print(f"📡 Testing API at: {BACKEND_URL}")
        print("=" * 60)
        
        # Login as admin first
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
        
        # Test Hamza restaurant endpoints
        self.test_get_hamza_restaurant()
        self.test_get_hamza_floorplan()
        self.test_assign_table_photo()
        self.test_ai_table_detection()
        
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Hamza restaurant tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = HamzaRestaurantTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())