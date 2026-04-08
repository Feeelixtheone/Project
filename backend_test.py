#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Public endpoint from the frontend .env
BACKEND_URL = "https://watermark-removal-8.preview.emergentagent.com"

class WatermarkRemovalAPITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.session_token = None
        self.user_data = None
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
        """Test POST /api/auth/login with admin credentials"""
        success, data, status = self.api_call(
            "POST", 
            "/api/auth/login",
            {
                "email": self.admin_email,
                "password": self.admin_password
            }
        )
        
        if success and "session_token" in data and "user" in data:
            self.session_token = data["session_token"]
            self.user_data = data["user"]
            # Verify admin role
            if data["user"].get("role") == "admin" or data["user"].get("email") == self.admin_email:
                self.log_test("Admin Login", True, 
                             f"Admin logged in: {data['user']['name']} ({data['user']['email']})")
                return True
            else:
                self.log_test("Admin Login", False, 
                             f"User logged in but not admin role: {data['user']}")
                return False
        else:
            self.log_test("Admin Login", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_user_register(self):
        """Test POST /api/auth/register for new user"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        success, data, status = self.api_call(
            "POST", 
            "/api/auth/register",
            {
                "email": test_email,
                "password": "testpass123",
                "name": "Test User",
                "account_type": "user"
            }
        )
        
        if success and "session_token" in data and "user" in data:
            user = data["user"]
            if user.get("email") == test_email and user.get("name") == "Test User":
                self.log_test("User Register", True, 
                             f"User registered: {user['name']} ({user['email']})")
                return True
            else:
                self.log_test("User Register", False, 
                             f"Registration successful but user data incorrect: {user}")
                return False
        else:
            self.log_test("User Register", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_auth_me(self):
        """Test GET /api/auth/me with admin session"""
        if not self.session_token:
            self.log_test("Auth Me", False, "No admin session token")
            return False
            
        success, data, status = self.api_call("GET", "/api/auth/me", token=self.session_token)
        
        if success and "user_id" in data and data.get("email") == self.admin_email:
            self.log_test("Auth Me", True, 
                         f"Got admin user info: {data['name']} - {data['email']}")
            return True
        else:
            self.log_test("Auth Me", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_app_status(self):
        """Test GET /api/app/status"""
        success, data, status = self.api_call("GET", "/api/app/status")
        
        if success and "is_active" in data:
            is_active = data["is_active"]
            self.log_test("App Status", True, 
                         f"App status: {'Active' if is_active else 'Locked'}")
            return True
        else:
            self.log_test("App Status", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_admin_app_lock(self):
        """Test POST /api/admin/app/lock (admin only)"""
        if not self.session_token:
            self.log_test("Admin App Lock", False, "No admin session token")
            return False
            
        success, data, status = self.api_call("POST", "/api/admin/app/lock", 
                                            {"message": "Test lock"}, token=self.session_token)
        
        if success:
            self.log_test("Admin App Lock", True, f"App locked successfully: {data}")
            return True
        else:
            self.log_test("Admin App Lock", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_admin_app_unlock(self):
        """Test POST /api/admin/app/unlock (admin only)"""
        if not self.session_token:
            self.log_test("Admin App Unlock", False, "No admin session token")
            return False
            
        success, data, status = self.api_call("POST", "/api/admin/app/unlock", 
                                            token=self.session_token)
        
        if success:
            self.log_test("Admin App Unlock", True, f"App unlocked successfully: {data}")
            return True
        else:
            self.log_test("Admin App Unlock", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_unauthorized_admin_access(self):
        """Test that admin endpoints require authentication"""
        # Test without token
        success, data, status = self.api_call("POST", "/api/admin/app/lock")
        
        if status == 401:
            self.log_test("Unauthorized Admin Access", True, 
                         "Admin endpoints properly protected (401 without auth)")
            return True
        else:
            self.log_test("Unauthorized Admin Access", False, 
                         f"Admin endpoints not protected. Status: {status}, Response: {data}")
            return False

    def test_get_restaurants(self):
        """Test GET /api/restaurants returns restaurants"""
        success, data, status = self.api_call("GET", "/api/restaurants")
        
        if success and isinstance(data, list):
            restaurant_count = len(data)
            self.log_test("Get Restaurants", True, 
                         f"Found {restaurant_count} restaurants")
            return True
        else:
            self.log_test("Get Restaurants", False, 
                         f"Status: {status}, Response: {data}")
            return False

    def test_logout(self):
        """Test POST /api/auth/logout"""
        if not self.session_token:
            self.log_test("Logout", False, "No session token")
            return False
            
        success, data, status = self.api_call("POST", "/api/auth/logout", token=self.session_token)
        
        if success and status == 200:
            self.log_test("Logout", True, f"Logged out successfully: {data}")
            return True
        else:
            self.log_test("Logout", False, f"Status: {status}, Response: {data}")
            return False

    def run_all_tests(self):
        print(f"🧪 Starting Watermark Removal App API Tests")
        print(f"📡 Testing API at: {BACKEND_URL}")
        print("=" * 60)
        
        # Test admin login with email/password
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping critical tests")
            return False
        
        # Test user registration
        self.test_user_register()
        
        # Test auth/me endpoint
        self.test_auth_me()
        
        # Test app status endpoint
        self.test_app_status()
        
        # Test admin kill switch functionality
        self.test_admin_app_lock()
        self.test_admin_app_unlock()
        
        # Test unauthorized access protection
        self.test_unauthorized_admin_access()
        
        # Test basic endpoints
        self.test_get_restaurants()
        
        # Test logout
        self.test_logout()
        
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} backend tests failed")
            return False

def main():
    tester = WatermarkRemovalAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())