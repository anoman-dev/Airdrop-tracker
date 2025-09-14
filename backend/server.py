from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import json

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

# ============ MODELS ============
class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    type: str  # "social", "staking", "snapshot", "trading", "other"
    url: Optional[str] = None
    required: bool = True

class Airdrop(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    blockchain: str  # "ethereum", "bsc", "solana", "polygon", etc.
    status: str  # "active", "upcoming", "expired", "claimed"
    reward_amount: Optional[str] = None
    reward_token: Optional[str] = None
    deadline: Optional[datetime] = None
    snapshot_date: Optional[datetime] = None
    listing_date: Optional[datetime] = None
    official_url: str
    logo_url: Optional[str] = None
    tasks: List[Task] = []
    requirements: List[str] = []
    social_links: Dict[str, str] = {}
    reputation_score: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserAirdropStatus(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    airdrop_id: str
    status: str  # "not_started", "in_progress", "completed"
    completed_tasks: List[str] = []  # List of task IDs
    progress_percentage: int = Field(default=0, ge=0, le=100)
    wallet_address: Optional[str] = None
    eligibility_checked: bool = False
    is_eligible: Optional[bool] = None
    eligibility_details: Optional[Dict[str, Any]] = None
    reminder_enabled: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_addresses: List[str] = []
    daily_streak: int = 0
    total_points: int = 0
    last_checkin: Optional[datetime] = None
    preferences: Dict[str, Any] = {
        "theme": "dark",
        "notifications": True,
        "preferred_blockchains": ["ethereum", "bsc", "solana"]
    }
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EligibilityCheck(BaseModel):
    wallet_address: str
    airdrop_id: str

class DailyCheckin(BaseModel):
    user_id: str
    points_earned: int = 10
    streak_bonus: int = 0

# ============ DATA FETCHING SERVICES ============
class AirdropDataService:
    def __init__(self):
        self.session = None
    
    async def get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close_session(self):
        if self.session:
            await self.session.close()
    
    async def fetch_coingecko_airdrops(self):
        """Fetch airdrop data from CoinGecko API (free tier)"""
        try:
            session = await self.get_session()
            url = "https://api.coingecko.com/api/v3/coins/markets"
            params = {
                "vs_currency": "usd",
                "category": "airdrop",
                "order": "market_cap_desc",
                "per_page": 20,
                "page": 1
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return await self.process_coingecko_data(data)
                else:
                    logger.error(f"CoinGecko API error: {response.status}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching CoinGecko data: {e}")
            return []
    
    async def process_coingecko_data(self, data):
        """Process and convert CoinGecko data to our Airdrop model"""
        airdrops = []
        for item in data[:10]:  # Limit to avoid overwhelming
            try:
                # Create sample airdrop data based on CoinGecko response
                airdrop = Airdrop(
                    name=f"{item.get('name', 'Unknown')} Airdrop",
                    description=f"Potential airdrop opportunity for {item.get('name', 'Unknown')} token holders.",
                    blockchain="ethereum",  # Default, could be enhanced with more data
                    status="active",
                    reward_token=item.get('symbol', '').upper(),
                    official_url=item.get('homepage', 'https://example.com'),
                    logo_url=item.get('image'),
                    tasks=[
                        Task(
                            title="Follow Official Twitter",
                            description="Follow the official Twitter account",
                            type="social",
                            url=f"https://twitter.com/{item.get('symbol', 'crypto')}"
                        ),
                        Task(
                            title="Join Telegram",
                            description="Join the official Telegram community",
                            type="social"
                        ),
                        Task(
                            title="Hold Tokens",
                            description="Hold minimum required tokens in wallet",
                            type="staking"
                        )
                    ],
                    requirements=[
                        "Have an Ethereum wallet",
                        "Follow social media accounts",
                        "Hold minimum token amount"
                    ],
                    social_links={
                        "website": item.get('homepage', ''),
                        "twitter": f"https://twitter.com/{item.get('symbol', 'crypto')}"
                    },
                    reputation_score=75,
                    deadline=datetime.utcnow() + timedelta(days=30)
                )
                airdrops.append(airdrop)
            except Exception as e:
                logger.error(f"Error processing airdrop item: {e}")
                continue
        
        return airdrops
    
    async def create_sample_airdrops(self):
        """Create sample airdrop data for development"""
        sample_airdrops = [
            Airdrop(
                name="LayerZero Airdrop",
                description="LayerZero is a protocol that enables omnichain applications. Users who have bridged assets using LayerZero protocol may be eligible for the airdrop.",
                blockchain="ethereum",
                status="upcoming",
                reward_token="ZRO",
                reward_amount="1000-5000 ZRO",
                official_url="https://layerzero.network",
                logo_url="https://cryptologos.cc/logos/layerzero-zro-logo.png",
                tasks=[
                    Task(
                        title="Bridge Assets",
                        description="Use LayerZero protocol to bridge assets between chains",
                        type="trading",
                        url="https://layerzero.network/bridge"
                    ),
                    Task(
                        title="Follow Twitter",
                        description="Follow @LayerZero_Labs on Twitter",
                        type="social",
                        url="https://twitter.com/LayerZero_Labs"
                    ),
                    Task(
                        title="Join Discord",
                        description="Join LayerZero Discord community",
                        type="social",
                        url="https://discord.gg/layerzero"
                    )
                ],
                requirements=[
                    "Used LayerZero protocol for bridging",
                    "Minimum 5 transactions",
                    "Active wallet for 30+ days"
                ],
                social_links={
                    "website": "https://layerzero.network",
                    "twitter": "https://twitter.com/LayerZero_Labs",
                    "discord": "https://discord.gg/layerzero"
                },
                reputation_score=90,
                deadline=datetime.utcnow() + timedelta(days=45),
                snapshot_date=datetime.utcnow() + timedelta(days=30),
                listing_date=datetime.utcnow() + timedelta(days=60)
            ),
            Airdrop(
                name="Arbitrum ARB Airdrop",
                description="Arbitrum is a Layer 2 scaling solution for Ethereum. Users who have used Arbitrum One before the snapshot may be eligible.",
                blockchain="arbitrum",
                status="active",
                reward_token="ARB",
                reward_amount="500-10000 ARB",
                official_url="https://arbitrum.foundation",
                logo_url="https://cryptologos.cc/logos/arbitrum-arb-logo.png",
                tasks=[
                    Task(
                        title="Use Arbitrum One",
                        description="Make transactions on Arbitrum One network",
                        type="trading",
                        url="https://bridge.arbitrum.io"
                    ),
                    Task(
                        title="Follow @arbitrum",
                        description="Follow official Arbitrum Twitter",
                        type="social",
                        url="https://twitter.com/arbitrum"
                    )
                ],
                requirements=[
                    "Used Arbitrum One before snapshot",
                    "Minimum transaction volume",
                    "Active for multiple months"
                ],
                social_links={
                    "website": "https://arbitrum.foundation",
                    "twitter": "https://twitter.com/arbitrum"
                },
                reputation_score=95,
                deadline=datetime.utcnow() + timedelta(days=15)
            ),
            Airdrop(
                name="Solana Ecosystem Airdrop",
                description="Various Solana ecosystem projects are distributing tokens to active users of the Solana network.",
                blockchain="solana",
                status="active",
                reward_token="Various",
                reward_amount="100-2000 tokens",
                official_url="https://solana.com",
                logo_url="https://cryptologos.cc/logos/solana-sol-logo.png",
                tasks=[
                    Task(
                        title="Use Solana DeFi",
                        description="Interact with Solana DeFi protocols",
                        type="trading"
                    ),
                    Task(
                        title="Hold SOL",
                        description="Hold minimum 1 SOL in wallet",
                        type="staking"
                    )
                ],
                requirements=[
                    "Active Solana wallet",
                    "Used DeFi protocols",
                    "Minimum SOL balance"
                ],
                social_links={
                    "website": "https://solana.com",
                    "twitter": "https://twitter.com/solana"
                },
                reputation_score=85,
                deadline=datetime.utcnow() + timedelta(days=20)
            )
        ]
        
        return sample_airdrops

# Initialize data service
data_service = AirdropDataService()

# ============ API ENDPOINTS ============

@api_router.get("/airdrops", response_model=List[Airdrop])
async def get_airdrops(
    blockchain: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(20, le=100)
):
    """Get list of airdrops with optional filtering"""
    try:
        # Build query filter
        query_filter = {}
        if blockchain:
            query_filter["blockchain"] = blockchain
        if status:
            query_filter["status"] = status
        
        # Fetch from database
        cursor = db.airdrops.find(query_filter).limit(limit).sort("created_at", -1)
        airdrops_data = await cursor.to_list(length=limit)
        
        # If no airdrops in DB, create and insert sample data
        if not airdrops_data:
            sample_airdrops = await data_service.create_sample_airdrops()
            for airdrop in sample_airdrops:
                await db.airdrops.insert_one(airdrop.dict())
            airdrops_data = await db.airdrops.find(query_filter).limit(limit).to_list(length=limit)
        
        airdrops = [Airdrop(**airdrop) for airdrop in airdrops_data]
        return airdrops
    
    except Exception as e:
        logger.error(f"Error fetching airdrops: {e}")
        raise HTTPException(status_code=500, detail="Error fetching airdrops")

@api_router.get("/airdrops/{airdrop_id}", response_model=Airdrop)
async def get_airdrop(airdrop_id: str):
    """Get specific airdrop details"""
    try:
        airdrop_data = await db.airdrops.find_one({"id": airdrop_id})
        if not airdrop_data:
            raise HTTPException(status_code=404, detail="Airdrop not found")
        
        return Airdrop(**airdrop_data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching airdrop {airdrop_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching airdrop")

@api_router.post("/eligibility/check")
async def check_eligibility(eligibility_data: EligibilityCheck):
    """Check wallet eligibility for specific airdrop"""
    try:
        # Validate wallet address format (basic validation)
        wallet_address = eligibility_data.wallet_address.strip()
        if not wallet_address:
            raise HTTPException(status_code=400, detail="Invalid wallet address")
        
        # Get airdrop details
        airdrop_data = await db.airdrops.find_one({"id": eligibility_data.airdrop_id})
        if not airdrop_data:
            raise HTTPException(status_code=404, detail="Airdrop not found")
        
        airdrop = Airdrop(**airdrop_data)
        
        # Mock eligibility check (in real app, would check blockchain data)
        is_eligible = True
        eligibility_details = {
            "wallet_address": wallet_address,
            "blockchain": airdrop.blockchain,
            "check_date": datetime.utcnow().isoformat(),
            "criteria_met": [
                "Wallet has transaction history",
                "Meets minimum balance requirement",
                "Active before snapshot date"
            ],
            "estimated_reward": airdrop.reward_amount or "Unknown"
        }
        
        # For demo purposes, randomly make some wallets ineligible
        if len(wallet_address) % 3 == 0:
            is_eligible = False
            eligibility_details["criteria_met"] = [
                "Wallet found but doesn't meet minimum requirements"
            ]
        
        result = {
            "airdrop_id": eligibility_data.airdrop_id,
            "wallet_address": wallet_address,
            "is_eligible": is_eligible,
            "details": eligibility_details,
            "checked_at": datetime.utcnow()
        }
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking eligibility: {e}")
        raise HTTPException(status_code=500, detail="Error checking eligibility")

@api_router.get("/users/{user_id}/airdrops", response_model=List[UserAirdropStatus])
async def get_user_airdrops(user_id: str):
    """Get user's tracked airdrops"""
    try:
        cursor = db.user_airdrop_status.find({"user_id": user_id})
        user_airdrops_data = await cursor.to_list(length=100)
        
        user_airdrops = [UserAirdropStatus(**status) for status in user_airdrops_data]
        return user_airdrops
    
    except Exception as e:
        logger.error(f"Error fetching user airdrops: {e}")
        raise HTTPException(status_code=500, detail="Error fetching user airdrops")

@api_router.post("/users/{user_id}/airdrops/{airdrop_id}/track")
async def track_airdrop(user_id: str, airdrop_id: str):
    """Start tracking an airdrop for user"""
    try:
        # Check if already tracking
        existing = await db.user_airdrop_status.find_one({
            "user_id": user_id,
            "airdrop_id": airdrop_id
        })
        
        if existing:
            return {"message": "Already tracking this airdrop"}
        
        # Create new tracking record
        status = UserAirdropStatus(
            user_id=user_id,
            airdrop_id=airdrop_id,
            status="not_started"
        )
        
        await db.user_airdrop_status.insert_one(status.dict())
        return {"message": "Airdrop tracking started"}
    
    except Exception as e:
        logger.error(f"Error tracking airdrop: {e}")
        raise HTTPException(status_code=500, detail="Error tracking airdrop")

@api_router.post("/users/{user_id}/airdrops/{airdrop_id}/tasks/{task_id}/complete")
async def complete_task(user_id: str, airdrop_id: str, task_id: str):
    """Mark a task as completed for user"""
    try:
        # Find user airdrop status
        status_data = await db.user_airdrop_status.find_one({
            "user_id": user_id,
            "airdrop_id": airdrop_id
        })
        
        if not status_data:
            raise HTTPException(status_code=404, detail="Airdrop tracking not found")
        
        status = UserAirdropStatus(**status_data)
        
        # Add task to completed list if not already there
        if task_id not in status.completed_tasks:
            status.completed_tasks.append(task_id)
        
        # Get airdrop to calculate progress
        airdrop_data = await db.airdrops.find_one({"id": airdrop_id})
        if airdrop_data:
            airdrop = Airdrop(**airdrop_data)
            total_tasks = len(airdrop.tasks)
            completed_count = len(status.completed_tasks)
            status.progress_percentage = int((completed_count / total_tasks) * 100) if total_tasks > 0 else 0
            
            if status.progress_percentage == 100:
                status.status = "completed"
            elif status.progress_percentage > 0:
                status.status = "in_progress"
        
        status.updated_at = datetime.utcnow()
        
        # Update in database
        await db.user_airdrop_status.update_one(
            {"user_id": user_id, "airdrop_id": airdrop_id},
            {"$set": status.dict()}
        )
        
        return {"message": "Task completed", "progress": status.progress_percentage}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task: {e}")
        raise HTTPException(status_code=500, detail="Error completing task")

@api_router.post("/users/{user_id}/checkin")
async def daily_checkin(user_id: str):
    """Perform daily check-in for user"""
    try:
        # Get or create user
        user_data = await db.users.find_one({"id": user_id})
        if not user_data:
            user = User(id=user_id)
            await db.users.insert_one(user.dict())
        else:
            user = User(**user_data)
        
        # Check if already checked in today
        today = datetime.utcnow().date()
        if user.last_checkin and user.last_checkin.date() == today:
            return {
                "message": "Already checked in today",
                "points": user.total_points,
                "streak": user.daily_streak
            }
        
        # Calculate streak
        yesterday = today - timedelta(days=1)
        if user.last_checkin and user.last_checkin.date() == yesterday:
            user.daily_streak += 1
        else:
            user.daily_streak = 1
        
        # Calculate points with streak bonus
        base_points = 10
        streak_bonus = min(user.daily_streak * 2, 50)  # Max 50 bonus points
        total_points_earned = base_points + streak_bonus
        
        user.total_points += total_points_earned
        user.last_checkin = datetime.utcnow()
        
        # Update in database
        await db.users.update_one(
            {"id": user_id},
            {"$set": user.dict()}
        )
        
        return {
            "message": "Check-in successful!",
            "points_earned": total_points_earned,
            "total_points": user.total_points,
            "streak": user.daily_streak,
            "streak_bonus": streak_bonus
        }
    
    except Exception as e:
        logger.error(f"Error in daily checkin: {e}")
        raise HTTPException(status_code=500, detail="Error processing check-in")

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user profile"""
    try:
        user_data = await db.users.find_one({"id": user_id})
        if not user_data:
            # Create new user
            user = User(id=user_id)
            await db.users.insert_one(user.dict())
            return user
        
        return User(**user_data)
    
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail="Error fetching user")

@api_router.get("/blockchains")
async def get_supported_blockchains():
    """Get list of supported blockchains"""
    blockchains = [
        {"id": "ethereum", "name": "Ethereum", "symbol": "ETH"},
        {"id": "bsc", "name": "Binance Smart Chain", "symbol": "BNB"},
        {"id": "solana", "name": "Solana", "symbol": "SOL"},
        {"id": "polygon", "name": "Polygon", "symbol": "MATIC"},
        {"id": "arbitrum", "name": "Arbitrum", "symbol": "ARB"},
        {"id": "optimism", "name": "Optimism", "symbol": "OP"},
        {"id": "avalanche", "name": "Avalanche", "symbol": "AVAX"},
        {"id": "fantom", "name": "Fantom", "symbol": "FTM"}
    ]
    return blockchains

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
    await data_service.close_session()
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)