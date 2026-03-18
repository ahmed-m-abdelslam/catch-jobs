import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_email_notification(to_email: str, user_name: str, job_title: str, company: str, job_url: str):
    """Send job match email notification."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.debug("SMTP not configured, skipping email")
        return

    try:
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">New Job Match!</h1>
            </div>
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
                <p style="color: #374151; font-size: 16px;">Hi {user_name},</p>
                <p style="color: #374151; font-size: 16px;">We found a new job that matches your preferences:</p>
                <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #6366f1;">
                    <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 18px;">{job_title}</h2>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">{company}</p>
                </div>
                <a href="{job_url}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Job</a>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">— CatchJobs Team</p>
            </div>
        </div>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"New Match: {job_title} at {company}"
        msg["From"] = settings.smtp_user
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email} for job: {job_title}")
    except Exception as e:
        logger.warning(f"Email send failed: {e}")


async def create_notification(db, user_id: str, job_id: str):
    """Create in-app notification."""
    from app.models.notification import UserNotification
    import uuid
    notif = UserNotification(id=str(uuid.uuid4()), user_id=user_id, job_id=job_id)
    db.add(notif)
    await db.commit()
    return notif
