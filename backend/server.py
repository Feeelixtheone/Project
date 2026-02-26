from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
import uuid
import re
from datetime import datetime, timezone, timedelta
import httpx

# Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

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
PLATFORM_COMMISSION_PERCENTAGE = 2.7  # 2.7% commission deducted from restaurant
SUPPORT_EMAIL_CLIENTS = "support.clienti@restaurantapp.ro"
SUPPORT_EMAIL_COMPANIES = "support.firme@restaurantapp.ro"
ADMIN_EMAIL = "mutinyretreat37@gmail.com"

# Stripe API Key
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

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
    kcal: Optional[int] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fats: Optional[float] = None
    fiber: Optional[float] = None
    allergens: Optional[List[str]] = None

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

# Reservation Models - Enhanced with two types
class ReservationItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

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
    # Reservation type: "food_ready" (mâncare gata) or "table_only" (doar masă)
    reservation_type: str = "table_only"
    # For food_ready: ordered items
    ordered_items: List[ReservationItem] = []
    # Payment details
    food_total: float = 0.0  # Total for pre-ordered food
    upfront_fee: float = 0.0  # Upfront fee for table_only
    platform_commission: float = 0.0  # 2.7% platform commission (deducted from restaurant)
    total_paid: float = 0.0  # Total amount paid by user (NO commission added)
    restaurant_payout: float = 0.0  # Amount restaurant receives after commission
    is_paid: bool = False
    payment_method_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    # Cancellation rules: food_ready cannot be cancelled within 1 hour
    can_cancel: bool = True
    cancellation_deadline: Optional[datetime] = None
    status: str = "pending"  # pending, confirmed, cancelled, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReservationCreate(BaseModel):
    restaurant_id: str
    date: str
    time: str
    guests: int
    special_requests: Optional[str] = None
    reservation_type: str = "table_only"  # "food_ready" or "table_only"
    ordered_items: List[dict] = []  # [{menu_item_id, quantity}]
    payment_method_id: Optional[str] = None

# Chat/Support Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_type: str  # "user", "admin", "system"
    sender_id: str
    sender_name: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatConversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_email: str
    subject: str
    status: str = "open"  # open, resolved, closed
    last_message: Optional[str] = None
    unread_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# Restaurant Notification Model
class RestaurantNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    notification_type: str  # new_reservation, order_update, payment_received
    title: str
    message: str
    data: Optional[Dict] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Receipt Model
class Receipt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reservation_id: str
    restaurant_id: str
    restaurant_name: str
    company_cui: str
    company_name: str
    user_id: str
    user_name: str
    user_email: str
    items: List[dict]
    subtotal: float
    platform_commission: float
    restaurant_payout: float
    receipt_number: str  # Generated based on company CUI
    issued_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "issued"  # issued, paid, refunded

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

# ==================== NOTIFICATION HELPERS ====================

async def create_restaurant_notification(
    restaurant_id: str,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[Dict] = None
) -> RestaurantNotification:
    """Create a notification for a restaurant"""
    notification = RestaurantNotification(
        restaurant_id=restaurant_id,
        notification_type=notification_type,
        title=title,
        message=message,
        data=data
    )
    await db.restaurant_notifications.insert_one(notification.dict())
    return notification

async def generate_receipt_number(company_cui: str) -> str:
    """Generate a unique receipt number based on company CUI"""
    # Get count of receipts for this company
    count = await db.receipts.count_documents({"company_cui": company_cui})
    # Format: CUI-YEAR-SEQUENCE
    year = datetime.now().year
    return f"{company_cui}-{year}-{str(count + 1).zfill(6)}"

async def generate_receipt_for_payment(payment_tx: dict):
    """Generate a receipt for a completed payment based on company CUI"""
    try:
        restaurant_id = payment_tx.get("metadata", {}).get("restaurant_id", "")
        if not restaurant_id:
            return
        
        # Find the restaurant and its company
        restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
        if not restaurant:
            return
        
        company_id = restaurant.get("company_id")
        if not company_id:
            return
        
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
        if not company:
            return
        
        cui = company.get("cui", "")
        platform_fee = float(payment_tx.get("platform_fee", 0) or payment_tx.get("metadata", {}).get("platform_fee", 0))
        total_amount = payment_tx.get("amount", 0)
        restaurant_payout = round(total_amount - platform_fee, 2)
        
        receipt_number = await generate_receipt_number(cui)
        
        receipt = {
            "id": str(uuid.uuid4()),
            "receipt_number": receipt_number,
            "company_id": company_id,
            "company_name": company.get("company_name", ""),
            "company_cui": cui,
            "restaurant_id": restaurant_id,
            "restaurant_name": restaurant.get("name", ""),
            "payment_transaction_id": payment_tx.get("id", ""),
            "session_id": payment_tx.get("session_id", ""),
            "user_id": payment_tx.get("user_id", ""),
            "total_amount": total_amount,
            "platform_commission": platform_fee,
            "platform_commission_percentage": PLATFORM_COMMISSION_PERCENTAGE,
            "restaurant_payout": restaurant_payout,
            "currency": "RON",
            "issued_date": datetime.now(timezone.utc),
            "status": "issued"
        }
        
        await db.receipts.insert_one(receipt)
        logger.info(f"Receipt generated: {receipt_number} for CUI {cui}")
    except Exception as e:
        logger.error(f"Error generating receipt: {e}")

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
    
    # Update can_cancel status based on time
    now = datetime.now(timezone.utc)
    for r in reservations:
        if r.get("reservation_type") == "food_ready" and r.get("cancellation_deadline"):
            deadline = r["cancellation_deadline"]
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            r["can_cancel"] = now < deadline
    
    return reservations

