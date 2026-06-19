# 🚗 Rideshare API - Complete Testing Guide

Your complete guide to testing every feature of the Rideshare API using Postman and WebSocket test pages.

---

## 📦 What's Included

### 1. Postman Collection
**File:** `Rideshare_API.postman_collection.json`
- ✅ All 16 REST API endpoints
- ✅ Automatic token management
- ✅ Pre-configured request bodies
- ✅ Environment variables
- ✅ Test scripts

### 2. WebSocket Test Pages
**Folder:** `WebSocket_Test_Pages/`
- ✅ `driver_location_sender.html` - Send location updates
- ✅ `rider_location_receiver.html` - Receive location updates
- ✅ `ride_notifications_tester.html` - Test ride notifications

### 3. Documentation
- ✅ `POSTMAN_GUIDE.md` - Complete Postman usage guide
- ✅ `OTP_AND_PROFILE_README.md` - OTP and profile features
- ✅ `WebSocket_Test_Pages/README.md` - WebSocket testing guide

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Import Postman Collection (1 min)
1. Open Postman
2. Click **Import**
3. Select `Rideshare_API.postman_collection.json`
4. Done! ✅

### Step 2: Start Server (1 min)
```bash
cd "c:\Users\galaluddin.o\Desktop\New folder"
python manage.py runserver
```

### Step 3: Create Test Data (2 mins)
Use Postman:

1. **Register Driver**
   - `1. Authentication` → `Register Driver` → Send
   - Token auto-saved! ✅

2. **Recharge Driver Balance**
   - `3. Driver Management` → `Recharge Balance` → Send
   - Balance: 500 ✅

3. **Set Driver Available**
   - `3. Driver Management` → `Update Driver Profile`
   - Body: `{"is_available": true}` → Send ✅

4. **Register Rider** (in new Postman tab)
   - `1. Authentication` → `Register Rider` → Send
   - Token auto-saved! ✅

### Step 4: Test Complete Workflow (1 min)
1. **Rider Requests Ride** (use rider token)
   - `4. Ride Management` → `Request Ride (Rider)`
   - Change `driver_id` to 1 → Send
   - Ride created! ✅

2. **Driver Accepts Ride** (switch to driver token)
   - `4. Ride Management` → `Accept Ride (Driver)` → Send
   - Ride accepted! ✅

**🎉 Congratulations! You just completed a full ride workflow!**

---

## 📚 Complete Feature Testing Guide

### Feature 1: User Registration & Authentication

#### Test Case 1.1: Register Driver
**Endpoint:** `POST /api/register/driver/`

**Steps:**
1. Open Postman → `Register Driver`
2. Modify email if needed: `driver2@example.com`
3. Send
4. Verify: Response has `tokens` and `user` data
5. Check: `access_token` saved in environment ✅

**Expected Result:**
```json
{
    "message": "Driver registered successfully. Please check your email for OTP verification.",
    "user": {...},
    "tokens": {
        "access": "eyJ...",
        "refresh": "eyJ..."
    }
}
```

**OTP Email:** Check your email for 6-digit verification code

---

#### Test Case 1.2: Register Rider
**Endpoint:** `POST /api/register/rider/`

**Steps:**
1. Open Postman → `Register Rider`
2. Send
3. Verify tokens received

---

#### Test Case 1.3: Login
**Endpoint:** `POST /api/login/`

**Steps:**
1. Open Postman → `Login`
2. Use credentials from registration
3. Send
4. Verify new tokens received

---

#### Test Case 1.4: Token Refresh
**Endpoint:** `POST /api/token/refresh/`

**Steps:**
1. Wait 1 hour (or modify token expiry in settings)
2. Open Postman → `Refresh Token`
3. Send
4. Verify new access and refresh tokens

**Note:** Test script auto-saves new tokens!

---

#### Test Case 1.5: Logout
**Endpoint:** `POST /api/logout/`

**Steps:**
1. Open Postman → `Logout`
2. Send
3. Verify: `"message": "Logout successful"`
4. Try using old token → Should get 401 Unauthorized

