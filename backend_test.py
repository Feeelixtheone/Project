#!/usr/bin/env python3
"""
Backend API Testing for Restaurant App - Iteration 3
Tests all backend functionality including .env file, authentication, restaurants, loyalty points, payments, and admin stats.
"""

import requests
import sys
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

class RestaurantAPITester:
    def __init__(self, base_url="https://commission-rates.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, passed: bool, details: str = "", expected: str = "", actual: str = ""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   Details: {details}")
            if expected:
                print(f"   Expected: {expected}")
            if actual:
                print(f"   Actual: {actual}")
        
        self.test_results.append({
            "name": name,
            "passed": passed,
            "details": details,
            "expected": expected,
            "actual": actual
        })

    def api_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request and return (success, response_data)"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            if response.status_code == expected_status:
                try:
                    return True, response.json()
                except:
                    return True, {"status": "success", "text": response.text}
            else:
                return False, {
                    "status_code": response.status_code,
                    "expected": expected_status,
                    "text": response.text[:500]
                }
        except Exception as e:
            return False, {"error": str(e)}

    def test_env_file_exists(self):
        """Test 1: Backend .env file exists with all required keys"""
        env_path = "/app/backend/.env"
        required_keys = [
            "MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DB",
            "STRIPE_API_KEY", "JWT_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD", "EMERGENT_LLM_KEY"
        ]
        
        try:
            if not os.path.exists(env_path):
                self.log_test("Backend .env file exists", False, f"File not found at {env_path}")
                return False
            
            with open(env_path, 'r') as f:
                env_content = f.read()
            
            missing_keys = []
            for key in required_keys:
                if f"{key}=" not in env_content:
                    missing_keys.append(key)
            
            if missing_keys:
                self.log_test("Backend .env file has all required keys", False, 
                            f"Missing keys: {', '.join(missing_keys)}")
                return False
            else:
                self.log_test("Backend .env file exists with all required keys", True)
                return True
                
        except Exception as e:
            self.log_test("Backend .env file exists", False, f"Error reading file: {str(e)}")
            return False

    def test_admin_login(self):
        """Test 2: Admin login with mutinyretreat37@gmail.com / karaplange2"""
        success, response = self.api_request('POST', '/auth/login', {
            "email": "mutinyretreat37@gmail.com",
            "password": "karaplange2"
        })
        
        if success and 'session_token' in response:
            self.session_token = response['session_token']
            self.log_test("Admin login successful", True, f"Session token received")
            return True
        else:
            self.log_test("Admin login failed", False, 
                        f"Response: {json.dumps(response, indent=2)}")
            return False

    def test_restaurants_endpoint(self):
        """Test 3: GET /api/restaurants returns 6 restaurants with 'Amza' restaurant"""
        success, response = self.api_request('GET', '/restaurants')
        
        if not success:
            self.log_test("GET /api/restaurants failed", False, 
                        f"API error: {json.dumps(response, indent=2)}")
            return False
        
        if not isinstance(response, list):
            self.log_test("GET /api/restaurants returns list", False, 
                        f"Expected list, got {type(response)}")
            return False
        
        # Check count
        if len(response) != 6:
            self.log_test("GET /api/restaurants returns 6 restaurants", False, 
                        f"Expected 6, got {len(response)}")
            return False
        
        # Check for Amza restaurant (not Hamza)
        amza_found = False
        hamza_found = False
        for restaurant in response:
            if restaurant.get('name') == 'Amza':
                amza_found = True
            if restaurant.get('name') == 'Hamza':
                hamza_found = True
        
        if hamza_found:
            self.log_test("Restaurant name is 'Amza' not 'Hamza'", False, 
                        "Found 'Hamza' restaurant - should be renamed to 'Amza'")
            return False
        
        if not amza_found:
            self.log_test("Restaurant 'Amza' exists", False, 
                        f"Restaurant names found: {[r.get('name') for r in response]}")
            return False
        
        self.log_test("GET /api/restaurants returns 6 restaurants with 'Amza'", True)
        return True

    def test_amza_restaurant_details(self):
        """Test 4: GET /api/restaurants/rest_amza_sibiu returns Amza with nutritional data"""
        success, response = self.api_request('GET', '/restaurants/rest_amza_sibiu')
        
        if not success:
            self.log_test("GET Amza restaurant details failed", False, 
                        f"API error: {json.dumps(response, indent=2)}")
            return False
        
        # Check restaurant name
        if response.get('name') != 'Amza':
            self.log_test("Amza restaurant name correct", False, 
                        f"Expected 'Amza', got '{response.get('name')}'")
            return False
        
        # Check nutritional data in menu items
        menu = response.get('menu', [])
        if not menu:
            self.log_test("Amza restaurant has menu items", False, "No menu items found")
            return False
        
        nutritional_fields = ['kcal', 'protein', 'carbs', 'fats', 'fiber', 'ingredients']
        items_with_nutrition = 0
        
        for item in menu:
            has_nutrition = any(item.get(field) is not None for field in nutritional_fields)
            if has_nutrition:
                items_with_nutrition += 1
        
        if items_with_nutrition == 0:
            self.log_test("Amza restaurant has nutritional data", False, 
                        "No menu items have nutritional information")
            return False
        
        self.log_test("GET Amza restaurant with nutritional data", True, 
                    f"Found {items_with_nutrition} menu items with nutritional data")
        return True

    def test_amza_floorplan(self):
        """Test 5: GET /api/restaurants/rest_amza_sibiu/floorplan returns 40 tables"""
        success, response = self.api_request('GET', '/restaurants/rest_amza_sibiu/floorplan')
        
        if not success:
            self.log_test("GET Amza floorplan failed", False, 
                        f"API error: {json.dumps(response, indent=2)}")
            return False
        
        tables = response.get('tables', [])
        if len(tables) != 40:
            self.log_test("Amza floorplan has 40 tables", False, 
                        f"Expected 40 tables, got {len(tables)}")
            return False
        
        self.log_test("GET Amza floorplan returns 40 tables", True)
        return True

    def test_loyalty_points(self):
        """Test 6: GET /api/loyalty/my-points returns points data"""
        if not self.session_token:
            self.log_test("Loyalty points test skipped", False, "No session token")
            return False
        
        success, response = self.api_request('GET', '/loyalty/my-points')
        
        if not success:
            self.log_test("GET loyalty points failed", False, 
                        f"API error: {json.dumps(response, indent=2)}")
            return False
        
        required_fields = ['total_points', 'lifetime_points', 'level', 'history']
        missing_fields = [field for field in required_fields if field not in response]
        
        if missing_fields:
            self.log_test("Loyalty points has required fields", False, 
                        f"Missing fields: {missing_fields}")
            return False
        
        self.log_test("GET loyalty points returns complete data", True)
        return True

    def test_award_loyalty_points(self):
        """Test 7: POST /api/loyalty/award-points awards points correctly"""
        if not self.session_token:
            self.log_test("Award loyalty points test skipped", False, "No session token")
            return False
        
        # Use query parameters as expected by the API
        test_order_id = f"test_order_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        url = f"{self.base_url}/api/loyalty/award-points?order_id={test_order_id}&amount=50.0&restaurant_name=Test Restaurant"
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        try:
            response = requests.post(url, headers=headers, timeout=30)
            if response.status_code == 200:
                self.log_test("POST award loyalty points successful", True)
                return True
            else:
                self.log_test("POST award loyalty points failed", False, 
                            f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
        except Exception as e:
            self.log_test("POST award loyalty points failed", False, f"Error: {str(e)}")
            return False

    def test_create_order_with_stripe(self):
        """Test 8: POST /api/orders/create returns Stripe checkout_url"""
        if not self.session_token:
            self.log_test("Create order test skipped", False, "No session token")
            return False
        
        order_data = {
            "restaurant_id": "rest_amza_sibiu",
            "items": [
                {
                    "menu_item_id": "item_1", 
                    "name": "Test Menu Item",
                    "quantity": 2, 
                    "price": 25.0,
                    "image_url": "https://example.com/image.jpg"
                }
            ],
            "origin_url": "https://commission-rates.preview.emergentagent.com"
        }
        
        success, response = self.api_request('POST', '/orders/create', order_data)
        
        if not success:
            self.log_test("POST create order failed", False, 
                        f"API error: {json.dumps(response, indent=2)}")
            return False
        
        # Check if payment object contains checkout_url
        payment = response.get('payment', {})
        checkout_url = payment.get('checkout_url') or response.get('checkout_url')
        
        if not checkout_url:
            self.log_test("Create order returns checkout_url", False, 
                        f"No checkout_url found. Response structure: {json.dumps(response, indent=2)[:500]}")
            return False
        
        if not checkout_url.startswith('https://checkout.stripe.com'):
            self.log_test("Checkout URL is valid Stripe URL", False, 
                        f"Invalid Stripe URL: {checkout_url}")
            return False
        
        self.log_test("POST create order returns Stripe checkout_url", True)
        return True

    def test_admin_stats(self):
        """Test 9: GET /api/admin/stats returns correct commission rates"""
        if not self.session_token:
            self.log_test("Admin stats test skipped", False, "No session token")
            return False
        
        success, response = self.api_request('GET', '/admin/stats')
        
        if not success:
            self.log_test("GET admin stats failed", False, 
                        f"API error: {json.dumps(response, indent=2)}")
            return False
        
        expected_recurring = 4.7
        expected_new = 7.0
        
        actual_recurring = response.get('commission_recurring_percentage')
        actual_new = response.get('commission_new_percentage')
        
        if actual_recurring != expected_recurring:
            self.log_test("Commission recurring rate is 4.7%", False, 
                        f"Expected {expected_recurring}, got {actual_recurring}")
            return False
        
        if actual_new != expected_new:
            self.log_test("Commission new rate is 7.0%", False, 
                        f"Expected {expected_new}, got {actual_new}")
            return False
        
        self.log_test("GET admin stats returns correct commission rates", True)
        return True

    def test_capacity_settings(self):
        """Test 10: GET /api/restaurants/{id}/capacity-settings returns default settings"""
        success, response = self.api_request('GET', '/restaurants/rest_amza_sibiu/capacity-settings')
        
        if not success:
            self.log_test("GET capacity settings failed", False, 
                        f"API error: {json.dumps(response, indent=2)}")
            return False
        
        # Should return default capacity settings
        if 'max_reservations_per_hour' not in response:
            self.log_test("Capacity settings has max_reservations_per_hour", False, 
                        f"Response keys: {list(response.keys())}")
            return False
        
        self.log_test("GET capacity settings returns default settings", True)
        return True

    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Backend API Tests for Restaurant App")
        print("=" * 60)
        
        # Test 1: .env file
        self.test_env_file_exists()
        
        # Test 2: Admin login
        self.test_admin_login()
        
        # Test 3: Restaurants endpoint
        self.test_restaurants_endpoint()
        
        # Test 4: Amza restaurant details
        self.test_amza_restaurant_details()
        
        # Test 5: Amza floorplan
        self.test_amza_floorplan()
        
        # Test 6: Loyalty points
        self.test_loyalty_points()
        
        # Test 7: Award loyalty points
        self.test_award_loyalty_points()
        
        # Test 8: Create order with Stripe
        self.test_create_order_with_stripe()
        
        # Test 9: Admin stats
        self.test_admin_stats()
        
        # Test 10: Capacity settings
        self.test_capacity_settings()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = RestaurantAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())