from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
import re
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
TRANSACTION_FEE_PERCENTAGE = 1.7  # 1.7% fee on purchases
SUPPORT_EMAIL_CLIENTS = "support.clienti@restaurantapp.ro"
SUPPORT_EMAIL_COMPANIES = "support.firme@restaurantapp.ro"
ADMIN_EMAIL = "mutinyretreat37@gmail.com"

# ANAF API for CUI verification
ANAF_API_URL = "https://webservicesp.anaf.ro/AsynchWebService/api/v8/ws/tva"

# ==================== MODELS ====================

# Food Categories
FOOD_CATEGORIES = [
    {"id": "pizza", "name": "Pizza", "icon": "pizza-outline"},
    {"id": "aperitive", "name": "Aperitive", "icon": "restaurant-outline"},
    {"id": "sushi", "name": "Sushi", "icon": "fish-outline"},
    {"id": "alcool", "name": "Alcool", "icon": "wine-outline"},
    {"id": "exclusive", "name": "Restaurante Exclusive", "icon": "star-outline"},
    {"id": "bauturi", "name": "Băuturi", "icon": "cafe-outline"},
    {"id": "deserturi", "name": "Deserturi", "icon": "ice-cream-outline"},
    {"id": "fast-food", "name": "Fast Food", "icon": "fast-food-outline"},
]

# Auth Models
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_company: bool = False
    company_id: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# Company/Business Models
class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str  # user_id of the owner
    company_name: str
    cui: str  # CUI number (2-10 digits)
    email: str
    phone: str
    is_verified: bool = False  # Admin verification status
    verification_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator('cui')
    def validate_cui(cls, v):
        if not re.match(r'^\d{2,10}$', v):
            raise ValueError('CUI trebuie să conțină între 2 și 10 cifre')
        return v

class CompanyRegister(BaseModel):
    company_name: str
    cui: str
    email: str
    phone: str

    @validator('cui')
    def validate_cui(cls, v):
        if not re.match(r'^\d{2,10}$', v):
            raise ValueError('CUI trebuie să conțină între 2 și 10 cifre')
        return v

# Product Section for company stores
class ProductSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Aperitive", "Pizza", "Băuturi"
    order: int = 0