@api_router.post("/reservations")
async def create_reservation(
    data: ReservationCreate,
    user: User = Depends(require_auth)
):
    """Create a reservation with payment"""
    restaurant = await db.restaurants.find_one({"id": data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant negăsit")
    
    # Calculate food total if food_ready reservation
    food_total = 0.0
    ordered_items = []
    
    if data.reservation_type == "food_ready" and data.ordered_items:
        menu_items = {item["id"]: item for item in restaurant.get("menu", [])}
        for order in data.ordered_items:
            menu_item = menu_items.get(order.get("menu_item_id"))
            if menu_item:
                item_total = menu_item["price"] * order.get("quantity", 1)
                food_total += item_total
                ordered_items.append({
                    "menu_item_id": menu_item["id"],
                    "name": menu_item["name"],
                    "price": menu_item["price"],
                    "quantity": order.get("quantity", 1)
                })
    
    # Get upfront fee for table_only reservations
    upfront_fee = 0.0
    if data.reservation_type == "table_only":
        upfront_fee = restaurant.get("upfront_fee", 20.0)  # Default 20 RON
    
    # Calculate platform commission (2.7%) - deducted from restaurant, NOT charged to user
    base_amount = food_total if data.reservation_type == "food_ready" else upfront_fee
    platform_commission = round(base_amount * (PLATFORM_COMMISSION_PERCENTAGE / 100), 2)
    # User pays only the base amount (no commission)
    total_paid = base_amount
    # Restaurant receives base amount minus commission
    restaurant_payout = round(base_amount - platform_commission, 2)
    
    # Calculate cancellation deadline for food_ready (1 hour before)
    cancellation_deadline = None
    can_cancel = True
    if data.reservation_type == "food_ready":
        try:
            reservation_datetime = datetime.strptime(f"{data.date} {data.time}", "%Y-%m-%d %H:%M")
            reservation_datetime = reservation_datetime.replace(tzinfo=timezone.utc)
            cancellation_deadline = reservation_datetime - timedelta(hours=1)
            can_cancel = datetime.now(timezone.utc) < cancellation_deadline
        except:
            pass
    
    reservation = Reservation(
        restaurant_id=data.restaurant_id,
        restaurant_name=restaurant["name"],
        user_id=user.user_id,
        user_name=user.name,
        user_email=user.email,
        date=data.date,
        time=data.time,
        guests=data.guests,
        special_requests=data.special_requests,
        reservation_type=data.reservation_type,
        ordered_items=ordered_items,
        food_total=food_total,
        upfront_fee=upfront_fee,
        platform_commission=platform_commission,
        total_paid=total_paid,
        restaurant_payout=restaurant_payout,
        is_paid=True if data.payment_method_id else False,
        payment_method_id=data.payment_method_id,
        can_cancel=can_cancel,
        cancellation_deadline=cancellation_deadline,
        status="confirmed" if data.payment_method_id else "pending"
    )
    await db.reservations.insert_one(reservation.dict())
    
    # Send notification to restaurant
    await create_restaurant_notification(
        restaurant_id=data.restaurant_id,
        notification_type="new_reservation",
        title="Rezervare nouă",
        message=f"Ai primit o rezervare nouă de la {user.name} pentru {data.date} la {data.time}. {data.guests} persoane.",
        data={"reservation_id": reservation.id}
    )
    
    return {
        "reservation": reservation.dict(),
        "payment_summary": {
            "reservation_type": data.reservation_type,
            "food_total": food_total,
            "upfront_fee": upfront_fee,
            "total_paid": total_paid,
            "platform_commission": platform_commission,
            "platform_commission_percentage": PLATFORM_COMMISSION_PERCENTAGE,
            "restaurant_payout": restaurant_payout,
            "can_cancel": can_cancel,
            "cancellation_deadline": cancellation_deadline.isoformat() if cancellation_deadline else None,
            "note": "Rezervările cu mâncare gata făcută nu pot fi anulate cu mai puțin de 1 oră înainte." if data.reservation_type == "food_ready" else "Taxa în avans va fi dedusă din nota finală."
        }
    }

@api_router.put("/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: str,
    user: User = Depends(require_auth)
):
    """Cancel a reservation"""
    reservation = await db.reservations.find_one(
        {"id": reservation_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Rezervare negăsită")
    
    # Check if can cancel for food_ready reservations
    if reservation.get("reservation_type") == "food_ready":
        deadline = reservation.get("cancellation_deadline")
        if deadline:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline)
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) >= deadline:
                raise HTTPException(
                    status_code=400, 
                    detail="Nu poți anula această rezervare cu mai puțin de 1 oră înainte. Mâncarea este deja în preparare."
                )
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": "cancelled", "can_cancel": False}}
    )
    
    # TODO: Process refund if needed
    refund_amount = 0
    if reservation.get("is_paid"):
        if reservation.get("reservation_type") == "table_only":
            refund_amount = reservation.get("upfront_fee", 0)
        # For food_ready, no refund if within 1 hour
    
    return {
        "message": "Rezervare anulată",
        "refund_amount": refund_amount,
        "refund_note": "Suma va fi returnată în 3-5 zile lucrătoare." if refund_amount > 0 else None
    }

@api_router.get("/restaurants/{restaurant_id}/upfront-fee")
async def get_upfront_fee(restaurant_id: str):
    """Get restaurant's upfront fee for table reservations"""
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant negăsit")
    
    return {
        "upfront_fee": restaurant.get("upfront_fee", 20.0),
        "currency": "RON",
        "note": "Această sumă va fi dedusă din nota finală."
    }

# ==================== CHAT/SUPPORT ROUTES ====================

@api_router.post("/chat/conversations")
async def create_conversation(
    subject: str,
    message: str,
    user: User = Depends(require_auth)
):
    """Start a new support conversation"""
    conversation = ChatConversation(
        user_id=user.user_id,
        user_name=user.name,
        user_email=user.email,
        subject=subject,
        last_message=message[:100] + "..." if len(message) > 100 else message
    )
    await db.chat_conversations.insert_one(conversation.dict())
    
    # Add initial message
    chat_message = ChatMessage(
        conversation_id=conversation.id,
        sender_type="user",
        sender_id=user.user_id,
        sender_name=user.name,
        message=message
    )
    await db.chat_messages.insert_one(chat_message.dict())
    
    return {
        "conversation": conversation.dict(),
        "message": chat_message.dict()
    }

@api_router.get("/chat/conversations")
async def get_my_conversations(user: User = Depends(require_auth)):
    """Get user's support conversations"""
    conversations = await db.chat_conversations.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(50)
    return conversations

@api_router.get("/chat/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, user: User = Depends(require_auth)):
    """Get messages in a conversation"""
    # Verify user owns conversation or is admin
    conversation = await db.chat_conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversație negăsită")
    
    if conversation["user_id"] != user.user_id and user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Nu ai acces la această conversație")
    
    messages = await db.chat_messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    # Mark as read
    await db.chat_messages.update_many(
        {"conversation_id": conversation_id, "sender_type": {"$ne": "user"}},
        {"$set": {"is_read": True}}
    )
    
    return messages

@api_router.post("/chat/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    message: str,
    user: User = Depends(require_auth)
):
    """Send a message in a conversation"""
    conversation = await db.chat_conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversație negăsită")
    
    if conversation["user_id"] != user.user_id and user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Nu ai acces la această conversație")
    
    sender_type = "admin" if user.email == ADMIN_EMAIL else "user"
    
    chat_message = ChatMessage(
        conversation_id=conversation_id,
        sender_type=sender_type,
        sender_id=user.user_id,
        sender_name=user.name,
        message=message
    )
    await db.chat_messages.insert_one(chat_message.dict())
    
    # Update conversation
    await db.chat_conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "last_message": message[:100] + "..." if len(message) > 100 else message,
                "updated_at": datetime.now(timezone.utc)
            },
            "$inc": {"unread_count": 1}
        }
    )
    
    return chat_message.dict()