---

### Feature 2: User Profile Management

#### Test Case 2.1: Get Current User
**Endpoint:** `GET /api/user/me/`

**Steps:**
1. Login first
2. Open Postman → `Get Current User`
3. Send
4. Verify: User data with nested driver/rider profile

---

#### Test Case 2.2: Update Profile
**Endpoint:** `PATCH /api/user/profile/`

**Steps:**
1. Open Postman → `Update User Profile`
2. Modify body:
   ```json
   {
       "full_name": "Updated Name",
       "phone_number": "+9998887777"
   }
   ```
3. Send
4. Verify: Profile updated
5. Call `Get Current User` to confirm changes

---

#### Test Case 2.3: Password Change with OTP
**Endpoints:**
- `POST /api/user/password-change/request/`
- `POST /api/user/password-change/verify/`

**Steps:**
1. **Request OTP:**
   - Open Postman → `Request Password Change (Send OTP)`
   - Send
   - Check email for OTP code

2. **Verify OTP and Change Password:**
   - Open Postman → `Verify OTP and Change Password`
   - Update body with OTP from email:
   ```json
   {
       "otp_code": "123456",
       "new_password": "newpass123",
       "new_password_confirm": "newpass123"
   }
   ```
   - Send
   - Verify: `"message": "Password changed successfully"`

3. **Test New Password:**
   - Use `Login` endpoint with new password
   - Should succeed ✅

---

### Feature 3: Driver Management

#### Test Case 3.1: Get Driver Profile
**Endpoint:** `GET /api/driver/profile/`

**Steps:**
1. Login as driver
2. Open Postman → `Get Driver Profile`
3. Send
4. Verify: Vehicle info, balance, availability, location, rating

---

#### Test Case 3.2: Update Driver Profile
**Endpoint:** `PATCH /api/driver/profile/`

**Test 3.2a: Update Vehicle**
```json
{
    "vehicle_type_id": 2,
    "vehicle_color": "red"
}
```

**Test 3.2b: Set Available (with balance)**
1. Ensure balance > price_per_trip (use Recharge if needed)
2. Send:
   ```json
   {
       "is_available": true
   }
   ```
3. Verify: Balance decreased by `price_per_trip`
4. Verify: `is_available` is `true`

**Test 3.2c: Set Available (insufficient balance)**
1. Ensure balance < price_per_trip
2. Try to set `is_available: true`
3. Verify: Error message about insufficient balance

---

#### Test Case 3.3: Recharge Balance
**Endpoint:** `POST /api/driver/recharge/`

**Steps:**
1. Login as driver
2. Note current balance
3. Send:
   ```json
   {
       "amount": 100.00
   }
   ```
4. Verify: Balance increased by 100

---

#### Test Case 3.4: List All Drivers
**Endpoint:** `GET /api/drivers/`

**Test 3.4a: Basic List**
- Send request
- Verify: List of drivers returned

**Test 3.4b: Filter Available Drivers**
- URL: `/api/drivers/?is_available=true`
- Verify: Only available drivers returned

**Test 3.4c: Filter by Vehicle Brand**
- URL: `/api/drivers/?vehicle_type__brand=Toyota`
- Verify: Only Toyota drivers returned

**Test 3.4d: Sort by Rating**
- URL: `/api/drivers/?ordering=-rating`
- Verify: Drivers sorted by rating (highest first)

**Test 3.4e: Search by Name**
- URL: `/api/drivers/?search=John`
- Verify: Only drivers with "John" in name

---

#### Test Case 3.5: Get Driver Detail
**Endpoint:** `GET /api/drivers/{id}/`

**Steps:**
1. Get driver ID from list
2. Update URL: `/api/drivers/1/`
3. Send
4. Verify: Detailed driver info with full user profile

---

### Feature 4: Ride Management

#### Test Case 4.1: Request Ride (Happy Path)
**Endpoint:** `POST /api/rides/request/`

**Prerequisites:**
- Driver is available
- Driver has balance
- Login as rider