# Company Store/Restaurant
class CompanyStore(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    description: Optional[str] = None  # Max 50 words
    address: str
    latitude: float = 0.0
    longitude: float = 0.0
    cover_image: str
    gallery_images: List[str] = []
    images_3d: List[str] = []  # 3D meal images
    sections: List[ProductSection] = []
    cuisine_type: str
    categories: List[str] = []  # Food categories
    price_range: str = "$$"
    opening_hours: str
    phone: str
    is_active: bool = True
    rating: float = 0.0
    review_count: int = 0
    likes: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator('description')
    def validate_description(cls, v):
        if v and len(v.split()) > 50:
            raise ValueError('Descrierea nu poate depăși 50 de cuvinte')
        return v

class CompanyStoreCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    latitude: float = 0.0
    longitude: float = 0.0
    cover_image: str
    gallery_images: List[str] = []
    sections: List[str] = []  # Section names
    cuisine_type: str
    categories: List[str] = []
    price_range: str = "$$"
    opening_hours: str
    phone: str

# Store Product/Menu Item
class StoreProduct(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_id: str
    section_id: str
    name: str
    description: str
    price: float
    quantity: str
    image_url: str
    image_3d_url: Optional[str] = None  # 3D image
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoreProductCreate(BaseModel):
    section_id: str
    name: str
    description: str
    price: float
    quantity: str
    image_url: str
    image_3d_url: Optional[str] = None

# Transaction/Order with fee
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    store_id: str
    items: List[dict]  # [{product_id, quantity, price}]
    subtotal: float
    fee_amount: float  # 1.7% fee
    total: float
    status: str = "pending"  # pending, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Restaurant Models
class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    quantity: str  # e.g., "300g", "1 portion"
    image_url: str
    image_3d_url: Optional[str] = None
    category: str  # e.g., "Aperitive", "Fel principal", "Desert"

class Restaurant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    address: str
    latitude: float
    longitude: float
    cover_image: str
    interior_images: List[str] = []
    images_3d: List[str] = []
    rating: float = 0.0
    review_count: int = 0
    likes: int = 0
    is_sponsored: bool = False
    is_new: bool = False
    cuisine_type: str
    categories: List[str] = []  # Food categories
    price_range: str  # "$", "$$", "$$$"
    opening_hours: str
    phone: str
    menu: List[MenuItem] = []
    company_id: Optional[str] = None  # If owned by a company
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantCreate(BaseModel):
    name: str
    description: str
    address: str
    latitude: float
    longitude: float
    cover_image: str
    interior_images: List[str] = []
    is_sponsored: bool = False
    is_new: bool = False
    cuisine_type: str
    categories: List[str] = []
    price_range: str
    opening_hours: str
    phone: str

# Review Models
class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    rating: int  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    restaurant_id: str
    rating: int
    comment: str

# Reservation Models
class Reservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    restaurant_name: str
    user_id: str
    user_name: str
    user_email: str
    date: str
    time: str
    guests: int
    special_requests: Optional[str] = None
    status: str = "pending"  # pending, confirmed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReservationCreate(BaseModel):
    restaurant_id: str
    date: str
    time: str
    guests: int
    special_requests: Optional[str] = None

# Payment Models
class PaymentMethod(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    card_type: str  # "visa", "mastercard", "amex"
    last_four: str
    expiry_month: str
    expiry_year: str
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentMethodCreate(BaseModel):
    card_type: str
    last_four: str
    expiry_month: str
    expiry_year: str
    is_default: bool = False

# Like Model
class RestaurantLike(BaseModel):
    user_id: str
    restaurant_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request) -> Optional[str]:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    # Fallback to Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None

async def get_current_user(request: Request) -> Optional[User]:
    session_token = await get_session_token(request)
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    if not session:
        return None
    
    # Check expiry with timezone awareness
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Nu ești autentificat")
    return user

async def require_admin(request: Request) -> User:
    """Require admin authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Nu ești autentificat")
    if user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni de administrator")
    return user

async def is_admin(user: User) -> bool:
    """Check if user is admin"""
    return user.email == ADMIN_EMAIL

# ==================== ANAF CUI VERIFICATION ====================

async def verify_cui_anaf(cui: str) -> dict:
    """Verify CUI with ANAF API and get company info"""
    try:
        # Clean CUI - remove 'RO' prefix if present
        clean_cui = cui.upper().replace('RO', '').strip()
        
        # Prepare request body for ANAF API
        today = datetime.now().strftime("%Y-%m-%d")
        request_body = [{"cui": int(clean_cui), "data": today}]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                ANAF_API_URL,
                json=request_body,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("found") and len(data["found"]) > 0:
                    company_data = data["found"][0]
                    return {
                        "valid": True,
                        "cui": clean_cui,
                        "name": company_data.get("denumire", ""),
                        "address": company_data.get("adresa", ""),
                        "phone": company_data.get("telefon", ""),
                        "registration_date": company_data.get("data_inregistrare", ""),
                        "is_tva_payer": company_data.get("scpTVA", False),
                        "status": company_data.get("statusRO_Activa", ""),
                        "raw_data": company_data
                    }
                else:
                    return {
                        "valid": False,
                        "cui": clean_cui,
                        "error": "CUI negăsit în baza de date ANAF"
                    }
            else:
                logger.error(f"ANAF API error: {response.status_code}")
                return {
                    "valid": False,
                    "cui": clean_cui,
                    "error": f"Eroare ANAF API: {response.status_code}"
                }
    except Exception as e:
        logger.error(f"CUI verification error: {e}")
        return {
            "valid": False,
            "cui": cui,
            "error": str(e)
        }

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID lipsă")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sesiune invalidă")
            
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth API error: {e}")
            raise HTTPException(status_code=500, detail="Eroare de autentificare")
    
    session_data = SessionDataResponse(**user_data)
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": session_data.email},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "phone": None,
            "address": None,
            "is_company": False,
            "company_id": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_data.session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "session_token": session_data.session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Nu ești autentificat")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_token(request)
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Deconectat cu succes"}

# ==================== USER ROUTES ====================

@api_router.put("/users/me")
async def update_user(update: UserUpdate, user: User = Depends(require_auth)):
    """Update current user profile"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return User(**updated_user)

# ==================== RESTAURANT ROUTES ====================

@api_router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants(
    sort_by: str = "sponsored",
    search: Optional[str] = None
):
    """Get all restaurants with sorting"""
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"cuisine_type": {"$regex": search, "$options": "i"}}
        ]
    
    restaurants = await db.restaurants.find(query, {"_id": 0}).to_list(1000)
    
    if sort_by == "sponsored":
        restaurants.sort(key=lambda x: (not x.get("is_sponsored", False), -x.get("likes", 0)))
    elif sort_by == "popular":
        restaurants.sort(key=lambda x: -x.get("review_count", 0))
    elif sort_by == "liked":
        restaurants.sort(key=lambda x: -x.get("likes", 0))
    elif sort_by == "rating":
        restaurants.sort(key=lambda x: -x.get("rating", 0))
    elif sort_by == "new":
        restaurants.sort(key=lambda x: (not x.get("is_new", False), x.get("created_at", datetime.min)), reverse=True)
    
    return [Restaurant(**r) for r in restaurants]