@api_router.get("/admin/chat/conversations")
async def admin_get_all_conversations(user: User = Depends(require_admin)):
    """Admin: Get all support conversations"""
    conversations = await db.chat_conversations.find(
        {},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return conversations

@api_router.put("/admin/chat/conversations/{conversation_id}/resolve")
async def admin_resolve_conversation(conversation_id: str, user: User = Depends(require_admin)):
    """Admin: Mark conversation as resolved"""
    result = await db.chat_conversations.update_one(
        {"id": conversation_id},
        {"$set": {"status": "resolved"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversație negăsită")
    return {"message": "Conversație rezolvată"}

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
            "categories": ["exclusive", "fine_dining"],
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
                    "category": "Fel Principal",
                    "kcal": 420,
                    "protein": 22.5,
                    "carbs": 35.0,
                    "fats": 18.0,
                    "fiber": 4.2,
                    "allergens": ["gluten"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Ciorbă de burtă",
                    "description": "Ciorbă tradițională cu smântână și ardei iute",
                    "price": 28.0,
                    "quantity": "400ml",
                    "image_url": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400",
                    "category": "Supe",
                    "kcal": 280,
                    "protein": 18.0,
                    "carbs": 12.0,
                    "fats": 16.0,
                    "fiber": 1.5,
                    "allergens": ["lactate"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Papanași",
                    "description": "Papanași cu smântână și dulceață de afine",
                    "price": 32.0,
                    "quantity": "2 buc",
                    "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
                    "category": "Desert",
                    "kcal": 580,
                    "protein": 12.0,
                    "carbs": 65.0,
                    "fats": 28.0,
                    "fiber": 2.0,
                    "allergens": ["gluten", "lactate", "ouă"]
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
            "categories": ["exclusive", "fine_dining", "rooftop_view"],
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
                    "category": "Fel Principal",
                    "kcal": 520,
                    "protein": 15.0,
                    "carbs": 55.0,
                    "fats": 24.0,
                    "fiber": 3.0,
                    "allergens": ["gluten", "lactate"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Tartare de vită",
                    "description": "Tartare clasic cu gălbenuș și capere",
                    "price": 65.0,
                    "quantity": "180g",
                    "image_url": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400",
                    "category": "Aperitive",
                    "kcal": 310,
                    "protein": 28.0,
                    "carbs": 4.0,
                    "fats": 20.0,
                    "fiber": 0.5,
                    "allergens": ["ouă"]
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
            "categories": ["exclusive", "seafood_de_lux"],
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
                    "category": "Fel Principal",
                    "kcal": 340,
                    "protein": 38.0,
                    "carbs": 8.0,
                    "fats": 16.0,
                    "fiber": 3.0,
                    "allergens": ["pește"]
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
            "categories": [],
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
                    "category": "Fel Principal",
                    "kcal": 650,
                    "protein": 35.0,
                    "carbs": 25.0,
                    "fats": 42.0,
                    "fiber": 2.0,
                    "allergens": ["gluten"]
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
            "categories": ["exclusive", "premium"],
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
                    "category": "Sushi",
                    "kcal": 380,
                    "protein": 20.0,
                    "carbs": 42.0,
                    "fats": 14.0,
                    "fiber": 3.5,
                    "allergens": ["pește", "soia", "gluten"]
                }
            ],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sky Lounge Rooftop",
            "description": "Restaurant premium pe acoperiș cu vedere panoramică asupra Bucureștiului și bucătărie internațională de excepție.",
            "address": "Str. Știrbei Vodă 4, Etaj 15, București",
            "latitude": 44.4380,
            "longitude": 26.0950,
            "cover_image": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
            "interior_images": [
                "https://images.unsplash.com/photo-1544124499-58912cbddaad?w=800"
            ],
            "rating": 4.9,
            "review_count": 278,
            "likes": 1890,
            "is_sponsored": True,
            "is_new": True,
            "cuisine_type": "Internațional",
            "categories": ["exclusive", "rooftop_view", "fine_dining", "premium"],
            "price_range": "$$$",
            "opening_hours": "17:00 - 02:00",
            "phone": "+40 21 678 9012",
            "menu": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Wagyu Steak A5",
                    "description": "Wagyu japonez A5 cu piure trufat și sparanghel",
                    "price": 280.0,
                    "quantity": "200g",
                    "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400",
                    "category": "Fel Principal",
                    "kcal": 750,
                    "protein": 42.0,
                    "carbs": 12.0,
                    "fats": 58.0,
                    "fiber": 2.0,
                    "allergens": ["lactate"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Homar Thermidor",
                    "description": "Homar proaspăt cu sos cremos și cașcaval gratinat",
                    "price": 195.0,
                    "quantity": "450g",
                    "image_url": "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400",
                    "category": "Specialități",
                    "kcal": 520,
                    "protein": 35.0,
                    "carbs": 18.0,
                    "fats": 32.0,
                    "fiber": 1.0,
                    "allergens": ["crustacee", "lactate", "gluten"]
                }
            ],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "The Steakhouse Premium",
            "description": "Cele mai bune steakuri dry-aged, premium cuts și vinuri selecte într-o ambianță elegantă.",
            "address": "Bd. Primăverii 88, București",
            "latitude": 44.4520,
            "longitude": 26.0830,
            "cover_image": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
            "interior_images": [],
            "rating": 4.8,
            "review_count": 345,
            "likes": 1650,
            "is_sponsored": True,
            "is_new": False,
            "cuisine_type": "Steakhouse",
            "categories": ["exclusive", "steakhouse_premium", "fine_dining"],
            "price_range": "$$$",
            "opening_hours": "12:00 - 00:00",
            "phone": "+40 21 789 0123",
            "menu": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Ribeye Dry-Aged 45 zile",
                    "description": "Ribeye maturat 45 zile cu unt de trufe și cartofi fondant",
                    "price": 185.0,
                    "quantity": "350g",
                    "image_url": "https://images.unsplash.com/photo-1558030006-450675393462?w=400",
                    "category": "Steakuri",
                    "kcal": 820,
                    "protein": 55.0,
                    "carbs": 5.0,
                    "fats": 62.0,
                    "fiber": 0.0,
                    "allergens": ["lactate"]
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Tomahawk pentru 2",
                    "description": "Tomahawk 1.2kg cu garnitură la alegere",
                    "price": 320.0,
                    "quantity": "1.2kg",
                    "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400",
                    "category": "Steakuri",
                    "kcal": 1450,
                    "protein": 95.0,
                    "carbs": 8.0,
                    "fats": 110.0,
                    "fiber": 0.0,
                    "allergens": []
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
        "platform_commission_percentage": PLATFORM_COMMISSION_PERCENTAGE
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
    
    fee_amount = round(subtotal * (PLATFORM_COMMISSION_PERCENTAGE / 100), 2)
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
        "fee_percentage": PLATFORM_COMMISSION_PERCENTAGE,
        "fee_amount": fee_amount,
        "total": total,
        "message": f"Comision platformă: {PLATFORM_COMMISSION_PERCENTAGE}% ({fee_amount} RON)"
    }

@api_router.get("/transactions")
async def get_my_transactions(user: User = Depends(require_auth)):
    """Get user's transactions"""
    transactions = await db.transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return transactions

# ==================== DIRECT ORDERS (CART CHECKOUT) ====================

class DirectOrderItemModel(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int
    image_url: Optional[str] = None

class DirectOrderCreate(BaseModel):
    restaurant_id: str
    items: List[DirectOrderItemModel]
    origin_url: str

@api_router.post("/orders/create")
async def create_direct_order(
    request: Request,
    data: DirectOrderCreate,
    user: User = Depends(require_auth)
):
    """Create a direct food order from cart with Stripe payment"""
    restaurant = await db.restaurants.find_one({"id": data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant negăsit")
    
    if not data.items:
        raise HTTPException(status_code=400, detail="Coșul este gol")
    
    # Calculate totals - user pays subtotal only, commission deducted from restaurant
    subtotal = sum(item.price * item.quantity for item in data.items)
    platform_fee = round(subtotal * (PLATFORM_COMMISSION_PERCENTAGE / 100), 2)
    restaurant_payout = round(subtotal - platform_fee, 2)
    total = subtotal  # User pays only the subtotal, NO commission added
    
    # Create order record
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "user_email": user.email,
        "restaurant_id": data.restaurant_id,
        "restaurant_name": restaurant["name"],
        "items": [item.dict() for item in data.items],
        "subtotal": subtotal,
        "platform_fee": platform_fee,
        "restaurant_payout": restaurant_payout,
        "total": total,
        "status": "pending_payment",
        "created_at": datetime.now(timezone.utc)
    }
    await db.orders.insert_one(order)
    
    # Create Stripe checkout session
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order_id}"
    cancel_url = f"{data.origin_url}/payment/cancel?order_id={order_id}"
    
    metadata = {
        "user_id": user.user_id,
        "user_email": user.email,
        "order_id": order_id,
        "restaurant_id": data.restaurant_id,
        "restaurant_name": restaurant["name"],
        "type": "direct_order",
        "platform_fee": str(platform_fee)
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total),
        currency="ron",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Update order with session info
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"stripe_session_id": session.session_id}}
    )
    
    # Store payment transaction
    payment_tx = PaymentTransaction(
        user_id=user.user_id,
        session_id=session.session_id,
        restaurant_id=data.restaurant_id,
        amount=total,
        currency="ron",
        platform_fee=platform_fee,
        status="initiated",
        payment_status="pending",
        metadata=metadata
    )
    await db.payment_transactions.insert_one(payment_tx.dict())
    
    return {
        "order": order,
        "payment": {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "subtotal": subtotal,
            "platform_fee": platform_fee,
            "restaurant_payout": restaurant_payout,
            "total": total,
            "currency": "RON"
        }
    }

@api_router.get("/orders/my")
async def get_my_orders(user: User = Depends(require_auth)):
    """Get user's direct orders"""
    orders = await db.orders.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

# ==================== STRIPE PAYMENT ====================

# Payment request models
class CreateCheckoutRequest(BaseModel):
    reservation_type: str  # "food_ready" or "table_only"
    restaurant_id: str
    amount: float  # Total amount to charge
    origin_url: str  # Frontend origin for redirects
    reservation_data: Optional[Dict] = None  # Additional reservation info

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    reservation_id: Optional[str] = None
    restaurant_id: str
    amount: float
    currency: str = "ron"
    platform_fee: float
    status: str = "initiated"  # initiated, pending, paid, failed, expired
    payment_status: str = "pending"
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/payments/checkout/create")
async def create_checkout_session(
    request: Request,
    data: CreateCheckoutRequest,
    user: User = Depends(require_auth)
):
    """Create a Stripe checkout session for reservation payment"""
    try:
        # Get restaurant info
        restaurant = await db.restaurants.find_one({"id": data.restaurant_id}, {"_id": 0})
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant negăsit")
        
        # Calculate platform fee (2.7%) - deducted from restaurant, NOT charged to user
        platform_fee = round(data.amount * (PLATFORM_COMMISSION_PERCENTAGE / 100), 2)
        total_amount = data.amount  # User pays only the base amount
        
        # Initialize Stripe
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Build success/cancel URLs from frontend origin
        success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{data.origin_url}/payment/cancel"
        
        # Metadata for tracking
        metadata = {
            "user_id": user.user_id,
            "user_email": user.email,
            "restaurant_id": data.restaurant_id,
            "restaurant_name": restaurant["name"],
            "reservation_type": data.reservation_type,
            "platform_fee": str(platform_fee),
            "original_amount": str(data.amount)
        }
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=float(total_amount),
            currency="ron",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store payment transaction in DB
        payment_tx = PaymentTransaction(
            user_id=user.user_id,
            session_id=session.session_id,
            restaurant_id=data.restaurant_id,
            amount=total_amount,
            currency="ron",
            platform_fee=platform_fee,
            status="initiated",
            payment_status="pending",
            metadata=metadata
        )
        await db.payment_transactions.insert_one(payment_tx.dict())
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "amount": data.amount,
            "platform_fee": platform_fee,
            "total": total_amount,
            "currency": "RON"
        }
        
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Eroare la procesarea plății: {str(e)}")

