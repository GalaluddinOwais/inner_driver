import random
from math import radians, sin, cos, asin, sqrt
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import OTP


def haversine_km(lat1, lng1, lat2, lng2):
    """
    Great-circle distance in kilometers between two (lat, lng) points.
    Returns None if any coordinate is missing.
    """
    if None in (lat1, lng1, lat2, lng2):
        return None
    lat1, lng1, lat2, lng2 = map(lambda v: radians(float(v)), (lat1, lng1, lat2, lng2))
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 2 * 6371.0 * asin(sqrt(a))  # 6371 km = Earth radius


def generate_otp_code():
    """Generate a random 6-digit OTP code"""
    return str(random.randint(100000, 999999))


def create_otp(user, otp_type):
    """
    Create and save an OTP for a user

    Args:
        user: User instance
        otp_type: Type of OTP ('registration' or 'password_change')

    Returns:
        OTP instance
    """
    # Invalidate any existing OTPs for this user and type
    OTP.objects.filter(user=user, otp_type=otp_type, is_verified=False).delete()

    # Generate new OTP
    otp_code = generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=10)  # OTP valid for 10 minutes

    otp = OTP.objects.create(
        user=user,
        otp_code=otp_code,
        otp_type=otp_type,
        expires_at=expires_at
    )

    return otp


def send_otp_email(user, otp_code, otp_type):
    """
    Send OTP email to user

    Args:
        user: User instance
        otp_code: The OTP code to send
        otp_type: Type of OTP ('registration' or 'password_change')

    Returns:
        Boolean indicating success
    """
    if otp_type == 'registration':
        subject = 'Welcome! Verify Your Email'
        message = f"""
Hello {user.full_name},

Welcome to our Rideshare platform!

Your verification code is: {otp_code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Rideshare Team
        """
    elif otp_type == 'password_change':
        subject = 'Password Change Verification'
        message = f"""
Hello {user.full_name},

You requested to change your password.

Your verification code is: {otp_code}

This code will expire in 10 minutes.

If you didn't request this code, please contact support immediately.

Best regards,
Rideshare Team
        """
    else:
        return False

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def verify_otp(user, otp_code, otp_type):
    """
    Verify an OTP code for a user

    Args:
        user: User instance
        otp_code: The OTP code to verify
        otp_type: Type of OTP ('registration' or 'password_change')

    Returns:
        Tuple (success: Boolean, message: String)
    """
    try:
        otp = OTP.objects.get(
            user=user,
            otp_code=otp_code,
            otp_type=otp_type,
            is_verified=False
        )

        # Check if OTP is expired
        if timezone.now() > otp.expires_at:
            otp.delete()
            return False, "OTP has expired. Please request a new one."

        # Mark OTP as verified
        otp.is_verified = True
        otp.save()

        return True, "OTP verified successfully."

    except OTP.DoesNotExist:
        return False, "Invalid OTP code."
