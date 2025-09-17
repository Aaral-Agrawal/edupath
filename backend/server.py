from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="EduPath API", description="Career & Education Advisory Platform", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)
JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'])

# Enums
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    PARENT = "parent"
    COUNSELOR = "counselor"
    ADMIN = "admin"

class Language(str, Enum):
    ENGLISH = "en"
    HINDI = "hi"
    KASHMIRI = "ks"

# Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    preferred_language: Language = Language.ENGLISH
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class StudentProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    academic_level: str = "Not specified"  # 10th, 12th, Graduate, etc.
    subjects: List[str] = []
    interests: List[str] = []
    career_goals: List[str] = []
    strengths: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CareerRecommendationRequest(BaseModel):
    interests: List[str]
    academic_level: str
    subjects: List[str]
    strengths: Optional[List[str]] = []
    career_goals: Optional[List[str]] = []

class CareerRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    request_data: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QuizResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    quiz_type: str  # spot_odd, riddle, puzzle
    questions: List[Dict[str, Any]]
    answers: List[Dict[str, Any]]
    score: int
    analysis: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Authentication Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
        
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_data = await db.users.find_one({"id": user_id})
    if user_data is None:
        raise credentials_exception
    
    return User(**user_data)

# AI Service
class CareerAdvisorAI:
    def __init__(self):
        self.api_key = os.environ['EMERGENT_LLM_KEY']
        
    async def get_career_recommendations(self, request: CareerRecommendationRequest) -> List[Dict[str, Any]]:
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"career_session_{uuid.uuid4()}",
                system_message="You are an expert career counselor specializing in education and career guidance in the Kashmir region. Provide personalized, practical career recommendations based on user input. Focus on opportunities available in Kashmir and nearby regions, including traditional careers, emerging fields, and entrepreneurship opportunities. Always provide specific, actionable advice."
            ).with_model("anthropic", "claude-3-7-sonnet-20250219")
            
            user_message = UserMessage(
                text=f"""
                Please provide career recommendations for a student with the following profile:
                
                Academic Level: {request.academic_level}
                Subjects: {', '.join(request.subjects)}  
                Interests: {', '.join(request.interests)}
                Strengths: {', '.join(request.strengths) if request.strengths else 'Not specified'}
                Career Goals: {', '.join(request.career_goals) if request.career_goals else 'Exploring options'}
                
                Please provide:
                1. Top 5 career recommendations with detailed explanations
                2. Educational pathways for each career
                3. Local opportunities in Kashmir/India
                4. Skills to develop
                5. Expected salary ranges
                6. Growth prospects
                
                Format your response as a structured JSON with the following structure:
                {{
                    "recommendations": [
                        {{
                            "career_title": "Career Name",
                            "description": "Detailed description",
                            "education_path": "Required education",
                            "local_opportunities": "Opportunities in Kashmir/nearby regions",
                            "skills_needed": ["skill1", "skill2"],
                            "salary_range": "Expected salary range",
                            "growth_prospects": "Career growth information",
                            "match_percentage": 85
                        }}
                    ]
                }}
                """
            )
            
            response = await chat.send_message(user_message)
            
            # Parse AI response
            try:
                # Try to extract JSON from the response
                response_text = str(response)
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    json_text = response_text[json_start:json_end].strip()
                elif "{" in response_text:
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    json_text = response_text[json_start:json_end]
                else:
                    # Fallback: create structured response from plain text
                    return self._create_fallback_recommendations(request)
                
                parsed_response = json.loads(json_text)
                return parsed_response.get("recommendations", [])
                
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return self._create_fallback_recommendations(request)
                
        except Exception as e:
            logging.error(f"AI recommendation error: {str(e)}")
            return self._create_fallback_recommendations(request)
    
    def _create_fallback_recommendations(self, request: CareerRecommendationRequest) -> List[Dict[str, Any]]:
        """Fallback recommendations if AI fails"""
        fallback_careers = [
            {
                "career_title": "Software Development",
                "description": "Design and develop software applications, websites, and systems",
                "education_path": "Bachelor's in Computer Science or related field",
                "local_opportunities": "Growing IT sector in Srinagar, remote work opportunities",
                "skills_needed": ["Programming", "Problem-solving", "Logical thinking"],
                "salary_range": "₹3-15 LPA",
                "growth_prospects": "High demand, excellent growth potential",
                "match_percentage": 75
            },
            {
                "career_title": "Digital Marketing",
                "description": "Promote businesses and products through digital channels",
                "education_path": "Any graduation + Digital Marketing courses",
                "local_opportunities": "Tourism, handicrafts, local businesses need digital presence",
                "skills_needed": ["Creativity", "Analytics", "Communication"],
                "salary_range": "₹2-8 LPA",
                "growth_prospects": "Growing field with entrepreneurship opportunities",
                "match_percentage": 70
            },
            {
                "career_title": "Healthcare Professional",
                "description": "Provide medical care and health services to communities",
                "education_path": "Medical degree (MBBS/BDS) or allied health courses",
                "local_opportunities": "Government hospitals, private clinics, healthcare startups",
                "skills_needed": ["Empathy", "Science knowledge", "Problem-solving"],
                "salary_range": "₹5-25 LPA",
                "growth_prospects": "Always in demand, respect in society",
                "match_percentage": 80
            }
        ]
        
        # Filter based on interests if available
        if request.interests:
            interest_keywords = [interest.lower() for interest in request.interests]
            if any(keyword in ['computer', 'technology', 'coding', 'programming'] for keyword in interest_keywords):
                return [fallback_careers[0]] + fallback_careers[1:]
            elif any(keyword in ['marketing', 'business', 'creative'] for keyword in interest_keywords):
                return [fallback_careers[1]] + [fallback_careers[0], fallback_careers[2]]
            elif any(keyword in ['health', 'medical', 'biology', 'helping'] for keyword in interest_keywords):
                return [fallback_careers[2]] + fallback_careers[:2]
        
        return fallback_careers

