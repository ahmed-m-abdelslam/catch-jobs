import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.models.user import User
from app.models.job import Job
from app.models.notification import UserNotification

settings = get_settings()


async def create_notification(user_id: uuid.UUID, job_id: uuid.UUID, db: AsyncSession) -> UserNotification:
    """Create an in-app notification record."""
    # Check if notification already exists
    existing = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == user_id,
            UserNotification.job_id == job_id,
        )
    )
    if existing.scalar_one_or_none():
        return None

    notification = UserNotification(user_id=user_id, job_id=job_id)
    db.add(notification)
    await db.flush()
    return notification


def send_email_notification(to_email: str, user_name: str, job_title: str, company: str, job_url: str):
    """Send an email notification about a matching job."""
    if not settings.smtp_user:
        return  # Email not configured

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"New job match: {job_title} at {company or 'Unknown'}"
    msg["From"] = settings.from_email
    msg["To"] = to_email

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">New Job Match Found!</h2>
        <p>Hi {user_name},</p>
        <p>We found a job that matches your preferences:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">{job_title}</h3>
            <p style="margin: 0; color: #6b7280;">{company or 'Company not specified'}</p>
        </div>
        <a href="{job_url}" style="
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin-top: 12px;
        ">View Job</a>
        <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
            You're receiving this because you have job alerts enabled on JobMatcher.
        </p>
    </body>
    </html>
    """

    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.from_email, to_email, msg.as_string())
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")


async def notify_matched_users(
    job: Job,
    user_ids: list[uuid.UUID],
    db: AsyncSession,
):
    """Create in-app notifications and send emails for all matched users."""
    for user_id in user_ids:
        # Create in-app notification
        await create_notification(user_id, job.id, db)

        # Fetch user for email
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            send_email_notification(
                to_email=user.email,
                user_name=user.full_name,
                job_title=job.title,
                company=job.company_name,
                job_url=job.job_url,
            )
