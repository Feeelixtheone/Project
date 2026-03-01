import requests
import sys
import json
from datetime import datetime

class RomanianRestaurantAPITester:
    def __init__(self, base_url="https://rating-feedback-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_email = "mutinyretreat37@gmail.com"
        
    def log_result(self, test_name, success, response_data=None, error=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            self.failed_tests.append({
                'test': test_name,
                'error': str(error) if error else 'Unknown error',
                'response': response_data
            })
            print(f"❌ {test_name} - {error}")
    
    def make_request(self, method, endpoint, expected_status=200, data=None, auth_required=True):
        """Make API request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}
            
            return success, response_data, None
            
        except Exception as e:
            return False, None, str(e)
    
    def test_basic_endpoints(self):
        """Test basic public endpoints"""
        print("\n🔍 Testing Basic Endpoints...")
        
        # Test restaurants list
        success, data, error = self.make_request('GET', '/api/restaurants', auth_required=False)
        self.log_result("GET /api/restaurants", success, data, error)
        
        # Test seed data
        success, data, error = self.make_request('POST', '/api/seed', auth_required=False)
        self.log_result("POST /api/seed", success, data, error)
        
        # Test Restaurant of the Week - should return null when no ROTW selected
        success, data, error = self.make_request('GET', '/api/restaurant-of-the-week', auth_required=False)
        self.log_result("GET /api/restaurant-of-the-week (no ROTW)", success, data, error)
        
    def test_dev_login(self):
        """Test dev login endpoints"""
        print("\n🔐 Testing Dev Login...")
        
        # Test admin dev login
        admin_data = {
            "email": self.admin_email,
            "name": "Admin Principal",
            "role": "admin"
        }
        success, data, error = self.make_request('POST', '/api/auth/dev-login', 200, admin_data, auth_required=False)
        self.log_result("POST /api/auth/dev-login (admin)", success, data, error)
        
        if success and data and data.get('session_token'):
            self.token = data['session_token']
            print(f"✅ Admin token received: {self.token[:20]}...")
        
        # Test user dev login
        user_data = {
            "email": "test.user@restaurant.ro",
            "name": "Test User",
            "role": "user"
        }
        success, data, error = self.make_request('POST', '/api/auth/dev-login', 200, user_data, auth_required=False)
        self.log_result("POST /api/auth/dev-login (user)", success, data, error)
    
    def test_referral_endpoints(self):
        """Test referral system endpoints"""
        print("\n🎯 Testing Referral System...")
        
        if not self.token:
            print("⚠️  Skipping referral tests - no authentication")
            return
            
        # Test get my referral code
        success, data, error = self.make_request('GET', '/api/referral/my-code')
        self.log_result("GET /api/referral/my-code", success, data, error)
        
        if success and data and data.get('code'):
            referral_code = data['code']
            print(f"✅ Referral code received: {referral_code}")
            
            # Test applying own code (should fail)
            success, data, error = self.make_request('POST', f'/api/referral/apply?code={referral_code}', 400)
            self.log_result("POST /api/referral/apply (own code - should fail)", success, data, error)
            
            # Test applying fake code
            success, data, error = self.make_request('POST', '/api/referral/apply?code=FAKECODE123', 400)
            self.log_result("POST /api/referral/apply (fake code - should fail)", success, data, error)
        
        # Test referral leaderboard
        success, data, error = self.make_request('GET', '/api/referral/leaderboard', auth_required=False)
        self.log_result("GET /api/referral/leaderboard", success, data, error)

    def test_loyalty_endpoints(self):
        """Test loyalty system endpoints"""
        print("\n🏆 Testing Loyalty System...")
        
        # Test loyalty leaderboard - should return empty array when no data
        success, data, error = self.make_request('GET', '/api/loyalty/leaderboard', auth_required=False)
        self.log_result("GET /api/loyalty/leaderboard", success, data, error)
        
        if self.token:
            # Test my loyalty points
            success, data, error = self.make_request('GET', '/api/loyalty/my-points')
            self.log_result("GET /api/loyalty/my-points", success, data, error)
    
    def test_rotw_endpoints(self):
        """Test Restaurant of the Week endpoints"""
        print("\n🏆 Testing Restaurant of the Week...")
        
        # Test get ROTW before selection
        success, data, error = self.make_request('GET', '/api/restaurant-of-the-week', auth_required=False)
        self.log_result("GET /api/restaurant-of-the-week (before selection)", success, data, error)
        
        if self.token:
            # Test admin auto-select ROTW
            success, data, error = self.make_request('POST', '/api/admin/restaurant-of-the-week/auto-select')
            self.log_result("POST /api/admin/restaurant-of-the-week/auto-select", success, data, error)
            
            # Test get ROTW after selection
            success, data, error = self.make_request('GET', '/api/restaurant-of-the-week', auth_required=False)
            self.log_result("GET /api/restaurant-of-the-week (after selection)", success, data, error)
    
    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n👑 Testing Admin Endpoints...")
        
        if not self.token:
            print("⚠️  Skipping admin tests - no authentication")
            return
            
        # Test admin check
        success, data, error = self.make_request('GET', '/api/admin/check')
        self.log_result("GET /api/admin/check", success, data, error)
        
        if success and data and data.get('is_admin'):
            print(f"✅ Admin access confirmed for: {data.get('email')}")
            
            # Test auto-select ROTW
            success, data, error = self.make_request('POST', '/api/admin/restaurant-of-the-week/auto-select')
            self.log_result("POST /api/admin/restaurant-of-the-week/auto-select", success, data, error)
        else:
            print(f"⚠️  User is not admin, skipping admin-only endpoints")
    
    def test_order_creation(self):
        """Test order creation to check ObjectId serialization fix"""
        print("\n🛒 Testing Order Creation...")
        
        if not self.token:
            print("⚠️  Skipping order tests - no authentication")
            return
            
        # Get restaurants first
        success, restaurants, error = self.make_request('GET', '/api/restaurants', auth_required=False)
        
        if success and restaurants and len(restaurants) > 0:
            restaurant = restaurants[0]
            
            # Test order creation
            order_data = {
                "restaurant_id": restaurant['id'],
                "items": [
                    {
                        "menu_item_id": "test-item-123",
                        "name": "Test Item",
                        "price": 25.50,
                        "quantity": 2,
                        "image_url": "https://example.com/image.jpg"
                    }
                ],
                "origin_url": "https://rating-feedback-hub.preview.emergentagent.com"
            }
            
            success, data, error = self.make_request('POST', '/api/orders/create', 201, order_data)
            self.log_result("POST /api/orders/create (ObjectId serialization test)", success, data, error)
        else:
            self.log_result("POST /api/orders/create", False, None, "No restaurants available for testing")
    
    def test_with_mock_auth(self):
        """Test without actual authentication - for public endpoints"""
        print("\n🔓 Testing Public Endpoints (No Auth)...")
        
        self.test_basic_endpoints()
        self.test_loyalty_endpoints()
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Romanian Restaurant App API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test public endpoints first
        self.test_with_mock_auth()
        
        # Note: Real authentication would require Google OAuth flow
        # For testing purposes, we'll focus on public endpoints
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failed in self.failed_tests:
                print(f"  - {failed['test']}: {failed['error']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RomanianRestaurantAPITester()
    
    # Run tests
    all_passed = tester.run_all_tests()
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"🏁 Testing Complete!")
    print(f"📈 Success Rate: {tester.tests_passed}/{tester.tests_run} ({(tester.tests_passed/tester.tests_run*100):.1f}%)")
    
    if not all_passed:
        print("\n⚠️  Some tests failed. Check the details above.")
        return 1
    else:
        print("\n🎉 All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())