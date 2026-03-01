#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Public endpoint from the frontend .env
BACKEND_URL = "https://rating-feedback-hub.preview.emergentagent.com"

class RestaurantAppAPITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.session_token = None
        self.user_data = None
        self.business_session_token = None
        self.business_user_data = None
        
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

    def test_dev_login_admin(self):
        """Test POST /api/auth/dev-login with admin email"""
        success, data, status = self.api_call(
            "POST", 
            "/api/auth/dev-login",
            {
                "email": "mutinyretreat37@gmail.com",
                "name": "Admin Principal", 
                "role": "admin"
            }
        )
        
        if success and "session_token" in data and "user" in data:
            self.session_token = data["session_token"]
            self.user_data = data["user"]
            self.log_test("Dev Login Admin", True, 
                         f"Got session_token and user data: {data['user']['name']}")
        else:
            self.log_test("Dev Login Admin", False, 
                         f"Status: {status}, Response: {data}")
        return success

    def test_dev_login_business(self):
        """Test POST /api/auth/dev-login with business email"""
        success, data, status = self.api_call(
            "POST", 
            "/api/auth/dev-login",
            {
                "email": "business@restaurant.ro",
                "name": "Business Owner", 
                "role": "user"
            }
        )
        
        if success and "session_token" in data and "user" in data:
            self.business_session_token = data["session_token"]
            self.business_user_data = data["user"]
            self.log_test("Dev Login Business", True, 
                         f"Got session_token and user data: {data['user']['name']}")
        else:
            self.log_test("Dev Login Business", False, 
                         f"Status: {status}, Response: {data}")
        return success

    def test_auth_me_admin(self):
        """Test GET /api/auth/me with admin session"""
        if not self.session_token:
            self.log_test("Auth Me Admin", False, "No admin session token")
            return False
            
        success, data, status = self.api_call("GET", "/api/auth/me", token=self.session_token)
        
        if success and "user_id" in data and data.get("email") == "mutinyretreat37@gmail.com":
            self.log_test("Auth Me Admin", True, 
                         f"Got user info: {data['name']} - {data['email']}")
        else:
            self.log_test("Auth Me Admin", False, 
                         f"Status: {status}, Response: {data}")
        return success

    def test_auth_me_business(self):
        """Test GET /api/auth/me with business session"""
        if not self.business_session_token:
            self.log_test("Auth Me Business", False, "No business session token")
            return False
            
        success, data, status = self.api_call("GET", "/api/auth/me", token=self.business_session_token)
        
        if success and "user_id" in data and data.get("email") == "business@restaurant.ro":
            self.log_test("Auth Me Business", True, 
                         f"Got user info: {data['name']} - {data['email']}")
        else:
            self.log_test("Auth Me Business", False, 
                         f"Status: {status}, Response: {data}")
        return success

    def test_logout(self):
        """Test POST /api/auth/logout"""
        if not self.session_token:
            self.log_test("Logout", False, "No session token")
            return False
            
        success, data, status = self.api_call("POST", "/api/auth/logout", token=self.session_token)
        
        if success and status == 200:
            self.log_test("Logout", True, f"Logged out successfully: {data}")
        else:
            self.log_test("Logout", False, f"Status: {status}, Response: {data}")
        return success

    def test_get_restaurants(self):
        """Test GET /api/restaurants returns restaurants with new media data"""
        success, data, status = self.api_call("GET", "/api/restaurants")
        
        if success and isinstance(data, list) and len(data) > 0:
            restaurant = data[0]
            
            # Check for new media fields
            has_gallery_images = "gallery_images" in restaurant and isinstance(restaurant["gallery_images"], list)
            has_video_urls = "video_urls" in restaurant and isinstance(restaurant["video_urls"], list)
            has_images_3d = "images_3d" in restaurant and isinstance(restaurant["images_3d"], list)
            
            # Check video_urls structure
            video_structure_ok = True
            if restaurant.get("video_urls"):
                for video in restaurant["video_urls"]:
                    if not all(k in video for k in ["title", "url", "thumbnail", "duration"]):
                        video_structure_ok = False
                        break
            
            # Check images_3d structure
            images_3d_structure_ok = True
            if restaurant.get("images_3d"):
                for image in restaurant["images_3d"]:
                    if not all(k in image for k in ["title", "model_url", "thumbnail", "type"]):
                        images_3d_structure_ok = False
                        break
            
            self.log_test("Get Restaurants", True, 
                         f"Found {len(data)} restaurants. First restaurant has gallery_images: {has_gallery_images}, "
                         f"video_urls: {has_video_urls}, images_3d: {has_images_3d}, "
                         f"video structure OK: {video_structure_ok}, 3D structure OK: {images_3d_structure_ok}")
        else:
            self.log_test("Get Restaurants", False, 
                         f"Status: {status}, Response: {data}")
        return success

    def test_business_account_company(self):
        """Test if business account has company_id linked"""
        if not self.business_user_data:
            self.log_test("Business Account Company", False, "No business user data")
            return False
        
        has_company_id = self.business_user_data.get("company_id") is not None
        is_company = self.business_user_data.get("is_company", False)
        
        if has_company_id and is_company:
            self.log_test("Business Account Company", True, 
                         f"Business account has company_id: {self.business_user_data['company_id']}, is_company: {is_company}")
        else:
            self.log_test("Business Account Company", False, 
                         f"Business account missing company link. company_id: {self.business_user_data.get('company_id')}, is_company: {is_company}")
        return has_company_id and is_company

    def run_all_tests(self):
        print(f"🧪 Starting Romanian Restaurant App API Tests")
        print(f"📡 Testing API at: {BACKEND_URL}")
        print("=" * 60)
        
        # Test dev login endpoints
        self.test_dev_login_admin()
        self.test_dev_login_business()
        
        # Test auth/me endpoints  
        self.test_auth_me_admin()
        self.test_auth_me_business()
        
        # Test logout
        self.test_logout()
        
        # Test restaurants with new media data
        self.test_get_restaurants()
        
        # Test business account company linking
        self.test_business_account_company()
        
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        return self.tests_passed == self.tests_run

def main():
    tester = RestaurantAppAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())