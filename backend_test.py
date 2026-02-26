#!/usr/bin/env python3

import asyncio
import httpx
import json
from datetime import datetime, timezone

# Backend URL from frontend config
BACKEND_URL = "https://reservation-payments.preview.emergentagent.com/api"

class RestaurantAppTester:
    def __init__(self):
        self.auth_token = None
        self.user_data = None
        self.test_results = []

    def log(self, message, status="INFO"):
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")
        self.test_results.append(f"{status}: {message}")

    async def test_orders_endpoints(self):
        """Test the orders endpoints as specified in the review request"""
        self.log("=== TESTING ORDERS ENDPOINTS ===")
        
        # Test 1: POST /api/orders/create without authentication
        await self.test_orders_create_unauthorized()
        
        # Test 2: GET /api/orders/my without authentication  
        await self.test_orders_my_unauthorized()
        
        # Test 3: Check if endpoints exist and are properly configured
        await self.test_endpoints_exist()
        
        # Since there are no traditional register/login endpoints, 
        # we'll test with Emergent auth session exchange
        # For now, let's test the endpoint existence and 401 responses

    async def test_orders_create_unauthorized(self):
        """Test POST /api/orders/create returns 401 without auth token"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                test_payload = {
                    "restaurant_id": "test-restaurant",
                    "items": [
                        {
                            "menu_item_id": "test-item",
                            "name": "Test Item",
                            "price": 25.0,
                            "quantity": 2,
                            "image_url": "https://example.com/image.jpg"
                        }
                    ],
                    "origin_url": "https://example.com"
                }
                
                response = await client.post(
                    f"{BACKEND_URL}/orders/create",
                    json=test_payload
                )
                
                if response.status_code == 401:
                    self.log("✅ POST /api/orders/create correctly returns 401 without auth token", "SUCCESS")
                    return True
                else:
                    self.log(f"❌ POST /api/orders/create returned {response.status_code}, expected 401. Response: {response.text}", "FAIL")
                    return False
                    
        except Exception as e:
            self.log(f"❌ Error testing POST /api/orders/create: {str(e)}", "ERROR")
            return False

    async def test_orders_my_unauthorized(self):
        """Test GET /api/orders/my returns 401 without auth token"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{BACKEND_URL}/orders/my")
                
                if response.status_code == 401:
                    self.log("✅ GET /api/orders/my correctly returns 401 without auth token", "SUCCESS")
                    return True
                else:
                    self.log(f"❌ GET /api/orders/my returned {response.status_code}, expected 401. Response: {response.text}", "FAIL")
                    return False
                    
        except Exception as e:
            self.log(f"❌ Error testing GET /api/orders/my: {str(e)}", "ERROR")
            return False

    async def test_endpoints_exist(self):
        """Test that the endpoints exist and are properly configured"""
        try:
            # Test with invalid/missing auth to check if endpoints exist
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test orders/create endpoint existence
                response1 = await client.post(
                    f"{BACKEND_URL}/orders/create",
                    json={"test": "data"}
                )
                
                # Test orders/my endpoint existence  
                response2 = await client.get(f"{BACKEND_URL}/orders/my")
                
                # Both should return 401 (unauthorized) not 404 (not found)
                if response1.status_code != 404 and response2.status_code != 404:
                    self.log("✅ Both /api/orders/create and /api/orders/my endpoints exist", "SUCCESS")
                    return True
                else:
                    self.log(f"❌ One or both endpoints not found. orders/create: {response1.status_code}, orders/my: {response2.status_code}", "FAIL")
                    return False
                    
        except Exception as e:
            self.log(f"❌ Error checking endpoint existence: {str(e)}", "ERROR")
            return False

    async def test_auth_endpoints_exist(self):
        """Test auth endpoints mentioned in review request"""
        self.log("=== TESTING AUTH ENDPOINT EXISTENCE ===")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Check if traditional register/login endpoints exist
                register_response = await client.post(f"{BACKEND_URL}/auth/register", json={})
                login_response = await client.post(f"{BACKEND_URL}/auth/login", json={})
                
                if register_response.status_code == 404 or login_response.status_code == 404:
                    self.log("⚠️  Traditional /auth/register and /auth/login endpoints not found", "INFO")
                    self.log("ℹ️  This app appears to use Emergent Auth with session exchange instead", "INFO")
                    
                    # Test the actual auth endpoints that exist
                    session_response = await client.post(f"{BACKEND_URL}/auth/session", headers={"X-Session-ID": "test"})
                    me_response = await client.get(f"{BACKEND_URL}/auth/me")
                    
                    if session_response.status_code != 404 and me_response.status_code != 404:
                        self.log("✅ Emergent Auth endpoints (/auth/session, /auth/me) exist", "SUCCESS")
                        return True
                else:
                    self.log("✅ Traditional auth endpoints exist", "SUCCESS")
                    return True
                    
        except Exception as e:
            self.log(f"❌ Error checking auth endpoints: {str(e)}", "ERROR")
            return False

    async def run_all_tests(self):
        """Run all tests"""
        self.log("Starting Restaurant App Orders API Testing")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        success_count = 0
        total_tests = 0
        
        # Test auth endpoints
        total_tests += 1
        if await self.test_auth_endpoints_exist():
            success_count += 1
        
        # Test orders endpoints
        total_tests += 1
        if await self.test_orders_create_unauthorized():
            success_count += 1
            
        total_tests += 1    
        if await self.test_orders_my_unauthorized():
            success_count += 1
            
        total_tests += 1
        if await self.test_endpoints_exist():
            success_count += 1
        
        self.log(f"\n=== TEST SUMMARY ===")
        self.log(f"Total Tests: {total_tests}")
        self.log(f"Passed: {success_count}")
        self.log(f"Failed: {total_tests - success_count}")
        self.log(f"Success Rate: {(success_count/total_tests)*100:.1f}%")
        
        if success_count == total_tests:
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
        else:
            self.log("⚠️  Some tests failed. Check details above.", "WARNING")
        
        return success_count == total_tests

async def main():
    tester = RestaurantAppTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())