@api_router.get("/restaurants/new", response_model=List[Restaurant])
async def get_new_restaurants():
    """Get new restaurants"""
    restaurants = await db.restaurants.find({"is_new": True}, {"_id": 0}).to_list(100)
    return [Restaurant(**r) for r in restaurants]

@api_router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(restaurant_id: str):
    """Get single restaurant"""
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant negăsit")
    return Restaurant(**restaurant)

@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(data: RestaurantCreate):
    """Create a new restaurant (admin only in real app)"""
    restaurant = Restaurant(**data.dict())
    await db.restaurants.insert_one(restaurant.dict())
    return restaurant

@api_router.post("/restaurants/{restaurant_id}/menu")
async def add_menu_item(restaurant_id: str, item: MenuItem):
    """Add menu item to restaurant"""
    result = await db.restaurants.update_one(
        {"id": restaurant_id},
        {"$push": {"menu": item.dict()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant negăsit")
    return {"message": "Element adăugat în meniu"}

@api_router.post("/restaurants/{restaurant_id}/like")
async def toggle_like(
    restaurant_id: str,
    user: User = Depends(require_auth)
):
    """Toggle like on restaurant"""
    existing_like = await db.restaurant_likes.find_one({
        "user_id": user.user_id,
        "restaurant_id": restaurant_id
    })
    
    if existing_like:
        await db.restaurant_likes.delete_one({
            "user_id": user.user_id,
            "restaurant_id": restaurant_id
        })
        await db.restaurants.update_one(
            {"id": restaurant_id},
            {"$inc": {"likes": -1}}
        )
        return {"liked": False}
    else:
        like = RestaurantLike(user_id=user.user_id, restaurant_id=restaurant_id)
        await db.restaurant_likes.insert_one(like.dict())
        await db.restaurants.update_one(
            {"id": restaurant_id},
            {"$inc": {"likes": 1}}
        )
        return {"liked": True}

@api_router.get("/restaurants/{restaurant_id}/liked")
async def check_liked(
    restaurant_id: str,
    user: User = Depends(require_auth)
):
    """Check if user liked a restaurant"""
    existing_like = await db.restaurant_likes.find_one({
        "user_id": user.user_id,
        "restaurant_id": restaurant_id
    })
    return {"liked": existing_like is not None}

# ==================== REVIEW ROUTES ====================

@api_router.get("/restaurants/{restaurant_id}/reviews", response_model=List[Review])
async def get_reviews(restaurant_id: str):
    """Get reviews for a restaurant"""
    reviews = await db.reviews.find(
        {"restaurant_id": restaurant_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [Review(**r) for r in reviews]

@api_router.post("/reviews", response_model=Review)
async def create_review(
    data: ReviewCreate,
    user: User = Depends(require_auth)
):
    """Create a review"""
    review = Review(
        restaurant_id=data.restaurant_id,
        user_id=user.user_id,
        user_name=user.name,
        user_picture=user.picture,
        rating=data.rating,
        comment=data.comment
    )
    await db.reviews.insert_one(review.dict())
    
    # Update restaurant rating
    all_reviews = await db.reviews.find(
        {"restaurant_id": data.restaurant_id},
        {"_id": 0}
    ).to_list(1000)
    
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.restaurants.update_one(
        {"id": data.restaurant_id},
        {
            "$set": {"rating": round(avg_rating, 1)},
            "$inc": {"review_count": 1}
        }
    )
    
    return review

# ==================== RESERVATION ROUTES ====================

@api_router.get("/reservations", response_model=List[Reservation])
async def get_reservations(user: User = Depends(require_auth)):
    """Get user's reservations"""
    reservations = await db.reservations.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [Reservation(**r) for r in reservations]

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(
    data: ReservationCreate,
    user: User = Depends(require_auth)
):
    """Create a reservation"""
    restaurant = await db.restaurants.find_one({"id": data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant negăsit")
    
    reservation = Reservation(
        restaurant_id=data.restaurant_id,
        restaurant_name=restaurant["name"],
        user_id=user.user_id,
        user_name=user.name,
        user_email=user.email,
        date=data.date,
        time=data.time,
        guests=data.guests,
        special_requests=data.special_requests
    )
    await db.reservations.insert_one(reservation.dict())
    return reservation

@api_router.put("/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: str,
    user: User = Depends(require_auth)
):
    """Cancel a reservation"""
    result = await db.reservations.update_one(
        {"id": reservation_id, "user_id": user.user_id},
        {"$set": {"status": "cancelled"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rezervare negăsită")
    return {"message": "Rezervare anulată"}

# ==================== PAYMENT ROUTES ====================

@api_router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(user: User = Depends(require_auth)):
    """Get user's payment methods"""
    methods = await db.payment_methods.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    return [PaymentMethod(**m) for m in methods]

@api_router.post("/payment-methods", response_model=PaymentMethod)
async def add_payment_method(
    data: PaymentMethodCreate,
    user: User = Depends(require_auth)
):
    """Add a payment method"""
    # If this is the first card or set as default, update others
    if data.is_default:
        await db.payment_methods.update_many(
            {"user_id": user.user_id},
            {"$set": {"is_default": False}}
        )
    
    method = PaymentMethod(
        user_id=user.user_id,
        **data.dict()
    )
    await db.payment_methods.insert_one(method.dict())
    return method

@api_router.delete("/payment-methods/{method_id}")
async def delete_payment_method(
    method_id: str,
    user: User = Depends(require_auth)
):
    """Delete a payment method"""
    result = await db.payment_methods.delete_one({
        "id": method_id,
        "user_id": user.user_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Metodă de plată negăsită")
    return {"message": "Metodă de plată ștearsă"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial restaurant data"""
    # Check if data already exists
    count = await db.restaurants.count_documents({})
    if count > 0:
        return {"message": "Date deja existente", "count": count}
    
    restaurants = [
        {
            "id": str(uuid.uuid4()),
            "name": "Casa Veche",
            "description": "Restaurant tradițional românesc cu atmosferă caldă și autentică. Savurați cele mai bune preparate locale.",
            "address": "Str. Victoriei 45, București",
            "latitude": 44.4268,
            "longitude": 26.1025,
            "cover_image": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            "interior_images": [
                "https://images.unsplash.com/photo-1667388969250-1c7220bf3f37?w=800",
                "https://images.unsplash.com/photo-1538333581680-29dd4752ddf2?w=800"
            ],
            "rating": 4.8,
            "review_count": 245,
            "likes": 892,
            "is_sponsored": True,
            "is_new": False,
            "cuisine_type": "Românesc",
            "price_range": "$$",
            "opening_hours": "10:00 - 23:00",
            "phone": "+40 21 123 4567",
            "menu": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Sarmale",
                    "description": "Sarmale în foi de varză cu smântână și mămăligă",
                    "price": 45.0,
                    "quantity": "300g",
                    "image_url": "https://images.unsplash.com/photo-1623073284788-0d846f75e329?w=400",
                    "category": "Fel Principal"
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Ciorbă de burtă",
                    "description": "Ciorbă tradițională cu smântână și ardei iute",
                    "price": 28.0,
                    "quantity": "400ml",
                    "image_url": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400",
                    "category": "Supe"
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Papanași",
                    "description": "Papanași cu smântână și dulceață de afine",
                    "price": 32.0,
                    "quantity": "2 buc",
                    "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
                    "category": "Desert"
                }
            ],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bucătăria Modernă",
            "description": "Fuziune contemporană cu ingrediente locale proaspete și prezentări artistice.",
            "address": "Bd. Unirii 120, București",
            "latitude": 44.4200,
            "longitude": 26.1100,
            "cover_image": "https://images.unsplash.com/photo-1667388969250-1c7220bf3f37?w=800",
            "interior_images": [
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"
            ],
            "rating": 4.6,
            "review_count": 189,
            "likes": 654,
            "is_sponsored": False,
            "is_new": True,
            "cuisine_type": "Fusion",
            "price_range": "$$$",
            "opening_hours": "12:00 - 00:00",
            "phone": "+40 21 234 5678",
            "menu": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Risotto cu trufe",
                    "description": "Risotto cremos cu trufe negre și parmezan",
                    "price": 78.0,
                    "quantity": "280g",
                    "image_url": "https://images.unsplash.com/photo-1623073284788-0d846f75e329?w=400",
                    "category": "Fel Principal"
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Tartare de vită",
                    "description": "Tartare clasic cu gălbenuș și capere",
                    "price": 65.0,
                    "quantity": "180g",
                    "image_url": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400",
                    "category": "Aperitive"
                }
            ],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pescăruș",
            "description": "Specialități de fructe de mare și pește proaspăt în ambianță mediteraneană.",
            "address": "Str. Lipscani 78, București",
            "latitude": 44.4310,
            "longitude": 26.0980,
            "cover_image": "https://images.unsplash.com/photo-1538333581680-29dd4752ddf2?w=800",
            "interior_images": [],
            "rating": 4.5,
            "review_count": 156,
            "likes": 432,
            "is_sponsored": True,
            "is_new": False,
            "cuisine_type": "Mediteranean",
            "price_range": "$$$",
            "opening_hours": "11:00 - 23:00",
            "phone": "+40 21 345 6789",
            "menu": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Gratar de pește",
                    "description": "Pește proaspăt la grătar cu legume și lămâie",
                    "price": 85.0,
                    "quantity": "350g",
                    "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
                    "category": "Fel Principal"
                }
            ],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "La Mama",
            "description": "Bucătărie tradițională cu rețete moștenite din generație în generație.",
            "address": "Calea Dorobanți 55, București",
            "latitude": 44.4450,
            "longitude": 26.0900,
            "cover_image": "https://images.pexels.com/photos/785541/pexels-photo-785541.jpeg?w=800",
            "interior_images": [],
            "rating": 4.7,
            "review_count": 320,
            "likes": 1024,
            "is_sponsored": False,
            "is_new": False,
            "cuisine_type": "Românesc",
            "price_range": "$",
            "opening_hours": "09:00 - 22:00",
            "phone": "+40 21 456 7890",
            "menu": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Mici cu muștar",
                    "description": "10 mici tradiționali cu muștar și pâine",
                    "price": 35.0,
                    "quantity": "10 buc",
                    "image_url": "https://images.unsplash.com/photo-1623073284788-0d846f75e329?w=400",
                    "category": "Fel Principal"
                }
            ],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sushi Master",
            "description": "Cel mai autentic sushi din oraș, cu ingrediente importate din Japonia.",
            "address": "Str. Primăverii 22, București",
            "latitude": 44.4500,
            "longitude": 26.0850,
            "cover_image": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
            "interior_images": [],
            "rating": 4.9,
            "review_count": 412,
            "likes": 1567,
            "is_sponsored": False,
            "is_new": True,
            "cuisine_type": "Japonez",
            "price_range": "$$$",
            "opening_hours": "12:00 - 23:00",
            "phone": "+40 21 567 8901",
            "menu": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Dragon Roll",
                    "description": "Roll cu țipar, avocado și sos unagi",
                    "price": 58.0,
                    "quantity": "8 buc",
                    "image_url": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400",
                    "category": "Sushi"
                }
            ],
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.restaurants.insert_many(restaurants)
    return {"message": "Date inițiale adăugate", "count": len(restaurants)}

# ==================== CUI VERIFICATION ====================

@api_router.get("/cui/verify/{cui}")
async def verify_cui(cui: str):
    """Verify CUI with ANAF API"""
    result = await verify_cui_anaf(cui)
    return result

@api_router.post("/companies/register-with-verification")
async def register_company_with_verification(
    data: CompanyRegister,
    user: User = Depends(require_auth)
):
    """Register as a company with automatic CUI verification"""
    # Check if user already has a company
    existing = await db.companies.find_one({"owner_id": user.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ai deja o firmă înregistrată")
    
    # Check if CUI already exists in our system
    cui_exists = await db.companies.find_one({"cui": data.cui})
    if cui_exists:
        raise HTTPException(status_code=400, detail="Acest CUI este deja înregistrat")
    
    # Verify CUI with ANAF
    anaf_result = await verify_cui_anaf(data.cui)
    
    if not anaf_result.get("valid"):
        raise HTTPException(
            status_code=400, 
            detail=f"CUI invalid: {anaf_result.get('error', 'Verificarea a eșuat')}"
        )
    
    # Use company name from ANAF if available
    official_name = anaf_result.get("name") or data.company_name
    
    company = Company(
        owner_id=user.user_id,
        company_name=official_name,
        cui=data.cui,
        email=data.email,
        phone=data.phone,
        is_verified=True,  # Auto-verified through ANAF
        verification_date=datetime.now(timezone.utc)
    )
    
    # Store ANAF data
    company_dict = company.dict()
    company_dict["anaf_data"] = anaf_result
    
    await db.companies.insert_one(company_dict)
    
    # Update user as company owner
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"is_company": True, "company_id": company.id}}
    )
    
    return {
        "message": "Firma a fost înregistrată și verificată automat prin ANAF!",
        "company_id": company.id,
        "company_name": official_name,
        "anaf_verified": True
    }

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/check")
async def check_admin(user: User = Depends(require_auth)):
    """Check if user is admin"""
    return {
        "is_admin": user.email == ADMIN_EMAIL,
        "email": user.email,
        "admin_email": ADMIN_EMAIL
    }

@api_router.get("/admin/companies")
async def admin_get_companies(user: User = Depends(require_admin)):
    """Admin: Get all companies"""
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    return companies

@api_router.get("/admin/companies/pending")
async def admin_get_pending_companies(user: User = Depends(require_admin)):
    """Admin: Get companies pending verification"""
    companies = await db.companies.find(
        {"is_verified": False},
        {"_id": 0}
    ).to_list(100)
    return companies

@api_router.put("/admin/companies/{company_id}/verify")
async def admin_verify_company(company_id: str, user: User = Depends(require_admin)):
    """Admin: Verify a company"""
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": {"is_verified": True, "verification_date": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Firma nu a fost găsită")
    return {"message": "Firma a fost verificată cu succes"}

@api_router.put("/admin/companies/{company_id}/reject")
async def admin_reject_company(company_id: str, reason: str = "", user: User = Depends(require_admin)):
    """Admin: Reject a company"""
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": {"is_rejected": True, "rejection_reason": reason, "rejection_date": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Firma nu a fost găsită")
    return {"message": "Firma a fost respinsă"}

@api_router.delete("/admin/companies/{company_id}")
async def admin_delete_company(company_id: str, user: User = Depends(require_admin)):
    """Admin: Delete a company"""
    # Get company to find owner
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Firma nu a fost găsită")
    
    # Remove company flag from owner
    await db.users.update_one(
        {"user_id": company["owner_id"]},
        {"$set": {"is_company": False, "company_id": None}}
    )
    
    # Delete company stores
    await db.company_stores.delete_many({"company_id": company_id})
    
    # Delete restaurant entries for this company
    await db.restaurants.delete_many({"company_id": company_id})
    
    # Delete company
    await db.companies.delete_one({"id": company_id})
    
    return {"message": "Firma și toate datele asociate au fost șterse"}

class AdminCompanyCreate(BaseModel):
    company_name: str
    cui: str
    email: str
    phone: str
    owner_email: Optional[str] = None  # If provided, assign to existing user

@api_router.post("/admin/companies/create")
async def admin_create_company(data: AdminCompanyCreate, user: User = Depends(require_admin)):
    """Admin: Create a company directly (already verified)"""
    # Check if CUI already exists
    cui_exists = await db.companies.find_one({"cui": data.cui})
    if cui_exists:
        raise HTTPException(status_code=400, detail="Acest CUI este deja înregistrat")
    
    # Verify CUI with ANAF
    anaf_result = await verify_cui_anaf(data.cui)
    
    owner_id = None
    
    # If owner email provided, find or create user
    if data.owner_email:
        existing_user = await db.users.find_one({"email": data.owner_email})
        if existing_user:
            owner_id = existing_user["user_id"]
            # Check if user already has a company
            if existing_user.get("company_id"):
                raise HTTPException(status_code=400, detail="Acest utilizator are deja o firmă")
        else:
            # Create placeholder user
            owner_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": owner_id,
                "email": data.owner_email,
                "name": data.company_name,
                "picture": None,
                "phone": data.phone,
                "address": None,
                "is_company": True,
                "company_id": None,  # Will be updated below
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
    else:
        # Admin-owned placeholder
        owner_id = f"admin_company_{uuid.uuid4().hex[:8]}"
    
    # Use ANAF name if valid
    official_name = data.company_name
    if anaf_result.get("valid") and anaf_result.get("name"):
        official_name = anaf_result["name"]
    
    company = Company(
        owner_id=owner_id,
        company_name=official_name,
        cui=data.cui,
        email=data.email,
        phone=data.phone,
        is_verified=True,  # Admin-created = verified
        verification_date=datetime.now(timezone.utc)
    )
    
    company_dict = company.dict()
    company_dict["anaf_data"] = anaf_result
    company_dict["created_by_admin"] = True
    
    await db.companies.insert_one(company_dict)
    
    # Update user with company_id
    if owner_id and data.owner_email:
        await db.users.update_one(
            {"user_id": owner_id},
            {"$set": {"is_company": True, "company_id": company.id}}
        )
    
    return {
        "message": "Firma a fost creată cu succes",
        "company_id": company.id,
        "company_name": official_name,
        "anaf_verified": anaf_result.get("valid", False),
        "owner_id": owner_id
    }

@api_router.get("/admin/users")
async def admin_get_users(user: User = Depends(require_admin)):
    """Admin: Get all users"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@api_router.get("/admin/stats")
async def admin_get_stats(user: User = Depends(require_admin)):
    """Admin: Get platform statistics"""
    total_users = await db.users.count_documents({})
    total_companies = await db.companies.count_documents({})
    verified_companies = await db.companies.count_documents({"is_verified": True})
    pending_companies = await db.companies.count_documents({"is_verified": False})
    total_restaurants = await db.restaurants.count_documents({})
    total_reservations = await db.reservations.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    
    return {
        "total_users": total_users,
        "total_companies": total_companies,
        "verified_companies": verified_companies,
        "pending_companies": pending_companies,
        "total_restaurants": total_restaurants,
        "total_reservations": total_reservations,
        "total_transactions": total_transactions,
        "transaction_fee_percentage": TRANSACTION_FEE_PERCENTAGE
    }

# ==================== COMPANY ROUTES ====================

@api_router.post("/companies/register")
async def register_company(
    data: CompanyRegister,
    user: User = Depends(require_auth)
):
    """Register as a company"""
    # Check if user already has a company
    existing = await db.companies.find_one({"owner_id": user.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ai deja o firmă înregistrată")
    
    # Check if CUI already exists
    cui_exists = await db.companies.find_one({"cui": data.cui})
    if cui_exists:
        raise HTTPException(status_code=400, detail="Acest CUI este deja înregistrat")
    
    company = Company(
        owner_id=user.user_id,
        company_name=data.company_name,
        cui=data.cui,
        email=data.email,
        phone=data.phone
    )
    await db.companies.insert_one(company.dict())
    
    # Update user as company owner
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"is_company": True, "company_id": company.id}}
    )
    
    return {"message": "Firma a fost înregistrată. Așteaptă verificarea de către admin.", "company_id": company.id}

@api_router.get("/companies/me")
async def get_my_company(user: User = Depends(require_auth)):
    """Get current user's company"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Nu ai o firmă înregistrată")
    return company

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str):
    """Get company by ID"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Firma nu a fost găsită")
    return company

@api_router.put("/companies/{company_id}/verify")
async def verify_company(company_id: str):
    """Admin: Verify a company (in real app, this would be admin-protected)"""
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": {"is_verified": True, "verification_date": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Firma nu a fost găsită")
    return {"message": "Firma a fost verificată cu succes"}

# ==================== COMPANY STORE ROUTES ====================

@api_router.post("/stores")
async def create_store(data: CompanyStoreCreate, user: User = Depends(require_auth)):
    """Create a store (company must be verified)"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=403, detail="Trebuie să ai o firmă înregistrată")
    if not company.get("is_verified"):
        raise HTTPException(status_code=403, detail="Firma ta nu a fost încă verificată de admin")
    
    # Create sections
    sections = [ProductSection(name=name, order=i) for i, name in enumerate(data.sections)]
    
    store = CompanyStore(
        company_id=company["id"],
        name=data.name,
        description=data.description,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        cover_image=data.cover_image,
        gallery_images=data.gallery_images,
        sections=sections,
        cuisine_type=data.cuisine_type,
        categories=data.categories,
        price_range=data.price_range,
        opening_hours=data.opening_hours,
        phone=data.phone
    )
    await db.company_stores.insert_one(store.dict())
    
    # Also add to restaurants collection for unified display
    restaurant_data = {
        "id": store.id,
        "name": store.name,
        "description": store.description or "",
        "address": store.address,
        "latitude": store.latitude,
        "longitude": store.longitude,
        "cover_image": store.cover_image,
        "interior_images": store.gallery_images,
        "images_3d": [],
        "rating": 0.0,
        "review_count": 0,
        "likes": 0,
        "is_sponsored": False,
        "is_new": True,
        "cuisine_type": store.cuisine_type,
        "categories": store.categories,
        "price_range": store.price_range,
        "opening_hours": store.opening_hours,
        "phone": store.phone,
        "menu": [],
        "company_id": company["id"],
        "created_at": datetime.now(timezone.utc)
    }
    await db.restaurants.insert_one(restaurant_data)
    
    return store

@api_router.get("/stores/my")
async def get_my_stores(user: User = Depends(require_auth)):
    """Get stores owned by current user's company"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        return []
    
    stores = await db.company_stores.find({"company_id": company["id"]}, {"_id": 0}).to_list(100)
    return stores

@api_router.get("/stores/{store_id}")
async def get_store(store_id: str):
    """Get store by ID"""
    store = await db.company_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Magazinul nu a fost găsit")
    return store

@api_router.put("/stores/{store_id}")
async def update_store(store_id: str, data: CompanyStoreCreate, user: User = Depends(require_auth)):
    """Update a store"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=403, detail="Nu ai o firmă")
    
    store = await db.company_stores.find_one({"id": store_id, "company_id": company["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Magazinul nu a fost găsit")
    
    update_data = data.dict()
    update_data["sections"] = [ProductSection(name=name, order=i).dict() for i, name in enumerate(data.sections)]
    
    await db.company_stores.update_one({"id": store_id}, {"$set": update_data})
    
    # Update restaurant entry too
    restaurant_update = {
        "name": data.name,
        "description": data.description or "",
        "address": data.address,
        "cover_image": data.cover_image,
        "interior_images": data.gallery_images,
        "cuisine_type": data.cuisine_type,
        "categories": data.categories,
        "price_range": data.price_range,
        "opening_hours": data.opening_hours,
        "phone": data.phone
    }
    await db.restaurants.update_one({"id": store_id}, {"$set": restaurant_update})
    
    return {"message": "Magazinul a fost actualizat"}

@api_router.post("/stores/{store_id}/products")
async def add_store_product(store_id: str, data: StoreProductCreate, user: User = Depends(require_auth)):
    """Add a product to store"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=403, detail="Nu ai o firmă")
    
    store = await db.company_stores.find_one({"id": store_id, "company_id": company["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Magazinul nu a fost găsit")
    
    product = StoreProduct(store_id=store_id, **data.dict())
    await db.store_products.insert_one(product.dict())
    
    # Also add to restaurant menu
    menu_item = {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "quantity": product.quantity,
        "image_url": product.image_url,
        "image_3d_url": product.image_3d_url,
        "category": data.section_id
    }
    await db.restaurants.update_one(
        {"id": store_id},
        {"$push": {"menu": menu_item}}
    )
    
    return product

@api_router.post("/stores/{store_id}/images-3d")
async def upload_3d_image(store_id: str, image_url: str, user: User = Depends(require_auth)):
    """Upload 3D image for store"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=403, detail="Nu ai o firmă")
    
    store = await db.company_stores.find_one({"id": store_id, "company_id": company["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Magazinul nu a fost găsit")
    
    await db.company_stores.update_one(
        {"id": store_id},
        {"$push": {"images_3d": image_url}}
    )
    await db.restaurants.update_one(
        {"id": store_id},
        {"$push": {"images_3d": image_url}}
    )
    
    return {"message": "Imaginea 3D a fost adăugată"}

# ==================== FOOD CATEGORIES ====================

@api_router.get("/categories")
async def get_food_categories():
    """Get all food categories"""
    return FOOD_CATEGORIES

@api_router.get("/restaurants/by-category/{category_id}")
async def get_restaurants_by_category(category_id: str):
    """Get restaurants by food category"""
    restaurants = await db.restaurants.find(
        {"categories": category_id},
        {"_id": 0}
    ).to_list(100)
    return [Restaurant(**r) for r in restaurants]

# ==================== TRANSACTIONS ====================

@api_router.post("/transactions")
async def create_transaction(
    store_id: str,
    items: List[dict],  # [{product_id, quantity}]
    user: User = Depends(require_auth)
):
    """Create a transaction with 1.7% fee"""
    store = await db.company_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Magazinul nu a fost găsit")
    
    # Calculate totals
    subtotal = 0.0
    transaction_items = []
    
    for item in items:
        product = await db.store_products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * item["quantity"]
            subtotal += item_total
            transaction_items.append({
                "product_id": item["product_id"],
                "name": product["name"],
                "quantity": item["quantity"],
                "price": product["price"],
                "total": item_total
            })
    
    fee_amount = round(subtotal * (TRANSACTION_FEE_PERCENTAGE / 100), 2)
    total = round(subtotal + fee_amount, 2)
    
    transaction = Transaction(
        user_id=user.user_id,
        store_id=store_id,
        items=transaction_items,
        subtotal=subtotal,
        fee_amount=fee_amount,
        total=total
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {
        "transaction_id": transaction.id,
        "subtotal": subtotal,
        "fee_percentage": TRANSACTION_FEE_PERCENTAGE,
        "fee_amount": fee_amount,
        "total": total,
        "message": f"Comision platformă: {TRANSACTION_FEE_PERCENTAGE}% ({fee_amount} RON)"
    }

@api_router.get("/transactions")
async def get_my_transactions(user: User = Depends(require_auth)):
    """Get user's transactions"""
    transactions = await db.transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return transactions

# ==================== SUPPORT ====================

@api_router.get("/support/info")
async def get_support_info():
    """Get support contact information"""
    return {
        "client_support_email": SUPPORT_EMAIL_CLIENTS,
        "company_support_email": SUPPORT_EMAIL_COMPANIES,
        "transaction_fee_percentage": TRANSACTION_FEE_PERCENTAGE,
        "message": "Pentru asistență, contactați-ne la adresele de mai sus."
    }

# ==================== BASIC ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "API Restaurant App"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