@api_router.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Get payment status and update database"""
    try:
        # Initialize Stripe
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Get status from Stripe
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Find existing transaction
        existing_tx = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if existing_tx:
            # Only update if not already processed as paid
            if existing_tx.get("payment_status") != "paid":
                new_status = "paid" if status.payment_status == "paid" else status.status
                new_payment_status = status.payment_status
                
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "status": new_status,
                            "payment_status": new_payment_status,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # If payment successful, create/confirm reservation
                if new_payment_status == "paid" and not existing_tx.get("reservation_confirmed"):
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {"reservation_confirmed": True}}
                    )
        
        return {
            "session_id": session_id,
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
        
    except Exception as e:
        logger.error(f"Payment status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Eroare la verificarea plății: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Update transaction
            tx = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )
            
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {
                    "$set": {
                        "status": "paid",
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if tx:
                metadata = tx.get("metadata", {})
                restaurant_id = metadata.get("restaurant_id", "")
                restaurant_name = metadata.get("restaurant_name", "")
                user_email = metadata.get("user_email", "")
                tx_type = metadata.get("type", "")
                
                # Create notification for restaurant
                if restaurant_id:
                    if tx_type == "direct_order":
                        order_id = metadata.get("order_id", "")
                        # Update order status
                        await db.orders.update_one(
                            {"id": order_id},
                            {"$set": {"status": "confirmed", "paid_at": datetime.now(timezone.utc)}}
                        )
                        await create_restaurant_notification(
                            restaurant_id=restaurant_id,
                            notification_type="new_order",
                            title="Comandă nouă plătită",
                            message=f"Ai primit o comandă nouă plătită de la {user_email}.",
                            data={"order_id": order_id}
                        )
                    else:
                        reservation_id = metadata.get("reservation_id", "")
                        if reservation_id:
                            await db.reservations.update_one(
                                {"id": reservation_id},
                                {"$set": {"is_paid": True, "status": "confirmed", "payment_confirmed_at": datetime.now(timezone.utc)}}
                            )
                            await create_restaurant_notification(
                                restaurant_id=restaurant_id,
                                notification_type="reservation_paid",
                                title="Rezervare plătită",
                                message=f"Rezervarea de la {user_email} a fost plătită.",
                                data={"reservation_id": reservation_id}
                            )
                    
                    # Generate receipt based on company CUI
                    await generate_receipt_for_payment(tx)
        
        return {"received": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}  # Always return 200 to Stripe

@api_router.get("/payments/my-transactions")
async def get_my_payment_transactions(user: User = Depends(require_auth)):
    """Get user's payment transactions"""
    transactions = await db.payment_transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return transactions

