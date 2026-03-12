import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.notification import UserNotification
from app.schemas.job import JobResponse

router = APIRouter(redirect_slashes=False, prefix="/notifications", tags=["Notifications"])


@router.get("/")
async def get_notifications(
    unread_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
    )
    if unread_only:
        query = query.where(UserNotification.is_read == False)

    query = (
        query
        .order_by(UserNotification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    notifications = result.scalars().all()

    response = []
    for notif in notifications:
        job_result = await db.execute(select(Job).where(Job.id == notif.job_id))
        job = job_result.scalar_one_or_none()
        if job:
            response.append({
                "id": str(notif.id),
                "job": JobResponse.model_validate(job).model_dump(),
                "is_read": notif.is_read,
                "created_at": notif.created_at.isoformat(),
            })

    return response


@router.get("/count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.count(UserNotification.id)).where(
            UserNotification.user_id == current_user.id,
            UserNotification.is_read == False,
        )
    )
    count = result.scalar()
    return {"unread_count": count}


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(UserNotification)
        .where(
            UserNotification.id == notification_id,
            UserNotification.user_id == current_user.id,
        )
        .values(is_read=True)
    )
    return {"detail": "Marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(UserNotification)
        .where(
            UserNotification.user_id == current_user.id,
            UserNotification.is_read == False,
        )
        .values(is_read=True)
    )
    return {"detail": "All marked as read"}
