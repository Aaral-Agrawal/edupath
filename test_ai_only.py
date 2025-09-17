import requests
import json
from datetime import datetime

# Test AI Career Recommendations specifically
base_url = "https://edupath-20.preview.emergentagent.com/api"

# First register a user
timestamp = datetime.now().strftime('%H%M%S')
student_data = {
    "email": f"teststudent{timestamp}@example.com",
    "password": "testpass123",
    "full_name": "Test Student",
    "role": "student",
    "preferred_language": "en"
}

print("🔐 Registering test user...")
response = requests.post(f"{base_url}/auth/register", json=student_data, timeout=60)
if response.status_code == 200:
    token = response.json()['access_token']
    print("✅ User registered successfully")
else:
    print(f"❌ Registration failed: {response.status_code}")
    exit(1)

# Test AI Career Recommendations
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

recommendation_data = {
    "interests": ["Technology", "Programming", "Problem Solving"],
    "academic_level": "12th Grade",
    "subjects": ["Mathematics", "Physics", "Computer Science"],
    "strengths": ["Logical thinking", "Creativity"],
    "career_goals": ["Software Development", "AI/ML"]
}

print("\n🧠 Testing AI Career Recommendations...")
print("⏳ This may take 30-60 seconds as AI generates recommendations...")

try:
    response = requests.post(
        f"{base_url}/career/recommendations", 
        json=recommendation_data, 
        headers=headers, 
        timeout=90
    )
    
    if response.status_code == 200:
        data = response.json()
        recommendations = data.get('recommendations', [])
        print(f"✅ AI Career Recommendations successful!")
        print(f"📊 Received {len(recommendations)} recommendations")
        
        for i, rec in enumerate(recommendations[:3]):  # Show first 3
            print(f"\n📋 Recommendation {i+1}:")
            print(f"   Career: {rec.get('career_title', 'Unknown')}")
            print(f"   Match: {rec.get('match_percentage', 0)}%")
            print(f"   Description: {rec.get('description', 'No description')[:100]}...")
            
        print("\n🎉 AI Integration is working correctly!")
        
    else:
        print(f"❌ AI Recommendations failed: {response.status_code}")
        print(f"Error: {response.text}")
        
except requests.exceptions.Timeout:
    print("❌ Request timed out - AI may be taking too long")
except Exception as e:
    print(f"❌ Error: {str(e)}")