career_ai = CareerAdvisorAI()

# Routes

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict['password']
    
    user = User(**user_dict)
    user_with_password = user.dict()
    user_with_password['hashed_password'] = hashed_password
    
    await db.users.insert_one(user_with_password)
    
    # Create student profile if user is a student
    if user.role == UserRole.STUDENT:
        student_profile = StudentProfile(user_id=user.id)
        await db.student_profiles.insert_one(student_profile.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": user_credentials.email})
    if not user_data or not verify_password(user_credentials.password, user_data['hashed_password']):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    user = User(**{k: v for k, v in user_data.items() if k != 'hashed_password'})
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/career/recommendations", response_model=CareerRecommendation)
async def get_career_recommendations(
    request: CareerRecommendationRequest,
    current_user: User = Depends(get_current_user)
):
    # Get AI recommendations
    recommendations = await career_ai.get_career_recommendations(request)
    
    # Save to database
    career_rec = CareerRecommendation(
        user_id=current_user.id,
        request_data=request.dict(),
        recommendations=recommendations
    )
    
    await db.career_recommendations.insert_one(career_rec.dict())
    
    return career_rec

@api_router.get("/career/recommendations/history")
async def get_recommendation_history(current_user: User = Depends(get_current_user)):
    recommendations = await db.career_recommendations.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(10)
    
    return recommendations

@api_router.get("/profile/student")
async def get_student_profile(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = await db.student_profiles.find_one({"user_id": current_user.id})
    return profile

@api_router.put("/profile/student")
async def update_student_profile(
    profile_data: StudentProfile,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile_data.user_id = current_user.id
    await db.student_profiles.update_one(
        {"user_id": current_user.id},
        {"$set": profile_data.dict()},
        upsert=True
    )
    
    return {"message": "Profile updated successfully"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics based on user role"""
    stats = {"role": current_user.role}
    
    if current_user.role == UserRole.STUDENT:
        # Get student-specific stats
        recommendations_count = await db.career_recommendations.count_documents({"user_id": current_user.id})
        quiz_count = await db.quiz_results.count_documents({"user_id": current_user.id})
        
        stats.update({
            "recommendations_received": recommendations_count,
            "quizzes_completed": quiz_count,
            "profile_completion": 75  # This would be calculated based on profile data
        })
        
    elif current_user.role == UserRole.COUNSELOR:
        # Get counselor-specific stats
        total_students = await db.users.count_documents({"role": "student"})
        
        stats.update({
            "total_students": total_students,
            "active_sessions": 5,  # This would be calculated from active counseling sessions
            "recommendations_given": 25  # This would be calculated from counselor's recommendations
        })
    
    return stats

@api_router.get("/scholarships")
async def get_scholarships(
    category: Optional[str] = None,
    eligibility: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get scholarship information with filters"""
    # Mock scholarship data - in real app, this would come from database
    scholarships = [
        {
            "id": "1",
            "title": "Kashmir Merit Scholarship",
            "description": "For meritorious students from Kashmir region",
            "amount": "₹50,000 per year",
            "eligibility": "12th pass with 85%+ marks",
            "category": "merit",
            "deadline": "2024-03-31",
            "provider": "J&K Government"
        },
        {
            "id": "2", 
            "title": "Technical Education Scholarship",
            "description": "For students pursuing engineering and technical courses",
            "amount": "₹75,000 per year",
            "eligibility": "Enrolled in engineering/technical course",
            "category": "technical",
            "deadline": "2024-04-15",
            "provider": "AICTE"
        },
        {
            "id": "3",
            "title": "Minority Community Scholarship",
            "description": "Financial assistance for minority community students",
            "amount": "₹30,000 per year",
            "eligibility": "Minority community, family income < ₹2 LPA",
            "category": "minority",
            "deadline": "2024-05-01",
            "provider": "Minority Affairs Ministry"
        }
    ]
    
    # Apply filters
    if category:
        scholarships = [s for s in scholarships if s["category"] == category]
    if eligibility:
        scholarships = [s for s in scholarships if eligibility.lower() in s["eligibility"].lower()]
    
    return scholarships

@api_router.get("/opportunities/nearby")
async def get_nearby_opportunities(
    latitude: Optional[float] = 34.0837,  # Default to Srinagar
    longitude: Optional[float] = 74.7973,
    radius: Optional[int] = 50,  # km
    current_user: User = Depends(get_current_user)
):
    """Get nearby educational opportunities"""
    # Mock data for nearby opportunities - in real app, integrate with Google Maps API
    opportunities = [
        {
            "id": "1",
            "name": "National Institute of Technology Srinagar",
            "type": "Engineering College",
            "location": "Srinagar, J&K",
            "distance": "5 km",
            "courses": ["B.Tech", "M.Tech", "PhD"],
            "rating": 4.2,
            "contact": "+91-194-2422032"
        },
        {
            "id": "2",
            "name": "Kashmir University",
            "type": "University",
            "location": "Srinagar, J&K", 
            "distance": "8 km",
            "courses": ["Arts", "Science", "Commerce", "Engineering"],
            "rating": 4.0,
            "contact": "+91-194-2420073"
        },
        {
            "id": "3",
            "name": "Government Polytechnic Srinagar",
            "type": "Polytechnic",
            "location": "Srinagar, J&K",
            "distance": "3 km",
            "courses": ["Diploma in Engineering", "Diploma in Technology"],
            "rating": 3.8,
            "contact": "+91-194-2452516"
        }
    ]
    
    return opportunities

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "EduPath API is running"}

@api_router.get("/")
async def root():
    return {"message": "Welcome to EduPath API - Your Career & Education Advisory Platform"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()