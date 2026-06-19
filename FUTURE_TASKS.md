# Future Tasks - TODO

## 1. WebSocket for Drivers Listing
- Implement real-time WebSocket connection for drivers list
- Drivers availability status should update in real-time
- Location updates should reflect immediately in the listing
- Consider creating a separate WebSocket endpoint: `ws://localhost:8000/ws/drivers/`

## 2. OTP for Registration (Fix Required)
**Current Issue:** Users register immediately without email verification

**Required Flow:**
1. User submits registration request with email and other details
2. System sends OTP to email (don't create user yet)
3. User receives OTP via email
4. User submits OTP code along with email to verify
5. Only after OTP verification, create the user account and complete registration

**Endpoints to Modify:**
- `POST /api/register/driver/` - Should send OTP, not create user
- `POST /api/register/rider/` - Should send OTP, not create user
- Create new endpoints:
  - `POST /api/register/verify-otp/` - Verify OTP and complete registration
  - Or modify existing registration flow to be two-step

## 3. Total Rides & Rating System
**Total Rides:**
- Should increment when driver **accepts** a ride
- Update `Driver.total_rides` counter on ride acceptance
- Update `Rider.total_rides` counter on ride acceptance

**Rating System:**
- Riders should be able to rate drivers after ride completion
- Add rating endpoint: `POST /api/rides/{ride_id}/rate/`
- Rating should be 1-5 stars
- Update `Driver.rating` as an average of all ratings received
- Consider adding `rating` field to `Ride` model to track individual ride ratings
- Possibly track number of ratings to calculate accurate average

## 4. Real Money Charge for Current Balance
**Payment Integration:**
- Implement payment gateway integration (Stripe, PayPal, etc.)
- Create endpoint: `POST /api/driver/recharge/`
- Current recharge endpoint is placeholder (just updates balance directly)
- Should integrate with payment provider API
- Add payment history/transaction tracking
- Security considerations for handling payment data

---

**Status:** All documented for future implementation
**Date:** 2025-11-15
**All current features tested and working:**
- ✅ REST API endpoints (16 total)
- ✅ WebSocket notifications
- ✅ WebSocket location tracking
- ✅ Email/OTP for password change
- ✅ JWT authentication
- ✅ Postman collection ready
- ✅ Fake data populated
- ✅ Virtual environment configured