**Steps:**
1. List available drivers → Note driver ID
2. Open Postman → `Request Ride (Rider)`
3. Send with:
   ```json
   {
       "driver_id": 1,
       "price": 50.00,
       "pickup_location": "123 Main St",
       "dropoff_location": "456 Oak Ave"
   }
   ```
4. Verify: Ride created with status "pending"
5. Verify: `ride_id` saved in environment

---

#### Test Case 4.2: Request Ride (Driver Unavailable)
**Steps:**
1. Set driver as unavailable
2. Try to request ride to that driver
3. Verify: Error - "Driver is not available"

---

#### Test Case 4.3: Accept Ride
**Endpoint:** `POST /api/rides/{ride_id}/accept/`

**Prerequisites:**
- Have pending ride
- Login as driver who received the request

**Steps:**
1. Open Postman → `Accept Ride (Driver)`
2. Send
3. Verify: Ride status changed to "accepted"
4. Verify: Driver `is_available` now false
5. Get driver profile → Confirm unavailable

---

#### Test Case 4.4: Reject Ride with Counter Price
**Endpoint:** `POST /api/rides/{ride_id}/reject/`

**Steps:**
1. Create new ride request
2. Login as driver
3. Open Postman → `Reject Ride with Counter Price (Driver)`
4. Send with:
   ```json
   {
       "rejection_price": 75.00
   }
   ```
5. Verify: Ride status "rejected"
6. Verify: `rejection_price` set to 75.00

---

#### Test Case 4.5: Re-request Ride (Accept Counter Price)
**Endpoint:** `POST /api/rides/{ride_id}/rerequest/`

**Prerequisites:**
- Have rejected ride with counter price
- Driver still available
- Login as rider

**Steps:**
1. Open Postman → `Re-request Ride (Rider accepts counter price)`
2. Send
3. Verify: Ride status changed to "pending"
4. Verify: Price updated to rejection_price (75.00)

---

#### Test Case 4.6: Re-request Ride (Driver Unavailable)
**Steps:**
1. Have rejected ride
2. Set driver as unavailable
3. Try to re-request
4. Verify: Error - "Driver is no longer available"

---

### Feature 5: WebSocket Real-time Features

#### Test Case 5.1: Ride Notifications

**Setup:**
1. Open `WebSocket_Test_Pages/ride_notifications_tester.html` in 2 browser tabs
2. Tab 1: Connect with driver token
3. Tab 2: Connect with rider token

**Test 5.1a: Ride Request Notification**
1. In Postman: Rider requests ride (as rider)
2. Verify: Driver's browser shows "Ride Requested" notification ✅
3. Verify: Notification includes ride details (price, locations)

**Test 5.1b: Ride Accept Notification**
1. In Postman: Driver accepts ride
2. Verify: Rider's browser shows "Ride Accepted" notification ✅

**Test 5.1c: Ride Reject Notification**
1. In Postman: Driver rejects with counter price
2. Verify: Rider's browser shows "Ride Rejected" notification ✅
3. Verify: Counter price displayed

**Test 5.1d: Ride Re-request Notification**
1. In Postman: Rider re-requests at counter price
2. Verify: Driver's browser shows "Ride Re-requested" notification ✅

---

#### Test Case 5.2: Driver Location Broadcasting

**Setup:**
1. In Postman: Rider requests ride to driver
2. Open `WebSocket_Test_Pages/driver_location_sender.html`
   - Connect with driver token
3. Open `WebSocket_Test_Pages/rider_location_receiver.html`
   - Connect with rider token

**Test 5.2a: Manual Location Update**
1. Driver page: Enter coordinates (40.7128, -74.0060)
2. Click "Send Location"
3. Verify: Rider page receives update ✅
4. Verify: Coordinates match
5. Verify: Timestamp is recent

**Test 5.2b: Simulated Movement**
1. Driver page: Click "Simulate Movement"
2. Verify: 10 location updates sent (every 2 seconds)
3. Verify: Rider page receives all 10 updates ✅
4. Verify: Coordinates change with each update
5. Verify: Update counter increases

