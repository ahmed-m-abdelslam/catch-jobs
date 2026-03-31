import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt

from app.database import get_db
from app.config import get_settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, VerifyCode, ResendCode, ForgotPassword, ResetPassword
from app.services.email_service import send_verification_email, verify_code, get_pending_user, send_reset_password_email, verify_reset_code

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()
settings = get_settings()

pending_registrations: dict = {}


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register")
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        send_verification_email(data.email, data.full_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {str(e)}")

    pending_registrations[data.email] = {
        "password": data.password,
        "full_name": data.full_name,
        "expires": datetime.utcnow() + timedelta(minutes=10),
    }

    return {"message": "Verification code sent to your email", "email": data.email}


@router.post("/verify-code", response_model=TokenResponse)
async def verify_email_code(data: VerifyCode, db: AsyncSession = Depends(get_db)):
    if not verify_code(data.email, data.code):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    reg_data = pending_registrations.get(data.email)
    if not reg_data or datetime.utcnow() > reg_data["expires"]:
        if data.email in pending_registrations:
            del pending_registrations[data.email]
        raise HTTPException(status_code=400, detail="Registration expired. Please register again.")

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        del pending_registrations[data.email]
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(reg_data["password"]),
        full_name=reg_data["full_name"],
        auth_provider="local",
    )
    db.add(user)
    await db.flush()

    del pending_registrations[data.email]

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/resend-code")
async def resend_code(data: ResendCode):
    reg_data = pending_registrations.get(data.email)
    if not reg_data:
        raise HTTPException(status_code=400, detail="No pending registration found")

    try:
        send_verification_email(data.email, reg_data["full_name"])
        reg_data["expires"] = datetime.utcnow() + timedelta(minutes=10)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"message": "New verification code sent"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        return {"message": "If this email exists, a reset code has been sent"}

    try:
        send_reset_password_email(data.email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"message": "If this email exists, a reset code has been sent"}


@router.post("/reset-password")
async def reset_password(data: ResetPassword, db: AsyncSession = Depends(get_db)):
    if not verify_reset_code(data.email, data.code):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    await db.flush()

    return {"message": "Password reset successfully"}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.last_login = datetime.now(timezone.utc)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.put("/profile")
async def update_profile(
    full_name: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user profile."""
    if full_name and full_name.strip():
        current_user.full_name = full_name.strip()
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload profile picture."""
    import base64
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(status_code=400, detail="Image must be less than 2MB")
    
    b64 = base64.b64encode(data).decode()
    data_url = f"data:{file.content_type};base64,{b64}"
    
    current_user.avatar_url = data_url
    await db.commit()
    await db.refresh(current_user)
    return {"avatar_url": data_url}


@router.post("/upload-cv")
async def upload_cv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload CV/Resume."""
    import base64
    allowed = ["application/pdf", "application/msword", 
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if not file.content_type or file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="File must be PDF or Word document")
    
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="CV must be less than 5MB")
    
    b64 = base64.b64encode(data).decode()
    data_url = f"data:{file.content_type};base64,{b64}"
    
    current_user.cv_url = data_url
    await db.commit()
    await db.refresh(current_user)
    return {"cv_url": "uploaded", "filename": file.filename}


@router.delete("/remove-cv")
async def remove_cv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove uploaded CV."""
    current_user.cv_url = None
    await db.commit()
    return {"message": "CV removed"}

