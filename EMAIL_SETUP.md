# 📧 Email Configuration Guide

## Current Setup

**Currently using:** Console Email Backend (for testing)

This means OTP codes will be **printed in your terminal** instead of sent via email - perfect for testing!

---

## How It Works

### Console Backend (Current - Recommended for Testing)

When you request a password change or register:
1. OTP is generated
2. Email content is **printed to your terminal/console**
3. Copy the 6-digit OTP code from terminal
4. Use it in the verify endpoint

**Advantages:**
- ✅ No email configuration needed
- ✅ Instant - no waiting for emails
- ✅ No spam/deliverability issues
- ✅ Perfect for development/testing

**Example Output in Terminal:**
```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: Password Change Verification
From: webmaster@localhost
To: galaluddinowais@gmail.com
Date: Mon, 15 Jan 2025 10:30:00 -0000

Hello Galaluddin Owais,

You requested to change your password.

Your verification code is: 123456

This code will expire in 10 minutes.
```

Just copy **123456** and use it!

---

## Switching to Real Email (Optional)

If you want to send real emails via Gmail:

### Step 1: Update settings.py

Edit `rideshare_project/settings.py`:

```python
# Email Configuration
# OPTION 1: Console Backend (for testing - prints emails to terminal)
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # <-- Comment this

# OPTION 2: SMTP Backend (for real emails - uncomment these lines)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # <-- Uncomment
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('EMAIL_HOST_USER', default='')
```

### Step 2: Verify .env file

The `.env` file is already configured with your Gmail:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=galaluddinowais@gmail.com
EMAIL_HOST_PASSWORD=ycus itpo fwnt prcf
```

### Step 3: Restart Server

```bash
# Stop server (Ctrl+C)
# Start again
python manage.py runserver
```

### Step 4: Test

Now OTP emails will be sent to real email addresses!

---

## Testing OTP Flow

### Test 1: Password Change OTP

**Request OTP:**
```json
POST /api/user/password-change/request/
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Check Terminal Output** (if using console backend) or **Check Email** (if using SMTP)

**Copy OTP Code** (6 digits)

**Verify OTP and Change Password:**
```json
POST /api/user/password-change/verify/
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
{
    "otp_code": "123456",
    "new_password": "newpass123",
    "new_password_confirm": "newpass123"
}
```

### Test 2: Registration OTP

**Register New User:**
```json
POST /api/register/driver/
{
    "email": "test@example.com",
    "password": "password123",
    "password_confirm": "password123",
    "full_name": "Test Driver",
    "phone_number": "+1234567890",
    "vehicle_type_id": 1,
    "vehicle_color": "black"
}
```

**Check Terminal/Email** for OTP code

---

## Troubleshooting

### Issue: "Invalid address" Error

**Cause:** `.env` file missing or EMAIL_HOST_USER empty

**Solution:**
- ✅ `.env` file already created
- ✅ Switch to console backend (already done)

### Issue: Gmail App Password Not Working

**Causes:**
1. Not using App Password (using regular password)
2. 2FA not enabled
3. Wrong App Password

**Solution:**
1. Enable 2-Factor Authentication on Google Account
2. Go to: Google Account → Security → 2-Step Verification → App passwords
3. Create new app password for "Mail"
4. Use that 16-character password in `.env`

### Issue: Not Receiving Emails

**Solutions:**
1. Check spam folder
2. Verify email address is correct
3. Check server logs for errors
4. Switch to console backend for testing

---

## Recommendation

**For Development/Testing:** Use **Console Backend** (current setup)
- Fast, reliable, no configuration
- OTP codes appear instantly in terminal

**For Production/Demo:** Use **SMTP Backend** with Gmail
- Real emails sent to users
- Professional appearance

---

## Quick Switch Commands

### Switch to Console Backend
Edit `settings.py` line 236-237:
```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # Comment this
```

### Switch to SMTP Backend
Edit `settings.py` line 236-237:
```python
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Comment this
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
```

Then uncomment the SMTP configuration lines below (lines 241-246).

---

## Current Status

✅ Console Email Backend Active
✅ `.env` file created with Gmail credentials
✅ Ready for testing OTP functionality
✅ OTP codes will print to terminal

**No further configuration needed for testing!**

Just restart your server and test the password change endpoint - OTP will appear in your terminal! 🎉