**Test 5.2c: Multiple Riders Tracking Same Driver**
1. Create 2 rides with same driver (2 different riders)
2. Open rider location receiver in 2 browser tabs
3. Connect both with different rider tokens
4. Driver sends location
5. Verify: Both riders receive same location update ✅

**Test 5.2d: Rider Without Active Ride**
1. Rider with NO active/pending rides
2. Try to connect to location WebSocket
3. Verify: Receives no location updates (no tracked drivers)

---

### Feature 6: Email & OTP System

#### Test Case 6.1: Registration OTP Email
**Steps:**
1. Register new user (driver or rider)
2. Check email inbox
3. Verify: Email received with 6-digit OTP
4. Verify: Email subject mentions "verification" or "registration"
5. Verify: Email contains user's full name

---

#### Test Case 6.2: Password Change OTP Email
**Steps:**
1. Request password change
2. Check email inbox
3. Verify: Email received with OTP
4. Verify: Email subject mentions "password change"
5. Verify: Email warns about unauthorized access

---

#### Test Case 6.3: OTP Expiration
**Steps:**
1. Request password change OTP
2. Wait 11 minutes
3. Try to verify with expired OTP
4. Verify: Error - "OTP has expired"

---

#### Test Case 6.4: Invalid OTP
**Steps:**
1. Request password change OTP
2. Use wrong code: "000000"
3. Verify: Error - "Invalid OTP code"

---

#### Test Case 6.5: OTP Already Used
**Steps:**
1. Request password change
2. Verify OTP and change password (success)
3. Try to use same OTP again
4. Verify: Error - "Invalid OTP code" (already verified)

---

## 🧪 Integration Testing Scenarios

### Scenario 1: Complete Ride Lifecycle

**Participants:**
- 1 Driver
- 1 Rider

**Workflow:**
1. ✅ Driver registers → OTP email sent
2. ✅ Driver recharges balance (500)
3. ✅ Driver sets available → Balance deducted (50)
4. ✅ Rider registers → OTP email sent
5. ✅ Rider lists available drivers → Sees driver
6. ✅ Rider requests ride → Driver notification
7. ✅ Driver accepts ride → Rider notification + Driver unavailable
8. ✅ Driver sends location → Rider sees real-time updates
9. ✅ Ride completed (manual status change in admin)

**Verification Points:**
- All notifications received in real-time
- Balance calculations correct
- Location updates streaming
- Availability status changes

---

### Scenario 2: Negotiation Flow

**Workflow:**
1. ✅ Rider requests ride ($50)
2. ✅ Driver rejects with counter price ($75) → Rider notification
3. ✅ Rider re-requests at $75 → Driver notification
4. ✅ Driver accepts at $75 → Rider notification

**Verification:**
- All price changes reflected
- Ride status transitions correct
- All notifications received

---

### Scenario 3: Insufficient Balance Prevention

**Workflow:**
1. ✅ Driver balance: $40
2. ✅ Price per trip: $50
3. ✅ Driver tries to set available
4. ✅ Error: Insufficient balance
5. ✅ Driver recharges $20
6. ✅ Driver successfully sets available
7. ✅ Balance now: $10 ($60 - $50)

---

### Scenario 4: Concurrent Ride Requests

**Participants:**
- 1 Driver
- 2 Riders

**Workflow:**
1. ✅ Driver is available
2. ✅ Rider 1 requests ride
3. ✅ Rider 2 tries to request ride to same driver
4. ✅ Driver accepts Rider 1's request → Now unavailable
5. ✅ Verify: Rider 2's request should fail (driver unavailable)

---

## 🎯 Edge Cases & Error Scenarios

### Error Test 1: Expired Token
1. Get access token
2. Change expiry in settings to 1 minute
3. Wait 2 minutes
4. Try any authenticated request
5. Verify: 401 Unauthorized

---

### Error Test 2: Wrong User Type
1. Login as rider
2. Try to access driver-only endpoint (e.g., recharge balance)
3. Verify: 403 Forbidden

---

