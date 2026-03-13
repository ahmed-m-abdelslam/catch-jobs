import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.preference import UserPreference
from app.schemas.preference import PreferenceCreate, PreferenceUpdate, PreferenceResponse

router = APIRouter(redirect_slashes=False, prefix="/preferences", tags=["Preferences"])


@router.get("/", response_model=list[PreferenceResponse])
async def list_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    return [PreferenceResponse.model_validate(p) for p in result.scalars().all()]


@router.post("/", response_model=PreferenceResponse)
async def create_preference(
    data: PreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pref = UserPreference(user_id=current_user.id, **data.model_dump())
    db.add(pref)
    await db.flush()
    return PreferenceResponse.model_validate(pref)


@router.put("/{pref_id}/", response_model=PreferenceResponse)
async def update_preference(
    pref_id: uuid.UUID,
    data: PreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreference).where(
            UserPreference.id == pref_id, UserPreference.user_id == current_user.id
        )
    )
    pref = result.scalar_one_or_none()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pref, field, value)

    await db.flush()
    return PreferenceResponse.model_validate(pref)


@router.delete("/{pref_id}/")
async def delete_preference(
    pref_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreference).where(
            UserPreference.id == pref_id, UserPreference.user_id == current_user.id
        )
    )
    pref = result.scalar_one_or_none()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")

    await db.delete(pref)
    return {"detail": "Deleted"}
