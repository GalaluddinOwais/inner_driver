# User Profile & OTP System Documentation

## Overview
This document describes the new user profile update and OTP (One-Time Password) email verification system.

## Features Implemented

### 1. User Profile Update
Endpoint to update user personal information (full_name, email, phone_number).

**Endpoint:** `PATCH/PUT /api/user/profile/`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "full_name": "New Name",
  "email": "newemail@example.com",
  "phone_number": "+1234567890"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "newemail@example.com",
    "full_name": "New Name",
    "phone_number": "+1234567890",
    "user_type": "driver",
    ...
  }
}
```

**Security:**
- Only authenticated users can update their own profile
- Email uniqueness is validated
- Only specific fields can be updated (full_name, email, phone_number)

---

### 2. OTP Email Verification

#### 2.1 Registration OTP
When a user registers (driver or rider), an OTP is automatically sent to their email.

**Endpoints:**
- `POST /api/register/driver/`
- `POST /api/register/rider/`

**Response includes:**
```json
{
  "message": "Driver registered successfully. Please check your email for OTP verification.",
  "user": {...},
  "tokens": {...}
}
```

---

#### 2.2 Password Change with OTP

**Step 1: Request Password Change**

**Endpoint:** `POST /api/user/password-change/request/`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "OTP has been sent to your email. Please check your inbox."
}
```

**Step 2: Verify OTP and Change Password**

**Endpoint:** `POST /api/user/password-change/verify/`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "otp_code": "123456",
  "new_password": "newpassword123",
  "new_password_confirm": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

**Validation:**
- OTP must be valid and not expired (10 minutes validity)
- Passwords must match
- Password must be at least 8 characters

---

## Email Configuration

### Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file with your email credentials:**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   ```

### Gmail Setup (Recommended)

For Gmail, you need to use an **App Password** instead of your regular password:

1. Enable 2-Factor Authentication on your Google Account
2. Go to: Google Account → Security → 2-Step Verification → App passwords
3. Generate a new app password for "Mail"
4. Use that 16-character password in `EMAIL_HOST_PASSWORD`

### Other Email Providers

- **Outlook/Hotmail:**
  - Host: `smtp.office365.com`
  - Port: `587`

- **Yahoo:**
  - Host: `smtp.mail.yahoo.com`
  - Port: `587`

---

## OTP Model

The OTP model stores verification codes with the following fields:

- `user` - ForeignKey to User
- `otp_code` - 6-digit verification code
- `otp_type` - Type of OTP ('registration' or 'password_change')
- `is_verified` - Boolean flag
- `created_at` - Timestamp
- `expires_at` - Expiration timestamp (10 minutes from creation)

**Features:**
- Automatic cleanup of old OTPs when creating new ones
- 10-minute expiration time
- Verification tracking

---

## Security Considerations

1. **OTP Expiration:** OTPs expire after 10 minutes
2. **Single Use:** OTPs are marked as verified after use
3. **Auto-cleanup:** Old unverified OTPs are deleted when new ones are created
4. **Password Requirements:** Minimum 8 characters
5. **Email Uniqueness:** Email addresses must be unique across all users
6. **Owner-only Updates:** Users can only update their own profile

---

## API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| PATCH/PUT | `/api/user/profile/` | Yes | Update user profile |
| POST | `/api/user/password-change/request/` | Yes | Request password change OTP |
| POST | `/api/user/password-change/verify/` | Yes | Verify OTP and change password |
| POST | `/api/register/driver/` | No | Register driver (sends OTP) |
| POST | `/api/register/rider/` | No | Register rider (sends OTP) |

---

## Testing

### Test OTP Email Sending (Development)

During development, you can use Django's console email backend to see emails in the terminal:

Edit `settings.py`:
```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

This will print emails to the console instead of sending them via SMTP.

### Test Profile Update

```bash
curl -X PATCH http://localhost:8000/api/user/profile/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Updated Name"}'
```

### Test Password Change

```bash
# Step 1: Request OTP
curl -X POST http://localhost:8000/api/user/password-change/request/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Step 2: Verify and change (use OTP from email)
curl -X POST http://localhost:8000/api/user/password-change/verify/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp_code": "123456",
    "new_password": "newpass123",
    "new_password_confirm": "newpass123"
  }'
```

---

## Admin Panel

All OTPs can be viewed and managed in the Django admin panel at `/admin/`:

- View all OTPs
- Filter by type (registration/password_change)
- Filter by verification status
- Search by user email or OTP code
- See creation and expiration timestamps
