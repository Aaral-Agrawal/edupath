import requests
import sys
import json
from datetime import datetime

class EduPathAPITester:
    def __init__(self, base_url="https://edupath-20.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    else:
                        print(f"   Response: Large data object")
                except:
                    print(f"   Response: Non-JSON response")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/health",
            200
        )
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "/",
            200
        )
        return success

    def test_register_student(self):
        """Test student registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        student_data = {
            "email": f"teststudent{timestamp}@example.com",
            "password": "testpass123",
            "full_name": "Test Student",
            "role": "student",
            "phone": "+91 9876543210",
            "preferred_language": "en"
        }
        
        success, response = self.run_test(
            "Student Registration",
            "POST",
            "/auth/register",
            200,
            data=student_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_register_counselor(self):
        """Test counselor registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        counselor_data = {
            "email": f"testcounselor{timestamp}@example.com",
            "password": "testpass123",
            "full_name": "Test Counselor",
            "role": "counselor",
            "preferred_language": "en"
        }
        
        success, response = self.run_test(
            "Counselor Registration",
            "POST",
            "/auth/register",
            200,
            data=counselor_data
        )
        return success

    def test_login(self):
        """Test login with registered user"""
        if not self.user_data.get('email'):
            print("❌ No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "/auth/me",
            200
        )
        return success

    def test_career_recommendations(self):
        """Test AI career recommendations - core feature"""
        recommendation_data = {
            "interests": ["Technology", "Programming", "Problem Solving"],
            "academic_level": "12th Grade",
            "subjects": ["Mathematics", "Physics", "Computer Science"],
            "strengths": ["Logical thinking", "Creativity"],
            "career_goals": ["Software Development", "AI/ML"]
        }
        
        print(f"\n🧠 Testing AI Career Recommendations (Core Feature)...")
        print(f"   This may take 10-15 seconds as AI generates recommendations...")
        
        success, response = self.run_test(
            "AI Career Recommendations",
            "POST",
            "/career/recommendations",
            200,
            data=recommendation_data
        )
        
        if success and 'recommendations' in response:
            recommendations = response['recommendations']
            print(f"   ✅ Received {len(recommendations)} career recommendations")
            for i, rec in enumerate(recommendations[:2]):  # Show first 2
                print(f"   📋 Recommendation {i+1}: {rec.get('career_title', 'Unknown')}")
                print(f"      Match: {rec.get('match_percentage', 0)}%")
        
        return success

    def test_recommendation_history(self):
        """Test getting recommendation history"""
        success, response = self.run_test(
            "Recommendation History",
            "GET",
            "/career/recommendations/history",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET",
            "/dashboard/stats",
            200
        )
        return success

    def test_scholarships(self):
        """Test scholarships endpoint"""
        success, response = self.run_test(
            "Scholarships List",
            "GET",
            "/scholarships",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   📚 Found {len(response)} scholarships")
            
        return success

    def test_nearby_opportunities(self):
        """Test nearby opportunities endpoint"""
        success, response = self.run_test(
            "Nearby Opportunities",
            "GET",
            "/opportunities/nearby",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   🏫 Found {len(response)} nearby opportunities")
            
        return success

    def test_student_profile(self):
        """Test student profile endpoints"""
        if self.user_data.get('role') != 'student':
            print("⏭️  Skipping student profile test (not a student user)")
            return True
            
        # Get profile
        success1, response1 = self.run_test(
            "Get Student Profile",
            "GET",
            "/profile/student",
            200
        )
        
        # Update profile
        profile_data = {
            "user_id": self.user_data.get('id', ''),
            "academic_level": "12th Grade",
            "subjects": ["Mathematics", "Physics", "Computer Science"],
            "interests": ["Technology", "Programming"],
            "career_goals": ["Software Development"],
            "strengths": ["Problem Solving", "Logical Thinking"]
        }
        
        success2, response2 = self.run_test(
            "Update Student Profile",
            "PUT",
            "/profile/student",
            200,
            data=profile_data
        )
        
        return success1 and success2

    def test_invalid_endpoints(self):
        """Test error handling for invalid endpoints"""
        success, response = self.run_test(
            "Invalid Endpoint (404 Test)",
            "GET",
            "/invalid/endpoint",
            404
        )
        return success

    def test_unauthorized_access(self):
        """Test unauthorized access"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access Test",
            "GET",
            "/career/recommendations/history",
            401
        )
        
        # Restore token
        self.token = temp_token
        return success

def main():
    print("🚀 Starting EduPath API Testing...")
    print("=" * 60)
    
    tester = EduPathAPITester()
    
    # Basic connectivity tests
    print("\n📡 BASIC CONNECTIVITY TESTS")
    print("-" * 40)
    if not tester.test_health_check():
        print("❌ Health check failed - API may be down")
        return 1
    
    if not tester.test_root_endpoint():
        print("❌ Root endpoint failed")
        return 1

    # Authentication tests
    print("\n🔐 AUTHENTICATION TESTS")
    print("-" * 40)
    if not tester.test_register_student():
        print("❌ Student registration failed - stopping tests")
        return 1

    if not tester.test_register_counselor():
        print("⚠️  Counselor registration failed")

    if not tester.test_login():
        print("❌ Login failed - stopping tests")
        return 1

    if not tester.test_get_current_user():
        print("❌ Get current user failed")
        return 1

    # Core feature tests
    print("\n🧠 CORE FEATURE TESTS")
    print("-" * 40)
    if not tester.test_career_recommendations():
        print("❌ AI Career Recommendations failed - CRITICAL ISSUE")
        return 1

    # Additional feature tests
    print("\n📊 ADDITIONAL FEATURE TESTS")
    print("-" * 40)
    tester.test_recommendation_history()
    tester.test_dashboard_stats()
    tester.test_scholarships()
    tester.test_nearby_opportunities()
    tester.test_student_profile()

    # Error handling tests
    print("\n🛡️  ERROR HANDLING TESTS")
    print("-" * 40)
    tester.test_invalid_endpoints()
    tester.test_unauthorized_access()

    # Final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend is working correctly.")
        return 0
    elif tester.tests_passed / tester.tests_run >= 0.8:
        print("✅ Most tests passed. Backend is mostly functional.")
        return 0
    else:
        print("❌ Many tests failed. Backend has significant issues.")
        return 1

if __name__ == "__main__":
    sys.exit(main())