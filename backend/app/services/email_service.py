import resend
import os
import random
import string
from datetime import datetime, timedelta

resend.api_key = os.getenv("RESEND_API_KEY", "")

verification_codes: dict = {}
reset_codes: dict = {}


def generate_code() -> str:
    return ''.join(random.choices(string.digits, k=6))


def send_verification_email(email: str, full_name: str) -> str:
    code = generate_code()
    verification_codes[email] = {
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=10),
        "full_name": full_name,
    }

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Catch Jobs</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Email Verification</p>
        </div>
        <div style="background: white; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 16px; margin: 0 0 8px;">Hi {full_name},</p>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Use this code to verify your email address:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e40af; background: #eff6ff; padding: 16px 32px; border-radius: 12px; display: inline-block;">
                    {code}
                </span>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 24px 0 0;">
                This code expires in 10 minutes. If you didn't request this, please ignore this email.
            </p>
        </div>
        <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin-top: 16px;">
            &copy; 2026 Catch Jobs. All rights reserved.
        </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": "Catch Jobs <noreply@catchjobs.work>",
            "to": [email],
            "subject": f"Your verification code: {code}",
            "html": html_content,
        })
        return code
    except Exception as e:
        print(f"Email error: {e}")
        raise Exception(f"Failed to send email: {str(e)}")


def send_reset_password_email(email: str) -> str:
    code = generate_code()
    reset_codes[email] = {
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=10),
    }

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Catch Jobs</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset</p>
        </div>
        <div style="background: white; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 16px; margin: 0 0 8px;">Hi there,</p>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">You requested to reset your password. Use this code:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #dc2626; background: #fef2f2; padding: 16px 32px; border-radius: 12px; display: inline-block;">
                    {code}
                </span>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 24px 0 0;">
                This code expires in 10 minutes. If you didn't request this, please ignore this email.
            </p>
        </div>
        <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin-top: 16px;">
            &copy; 2026 Catch Jobs. All rights reserved.
        </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": "Catch Jobs <noreply@catchjobs.work>",
            "to": [email],
            "subject": f"Password reset code: {code}",
            "html": html_content,
        })
        return code
    except Exception as e:
        print(f"Email error: {e}")
        raise Exception(f"Failed to send email: {str(e)}")


def verify_code(email: str, code: str) -> bool:
    data = verification_codes.get(email)
    if not data:
        return False
    if datetime.utcnow() > data["expires"]:
        del verification_codes[email]
        return False
    if data["code"] != code:
        return False
    del verification_codes[email]
    return True


def verify_reset_code(email: str, code: str) -> bool:
    data = reset_codes.get(email)
    if not data:
        return False
    if datetime.utcnow() > data["expires"]:
        del reset_codes[email]
        return False
    if data["code"] != code:
        return False
    del reset_codes[email]
    return True


def get_pending_user(email: str) -> dict | None:
    data = verification_codes.get(email)
    if not data:
        return None
    if datetime.utcnow() > data["expires"]:
        del verification_codes[email]
        return None
    return data
