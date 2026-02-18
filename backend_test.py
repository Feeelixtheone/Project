#!/usr/bin/env python3
"""
Backend API Testing for Restaurant App
Tests all backend endpoints with proper authentication flow
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Base URL from frontend .env
BASE_URL = "https://mealmapper-3.preview.emergentagent.com/api"

class RestaurantAPITester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_restaurant_id = None
        self.test_reservation_id = None
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")
        
    def test_health_check(self):
        """Test health check endpoint"""
        self.log("Testing health check endpoint...")
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log("✅ Health check passed", "SUCCESS")
                    return True
                else:
                    self.log(f"❌ Health check failed - unexpected response: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Health check failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Health check failed - error: {str(e)}", "ERROR")
            return False
    
    def setup_test_user_session(self):
        """Create test user and session using MongoDB directly"""
        self.log("Setting up test user and session...")
        try:
            import subprocess
            import uuid
            
            # Generate unique IDs
            user_id = f"user_{int(datetime.now().timestamp())}"
            session_token = f"test_session_{uuid.uuid4().hex[:16]}"
            
            # MongoDB command to create test user and session
            mongo_cmd = f'''
            mongosh --eval "
            use('test_database');
            var userId = '{user_id}';
            var sessionToken = '{session_token}';
            db.users.insertOne({{
              user_id: userId,
              email: 'test@restaurant.com',
              name: 'Test User Restaurant',
              picture: null,
              phone: '+40123456789',
              address: 'Test Address 123, București',
              created_at: new Date()
            }});
            db.user_sessions.insertOne({{
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000),
              created_at: new Date()
            }});
            print('User created: ' + userId);
            print('Session token: ' + sessionToken);
            "
            '''
            
            result = subprocess.run(mongo_cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.session_token = session_token
                self.user_id = user_id
                self.log(f"✅ Test user created - ID: {user_id}", "SUCCESS")
                self.log(f"✅ Session token: {session_token}", "SUCCESS")
                return True
            else:
                self.log(f"❌ Failed to create test user: {result.stderr}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Failed to setup test user: {str(e)}", "ERROR")
            return False
    
    def test_get_restaurants(self):
        """Test get restaurants endpoint"""
        self.log("Testing get restaurants endpoint...")
        try:
            response = requests.get(f"{BASE_URL}/restaurants", timeout=10)
            if response.status_code == 200:
                restaurants = response.json()
                if isinstance(restaurants, list) and len(restaurants) > 0:
                    self.test_restaurant_id = restaurants[0]["id"]
                    self.log(f"✅ Get restaurants passed - found {len(restaurants)} restaurants", "SUCCESS")
                    return True
                else:
                    self.log("❌ Get restaurants failed - no restaurants found", "ERROR")
                    return False
            else:
                self.log(f"❌ Get restaurants failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get restaurants failed - error: {str(e)}", "ERROR")
            return False
    
    def test_get_restaurants_sorting(self):
        """Test get restaurants with sorting"""
        self.log("Testing get restaurants with sorting...")
        try:
            sort_options = ["popular", "liked", "sponsored", "new"]
            for sort_by in sort_options:
                response = requests.get(f"{BASE_URL}/restaurants?sort_by={sort_by}", timeout=10)
                if response.status_code == 200:
                    restaurants = response.json()
                    self.log(f"✅ Sorting by {sort_by} works - {len(restaurants)} restaurants", "SUCCESS")
                else:
                    self.log(f"❌ Sorting by {sort_by} failed - status: {response.status_code}", "ERROR")
                    return False
            return True
        except Exception as e:
            self.log(f"❌ Restaurant sorting failed - error: {str(e)}", "ERROR")
            return False
    
    def test_get_new_restaurants(self):
        """Test get new restaurants endpoint"""
        self.log("Testing get new restaurants endpoint...")
        try:
            response = requests.get(f"{BASE_URL}/restaurants/new", timeout=10)
            if response.status_code == 200:
                restaurants = response.json()
                self.log(f"✅ Get new restaurants passed - found {len(restaurants)} new restaurants", "SUCCESS")
                return True
            else:
                self.log(f"❌ Get new restaurants failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get new restaurants failed - error: {str(e)}", "ERROR")
            return False
    
    def test_get_single_restaurant(self):
        """Test get single restaurant endpoint"""
        if not self.test_restaurant_id:
            self.log("❌ No restaurant ID available for testing", "ERROR")
            return False
            
        self.log(f"Testing get single restaurant endpoint with ID: {self.test_restaurant_id}")
        try:
            response = requests.get(f"{BASE_URL}/restaurants/{self.test_restaurant_id}", timeout=10)
            if response.status_code == 200:
                restaurant = response.json()
                if restaurant.get("id") == self.test_restaurant_id:
                    self.log("✅ Get single restaurant passed", "SUCCESS")
                    return True
                else:
                    self.log("❌ Get single restaurant failed - ID mismatch", "ERROR")
                    return False
            else:
                self.log(f"❌ Get single restaurant failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get single restaurant failed - error: {str(e)}", "ERROR")
            return False
    
    def test_get_reviews(self):
        """Test get reviews endpoint"""
        if not self.test_restaurant_id:
            self.log("❌ No restaurant ID available for testing reviews", "ERROR")
            return False
            
        self.log(f"Testing get reviews endpoint for restaurant: {self.test_restaurant_id}")
        try:
            response = requests.get(f"{BASE_URL}/restaurants/{self.test_restaurant_id}/reviews", timeout=10)
            if response.status_code == 200:
                reviews = response.json()
                self.log(f"✅ Get reviews passed - found {len(reviews)} reviews", "SUCCESS")
                return True
            else:
                self.log(f"❌ Get reviews failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get reviews failed - error: {str(e)}", "ERROR")
            return False
    
    def test_auth_me(self):
        """Test auth me endpoint"""
        if not self.session_token:
            self.log("❌ No session token available for auth testing", "ERROR")
            return False
            
        self.log("Testing auth me endpoint...")
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                user = response.json()
                if user.get("user_id") == self.user_id:
                    self.log("✅ Auth me passed", "SUCCESS")
                    return True
                else:
                    self.log("❌ Auth me failed - user ID mismatch", "ERROR")
                    return False
            else:
                self.log(f"❌ Auth me failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Auth me failed - error: {str(e)}", "ERROR")
            return False
    
    def test_create_reservation(self):
        """Test create reservation endpoint"""
        if not self.session_token or not self.test_restaurant_id:
            self.log("❌ Missing session token or restaurant ID for reservation testing", "ERROR")
            return False
            
        self.log("Testing create reservation endpoint...")
        try:
            headers = {"Authorization": f"Bearer {self.session_token}", "Content-Type": "application/json"}
            reservation_data = {
                "restaurant_id": self.test_restaurant_id,
                "date": "2025-02-20",
                "time": "19:00",
                "guests": 2,
                "special_requests": "Window table please"
            }
            
            response = requests.post(f"{BASE_URL}/reservations", 
                                   headers=headers, 
                                   json=reservation_data, 
                                   timeout=10)
            
            if response.status_code == 200:
                reservation = response.json()
                self.test_reservation_id = reservation.get("id")
                self.log("✅ Create reservation passed", "SUCCESS")
                return True
            else:
                self.log(f"❌ Create reservation failed - status: {response.status_code}, response: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Create reservation failed - error: {str(e)}", "ERROR")
            return False
    
    def test_get_reservations(self):
        """Test get reservations endpoint"""
        if not self.session_token:
            self.log("❌ No session token available for reservations testing", "ERROR")
            return False
            
        self.log("Testing get reservations endpoint...")
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/reservations", headers=headers, timeout=10)
            if response.status_code == 200:
                reservations = response.json()
                self.log(f"✅ Get reservations passed - found {len(reservations)} reservations", "SUCCESS")
                return True
            else:
                self.log(f"❌ Get reservations failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get reservations failed - error: {str(e)}", "ERROR")
            return False
    
    def test_create_review(self):
        """Test create review endpoint"""
        if not self.session_token or not self.test_restaurant_id:
            self.log("❌ Missing session token or restaurant ID for review testing", "ERROR")
            return False
            
        self.log("Testing create review endpoint...")
        try:
            headers = {"Authorization": f"Bearer {self.session_token}", "Content-Type": "application/json"}
            review_data = {
                "restaurant_id": self.test_restaurant_id,
                "rating": 5,
                "comment": "Excellent food and service! Highly recommended."
            }
            
            response = requests.post(f"{BASE_URL}/reviews", 
                                   headers=headers, 
                                   json=review_data, 
                                   timeout=10)
            
            if response.status_code == 200:
                review = response.json()
                self.log("✅ Create review passed", "SUCCESS")
                return True
            else:
                self.log(f"❌ Create review failed - status: {response.status_code}, response: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Create review failed - error: {str(e)}", "ERROR")
            return False
    
    def test_toggle_like(self):
        """Test toggle like endpoint"""
        if not self.session_token or not self.test_restaurant_id:
            self.log("❌ Missing session token or restaurant ID for like testing", "ERROR")
            return False
            
        self.log("Testing toggle like endpoint...")
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.post(f"{BASE_URL}/restaurants/{self.test_restaurant_id}/like", 
                                   headers=headers, 
                                   timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                liked = result.get("liked")
                self.log(f"✅ Toggle like passed - liked: {liked}", "SUCCESS")
                return True
            else:
                self.log(f"❌ Toggle like failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Toggle like failed - error: {str(e)}", "ERROR")
            return False
    
    def test_payment_methods(self):
        """Test payment methods endpoint"""
        if not self.session_token:
            self.log("❌ No session token available for payment methods testing", "ERROR")
            return False
            
        self.log("Testing get payment methods endpoint...")
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/payment-methods", headers=headers, timeout=10)
            if response.status_code == 200:
                methods = response.json()
                self.log(f"✅ Get payment methods passed - found {len(methods)} methods", "SUCCESS")
                return True
            else:
                self.log(f"❌ Get payment methods failed - status: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get payment methods failed - error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("=" * 60)
        self.log("STARTING RESTAURANT APP BACKEND API TESTS")
        self.log("=" * 60)
        
        results = {}
        
        # Test non-auth endpoints first
        results["health_check"] = self.test_health_check()
        results["get_restaurants"] = self.test_get_restaurants()
        results["get_restaurants_sorting"] = self.test_get_restaurants_sorting()
        results["get_new_restaurants"] = self.test_get_new_restaurants()
        results["get_single_restaurant"] = self.test_get_single_restaurant()
        results["get_reviews"] = self.test_get_reviews()
        
        # Setup auth for protected endpoints
        auth_setup = self.setup_test_user_session()
        if auth_setup:
            results["auth_me"] = self.test_auth_me()
            results["create_reservation"] = self.test_create_reservation()
            results["get_reservations"] = self.test_get_reservations()
            results["create_review"] = self.test_create_review()
            results["toggle_like"] = self.test_toggle_like()
            results["payment_methods"] = self.test_payment_methods()
        else:
            self.log("❌ Auth setup failed - skipping protected endpoint tests", "ERROR")
            results["auth_setup"] = False
        
        # Summary
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        passed = 0
        total = 0
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            if result:
                passed += 1
            total += 1
        
        self.log("=" * 60)
        self.log(f"TOTAL: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
            return True
        else:
            self.log(f"⚠️  {total - passed} tests failed", "ERROR")
            return False

if __name__ == "__main__":
    tester = RestaurantAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)