# ==================== RESERVATION WITH PAYMENT ====================

class ReservationWithPaymentRequest(BaseModel):
    restaurant_id: str
    date: str
    time: str
    guests: int
    special_requests: Optional[str] = None
    reservation_type: str = "table_only"  # "food_ready" or "table_only"
    ordered_items: List[dict] = []  # [{menu_item_id, quantity}]
    origin_url: str  # For Stripe redirects

@api_router.post("/reservations/with-payment")
async def create_reservation_with_payment(
    request: Request,
    data: ReservationWithPaymentRequest,
    user: User = Depends(require_auth)
):
    """Create a reservation and initiate Stripe payment"""
    restaurant = await db.restaurants.find_one({"id": data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant negăsit")
    
    # Calculate food total if food_ready reservation
    food_total = 0.0
    ordered_items = []
    
    if data.reservation_type == "food_ready" and data.ordered_items:
        menu_items = {item["id"]: item for item in restaurant.get("menu", [])}
        for order in data.ordered_items:
            menu_item = menu_items.get(order.get("menu_item_id"))
            if menu_item:
                item_total = menu_item["price"] * order.get("quantity", 1)
                food_total += item_total
                ordered_items.append({
                    "menu_item_id": menu_item["id"],
                    "name": menu_item["name"],
                    "price": menu_item["price"],
                    "quantity": order.get("quantity", 1)
                })
    
    # Get upfront fee for table_only reservations
    upfront_fee = 0.0
    if data.reservation_type == "table_only":
        upfront_fee = restaurant.get("upfront_fee", 20.0)  # Default 20 RON
    
    # Determine payment amount - User pays base_amount only, commission deducted from restaurant
    base_amount = food_total if data.reservation_type == "food_ready" else upfront_fee
    platform_fee = round(base_amount * (PLATFORM_COMMISSION_PERCENTAGE / 100), 2)
    total_to_pay = base_amount  # User pays only the base amount, NO commission
    restaurant_payout = round(base_amount - platform_fee, 2)
    
    # Calculate cancellation deadline for food_ready (1 hour before)
    cancellation_deadline = None
    can_cancel = True
    if data.reservation_type == "food_ready":
        try:
            reservation_datetime = datetime.strptime(f"{data.date} {data.time}", "%Y-%m-%d %H:%M")
            reservation_datetime = reservation_datetime.replace(tzinfo=timezone.utc)
            cancellation_deadline = reservation_datetime - timedelta(hours=1)
            can_cancel = datetime.now(timezone.utc) < cancellation_deadline
        except:
            pass
    
    # Create reservation with pending payment status
    reservation = Reservation(
        restaurant_id=data.restaurant_id,
        restaurant_name=restaurant["name"],
        user_id=user.user_id,
        user_name=user.name,
        user_email=user.email,
        date=data.date,
        time=data.time,
        guests=data.guests,
        special_requests=data.special_requests,
        reservation_type=data.reservation_type,
        ordered_items=ordered_items,
        food_total=food_total,
        upfront_fee=upfront_fee,
        platform_commission=platform_fee,
        total_paid=total_to_pay,
        restaurant_payout=restaurant_payout,
        is_paid=False,
        can_cancel=can_cancel,
        cancellation_deadline=cancellation_deadline,
        status="pending_payment"
    )
    await db.reservations.insert_one(reservation.dict())
    
    # Send notification to restaurant
    await create_restaurant_notification(
        restaurant_id=data.restaurant_id,
        notification_type="new_reservation",
        title="Rezervare nouă cu plată",
        message=f"Ai primit o rezervare nouă de la {user.name} pentru {data.date} la {data.time}. {data.guests} persoane. Tip: {'Cu mâncare gata' if data.reservation_type == 'food_ready' else 'Doar masă'}.",
        data={"reservation_id": reservation.id}
    )
    
    # Create Stripe checkout session
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&reservation_id={reservation.id}"
    cancel_url = f"{data.origin_url}/payment/cancel?reservation_id={reservation.id}"
    
    metadata = {
        "user_id": user.user_id,
        "user_email": user.email,
        "reservation_id": reservation.id,
        "restaurant_id": data.restaurant_id,
        "restaurant_name": restaurant["name"],
        "reservation_type": data.reservation_type,
        "platform_fee": str(platform_fee)
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total_to_pay),
        currency="ron",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store payment transaction
    payment_tx = PaymentTransaction(
        user_id=user.user_id,
        session_id=session.session_id,
        reservation_id=reservation.id,
        restaurant_id=data.restaurant_id,
        amount=total_to_pay,
        currency="ron",
        platform_fee=platform_fee,
        status="initiated",
        payment_status="pending",
        metadata=metadata
    )
    await db.payment_transactions.insert_one(payment_tx.dict())
    
    # Update reservation with session_id
    await db.reservations.update_one(
        {"id": reservation.id},
        {"$set": {"payment_session_id": session.session_id}}
    )
    
    return {
        "reservation": reservation.dict(),
        "payment": {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "base_amount": base_amount,
            "platform_fee": platform_fee,
            "total": total_to_pay,
            "currency": "RON"
        },
        "cancellation_info": {
            "can_cancel": can_cancel,
            "deadline": cancellation_deadline.isoformat() if cancellation_deadline else None,
            "note": "Rezervările cu mâncare gata făcută nu pot fi anulate cu mai puțin de 1 oră înainte." if data.reservation_type == "food_ready" else "Taxa în avans va fi dedusă din nota finală."
        }
    }

@api_router.post("/reservations/{reservation_id}/confirm-payment")
async def confirm_reservation_payment(
    reservation_id: str,
    session_id: str,
    request: Request,
    user: User = Depends(require_auth)
):
    """Confirm payment and activate reservation"""
    reservation = await db.reservations.find_one(
        {"id": reservation_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Rezervare negăsită")
    
    # Check payment status
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    if status.payment_status == "paid":
        # Update reservation as confirmed
        await db.reservations.update_one(
            {"id": reservation_id},
            {
                "$set": {
                    "is_paid": True,
                    "status": "confirmed",
                    "payment_confirmed_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "status": "paid",
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "success": True,
            "message": "Plata a fost confirmată! Rezervarea ta este acum activă.",
            "reservation_id": reservation_id,
            "status": "confirmed"
        }
    else:
        return {
            "success": False,
            "message": "Plata nu a fost finalizată încă.",
            "payment_status": status.payment_status,
            "reservation_id": reservation_id
        }

# ==================== NOTIFICATIONS ====================

@api_router.get("/company/notifications")
async def get_company_notifications(user: User = Depends(require_auth)):
    """Get notifications for company's restaurants"""
    # First get company for user
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Nu ești asociat cu nicio firmă")
    
    # Get all restaurants for this company
    restaurant_ids = [store["id"] for store in await db.restaurants.find(
        {"company_id": company["id"]},
        {"id": 1, "_id": 0}
    ).to_list(100)]
    
    if not restaurant_ids:
        return []
    
    notifications = await db.restaurant_notifications.find(
        {"restaurant_id": {"$in": restaurant_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return notifications

@api_router.put("/company/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: User = Depends(require_auth)
):
    """Mark a notification as read"""
    await db.restaurant_notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

@api_router.put("/company/notifications/mark-all-read")
async def mark_all_notifications_read(user: User = Depends(require_auth)):
    """Mark all notifications as read for company"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Nu ești asociat cu nicio firmă")
    
    restaurant_ids = [store["id"] for store in await db.restaurants.find(
        {"company_id": company["id"]},
        {"id": 1, "_id": 0}
    ).to_list(100)]
    
    await db.restaurant_notifications.update_many(
        {"restaurant_id": {"$in": restaurant_ids}},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

# ==================== RECEIPTS ====================

@api_router.get("/company/receipts")
async def get_company_receipts(user: User = Depends(require_auth)):
    """Get all receipts for company"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Nu ești asociat cu nicio firmă")
    
    receipts = await db.receipts.find(
        {"company_cui": company["cui"]},
        {"_id": 0}
    ).sort("issued_date", -1).to_list(100)
    
    return receipts

@api_router.get("/company/receipts/{receipt_id}")
async def get_receipt_details(
    receipt_id: str,
    user: User = Depends(require_auth)
):
    """Get detailed receipt"""
    receipt = await db.receipts.find_one({"id": receipt_id}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Chitanță negăsită")
    return receipt

@api_router.get("/company/payout-summary")
async def get_payout_summary(user: User = Depends(require_auth)):
    """Get payout summary for company"""
    company = await db.companies.find_one({"owner_id": user.user_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Nu ești asociat cu nicio firmă")
    
    # Get all confirmed reservations for company's restaurants
    restaurant_ids = [store["id"] for store in await db.restaurants.find(
        {"company_id": company["id"]},
        {"id": 1, "_id": 0}
    ).to_list(100)]
    
    reservations = await db.reservations.find(
        {
            "restaurant_id": {"$in": restaurant_ids},
            "status": "confirmed",
            "is_paid": True
        },
        {"_id": 0}
    ).to_list(1000)
    
    total_revenue = sum(r.get("total_paid", 0) for r in reservations)
    total_commission = sum(r.get("platform_commission", 0) for r in reservations)
    total_payout = sum(r.get("restaurant_payout", 0) for r in reservations)
    
    return {
        "company_name": company["name"],
        "company_cui": company["cui"],
        "total_reservations": len(reservations),
        "total_revenue": round(total_revenue, 2),
        "total_commission": round(total_commission, 2),
        "commission_percentage": PLATFORM_COMMISSION_PERCENTAGE,
        "total_payout": round(total_payout, 2),
        "pending_payout": round(total_payout, 2),  # Simplified - could track actual payments
        "message": f"Comisionul de {PLATFORM_COMMISSION_PERCENTAGE}% este dedus automat din încasări."
    }

# ==================== SUPPORT ====================

@api_router.get("/support/info")
async def get_support_info():
    """Get support contact information"""
    return {
        "client_support_email": SUPPORT_EMAIL_CLIENTS,
        "company_support_email": SUPPORT_EMAIL_COMPANIES,
        "platform_commission_percentage": PLATFORM_COMMISSION_PERCENTAGE,
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