### Error Test 3: Accept Own Ride Request
1. Login as both driver and rider (2 accounts)
2. Rider requests ride
3. Try to accept as different driver
4. Verify: 403 Forbidden (not your ride)

---

### Error Test 4: Duplicate Email Registration
1. Register user with email
2. Try to register another user with same email
3. Verify: 400 Bad Request - Email already exists

---

### Error Test 5: Invalid Vehicle Type
1. Try to register driver with non-existent vehicle_type_id: 999
2. Verify: 400 Bad Request - Vehicle type does not exist

---

## 📊 Test Coverage Checklist

### REST API Endpoints: 16/16 ✅
- [x] Register Driver
- [x] Register Rider
- [x] Login
- [x] Logout
- [x] Refresh Token
- [x] Get Current User
- [x] Update User Profile
- [x] Request Password Change
- [x] Verify OTP and Change Password
- [x] Get Driver Profile
- [x] Update Driver Profile
- [x] Recharge Balance
- [x] List Drivers (with filters)
- [x] Get Driver Detail
- [x] Request Ride
- [x] Accept Ride
- [x] Reject Ride
- [x] Re-request Ride

### WebSocket Endpoints: 2/2 ✅
- [x] Ride Notifications
- [x] Driver Location Tracking

### Features
- [x] JWT Authentication
- [x] OTP Email Verification
- [x] User Profile Management
- [x] Driver Balance System
- [x] Ride Request/Accept/Reject
- [x] Counter-pricing Negotiation
- [x] Real-time Notifications
- [x] Real-time Location Tracking
- [x] Permission System
- [x] Filtering & Search
- [x] Password Change Flow

---

## 🔧 Troubleshooting Guide

### Issue: "Database is locked"
**Solution:**
```bash
# Close all connections
python manage.py migrate
# Or restart server
```

---

### Issue: WebSocket connection fails
**Solution:**
1. Verify Daphne/ASGI server running
2. Check CORS settings
3. Verify token not expired
4. Check browser console for errors

---

### Issue: Email not sending
**Solution:**
1. Check `.env` file configured
2. For Gmail: Use App Password
3. Test with console backend:
   ```python
   EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
   ```
4. Check Django console for email output

---

### Issue: Tokens not auto-saving
**Solution:**
1. Check Postman environment selected
2. View Tests tab in request
3. Manually add variables if needed

---

## 📈 Performance Testing

### Load Test 1: Concurrent Ride Requests
**Tools:** Apache JMeter or Postman Runner

1. Create 100 riders
2. All request rides simultaneously
3. Verify: All requests processed correctly
4. Check: Response times < 500ms

---

### Load Test 2: Location Updates Stream
1. 10 drivers sending location every 2 seconds
2. 50 riders receiving updates
3. Verify: No missed updates
4. Check: WebSocket connections stable

---

## 🎓 Best Practices

1. **Always login fresh** before testing authenticated endpoints
2. **Use environment variables** - Don't hardcode tokens
3. **Test error cases** - Not just happy paths
4. **Clean up test data** - Reset database between test runs if needed
5. **Monitor server logs** - Check Django console for errors
6. **Use WebSocket pages** - Visual testing helps catch issues
7. **Verify emails** - Check OTP functionality works

---

## 📞 Support & Resources

- **Postman Guide:** `POSTMAN_GUIDE.md`
- **WebSocket Guide:** `WebSocket_Test_Pages/README.md`
- **OTP Features:** `OTP_AND_PROFILE_README.md`
- **API Documentation:** Django REST Framework browsable API at `http://localhost:8000/api/`

---

## ✅ Final Checklist

Before reporting issues, verify:

- [ ] Django server running
- [ ] Database migrated
- [ ] `.env` file configured
- [ ] Vehicle types exist in database
- [ ] Postman collection imported
- [ ] Environment variables set
- [ ] Using correct token for user type
- [ ] Token not expired
- [ ] Request body matches expected format
- [ ] WebSocket HTML pages opened in browser (for WebSocket tests)

---

**🎉 You're all set! Happy Testing!**

If you need help, refer to the specific guides for detailed instructions.
