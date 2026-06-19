# Postman Collection Guide

Complete guide for using the Rideshare API Postman collection.

## 📥 Importing the Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `Rideshare_API.postman_collection.json`
5. Click **Import**

---

## 🔧 Environment Setup (IMPORTANT!)

The collection uses environment variables for tokens and IDs. These are automatically set by test scripts!

### Automatic Variables (Set by Scripts)
- `access_token` - JWT access token (auto-saved after login/register)
- `refresh_token` - JWT refresh token (auto-saved after login/register)
- `user_id` - Current user ID (auto-saved after register)
- `ride_id` - Last created ride ID (auto-saved after ride request)

### Manual Variables (You set once)
- `base_url` - Server URL (default: `http://localhost:8000`)

### How to View/Edit Variables
1. Click the **eye icon** (👁️) in top right
2. Select your environment
3. View/edit variables

---

## 📋 Collection Structure

### 1️⃣ Authentication
All authentication endpoints with automatic token management.

### 2️⃣ User Profile
User profile management and password change with OTP.

### 3️⃣ Driver Management
Driver-specific endpoints including balance recharge and availability.

### 4️⃣ Ride Management
Complete ride workflow: request, accept, reject, re-request.

### 5️⃣ WebSocket Testing
Information and instructions for WebSocket testing.

---

## 🚀 Quick Start Guide

### Step 1: Start the Server
```bash
cd "c:\Users\galaluddin.o\Desktop\New folder"
python manage.py runserver
```

### Step 2: Register Users

#### Register a Driver
1. Open `1. Authentication` → `Register Driver`
2. Modify the body if needed:
   ```json
   {
       "email": "driver@example.com",
       "password": "password123",
       "password_confirm": "password123",
       "full_name": "John Driver",
       "phone_number": "+1234567890",
       "vehicle_type_id": 1,
       "vehicle_color": "black"
   }
   ```
3. Click **Send**
4. ✅ `access_token` and `refresh_token` are automatically saved!

#### Register a Rider
1. Open `1. Authentication` → `Register Rider`
2. Click **Send**
3. ✅ Tokens auto-saved!

### Step 3: Test Other Endpoints
Now you can use any authenticated endpoint - tokens are already set!

---

## 📝 Complete Workflow Examples

### Workflow 1: Driver Setup
**Goal:** Create a driver and prepare for rides

1. **Register Driver** → Tokens saved ✅
2. **Recharge Balance**
   ```json
   {
       "amount": 500.00
   }
   ```
3. **Update Driver Profile** - Set availability to true
   ```json
   {
       "is_available": true
   }
   ```
4. **Get Driver Profile** - Verify settings

**Result:** Driver is ready to receive ride requests!

---

### Workflow 2: Rider Requests Ride
**Goal:** Rider requests a ride from available driver

1. **Register Rider** (if not already)
2. **List Available Drivers** - Find available drivers
   - Note the driver's `user` ID (this is the driver_id)
3. **Request Ride**
   ```json
   {
       "driver_id": 1,
       "price": 50.00,
       "pickup_location": "123 Main St, City",
       "dropoff_location": "456 Oak Ave, City"
   }
   ```
4. ✅ `ride_id` is automatically saved!

**Result:** Ride request sent! Driver receives WebSocket notification.

---

### Workflow 3: Driver Accepts Ride
**Goal:** Driver accepts pending ride

**Prerequisites:**
- Login as driver
- Have a pending ride (note the ride_id)

1. **Login** as driver (tokens saved)
2. **Accept Ride**
   - URL: `/api/rides/{{ride_id}}/accept/`
   - Method: POST
   - No body needed
3. **Get Driver Profile** - Verify `is_available` is now `false`

**Result:** Ride accepted! Rider receives WebSocket notification. Driver marked as unavailable.

---

### Workflow 4: Driver Rejects with Counter Price
**Goal:** Driver rejects but offers different price

1. **Login** as driver
2. **Reject Ride with Counter Price**
   ```json
   {
       "rejection_price": 75.00
   }
   ```

**Result:** Ride rejected with counter offer. Rider receives notification with new price.

---

### Workflow 5: Rider Accepts Counter Price
**Goal:** Rider accepts driver's counter price

1. **Login** as rider
2. **Re-request Ride** (accepts counter price)
   - URL: `/api/rides/{{ride_id}}/rerequest/`
   - Method: POST
   - No body needed

**Result:** Ride status changes from "rejected" to "pending" with counter price. Driver receives notification.

---

### Workflow 6: Password Change with OTP
**Goal:** Change user password securely

1. **Login** (any user)
2. **Request Password Change** (sends OTP to email)
   - Check your email for 6-digit OTP code
3. **Verify OTP and Change Password**
   ```json
   {
       "otp_code": "123456",
       "new_password": "newpassword123",
       "new_password_confirm": "newpassword123"
   }
   ```
4. **Login** with new password

**Note:** OTP expires after 10 minutes!

---

### Workflow 7: Update User Profile
**Goal:** Update personal information

1. **Login** (any user)
2. **Update User Profile**
   ```json
   {
       "full_name": "Updated Name",
       "email": "newemail@example.com",
       "phone_number": "+9998887777"
   }
   ```
3. **Get Current User** - Verify changes

---

## 🎯 Common Use Cases

### Testing Ride Notifications (WebSocket)

**Setup:**
1. Open `WebSocket_Test_Pages/ride_notifications_tester.html` in browser
2. Use Postman to get driver token → Paste in WebSocket page → Connect
3. Open another browser tab with same page
4. Use Postman to get rider token → Paste in second tab → Connect

**Test:**
1. In Postman: Rider requests ride → Driver sees notification in browser ✅
2. In Postman: Driver accepts ride → Rider sees notification in browser ✅

---

### Testing Location Tracking (WebSocket)

**Setup:**
1. In Postman: Rider requests ride to driver
2. Open `WebSocket_Test_Pages/driver_location_sender.html`
   - Paste driver token → Connect → Click "Simulate Movement"
3. Open `WebSocket_Test_Pages/rider_location_receiver.html`
   - Paste rider token → Connect → Watch location updates! ✅

---

### Finding Available Drivers

**Query Parameters Examples:**

1. **All Available Drivers:**
   ```
   GET /api/drivers/?is_available=true
   ```

2. **Filter by Vehicle Brand:**
   ```
   GET /api/drivers/?vehicle_type__brand=Toyota&is_available=true
   ```

3. **Minimum Rating:**
   ```
   GET /api/drivers/?rating__gte=4.5
   ```

4. **Sort by Rating:**
   ```
   GET /api/drivers/?ordering=-rating
   ```

5. **Search by Name:**
   ```
   GET /api/drivers/?search=John
   ```

---

## 🔑 Authentication Flow

### Initial Registration/Login
```
Register/Login → Tokens saved automatically → Use authenticated endpoints
```

### Token Refresh (when access token expires)
1. **Refresh Token** endpoint
   - Uses saved `refresh_token`
   - Returns new access & refresh tokens
   - Both automatically saved!

### Logout
1. **Logout** endpoint
   - Blacklists refresh token
   - Manually clear tokens from environment

---

## 📊 Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET requests, updates |
| 201 | Created | Registration, ride request |
| 400 | Bad Request | Invalid data, validation errors |
| 401 | Unauthorized | Invalid/expired token |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Ride/user doesn't exist |
| 500 | Server Error | Internal server error |

---

## 🐛 Troubleshooting

### "Unauthorized" Error (401)
**Problem:** Access token expired or invalid

**Solution:**
1. Use **Refresh Token** endpoint, OR
2. **Login** again (tokens auto-saved)

---

### "Forbidden" Error (403)
**Problem:** User doesn't have permission

**Examples:**
- Rider trying to access driver-only endpoint
- Trying to accept someone else's ride

**Solution:**
- Check you're logged in as correct user type
- Verify resource ownership

---

### "Bad Request" - Validation Errors (400)
**Problem:** Data validation failed

**Common Issues:**
1. Password mismatch (password vs password_confirm)
2. Invalid email format
3. Driver balance insufficient
4. Required fields missing

**Solution:**
- Read error message in response
- Check request body matches expected format

---

### "Not Found" Error (404)
**Problem:** Resource doesn't exist

**Examples:**
- Using wrong ride_id
- Driver with that ID doesn't exist

**Solution:**
- Verify IDs are correct
- Use **List** endpoints to find valid IDs

---

### Variables Not Saving
**Problem:** Tokens not appearing in environment

**Solution:**
1. Check **Tests** tab in request
2. Verify environment is selected (top right)
3. Manually add variables:
   - Click eye icon → Edit
   - Add `access_token`, `refresh_token`, etc.

---

### Email Not Sending (OTP)
**Problem:** OTP emails not arriving

**Solution:**
1. Check `.env` file has correct email settings
2. For Gmail, use **App Password** (not regular password)
3. Check spam folder
4. For testing: Use console email backend in `settings.py`:
   ```python
   EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
   ```

---

## 💡 Pro Tips

### 1. Save Multiple Environments
Create separate environments for:
- Development (localhost)
- Staging
- Production

### 2. Use Pre-request Scripts
Add common logic before requests:
```javascript
// Auto-refresh token if expired
if (pm.environment.get("token_expiry") < Date.now()) {
    // Refresh token logic
}
```

### 3. Collection Variables vs Environment
- **Collection Variables:** Shared across all environments
- **Environment Variables:** Specific to each environment

### 4. Organize with Folders
Create additional folders for:
- Happy paths
- Error cases
- Integration tests

### 5. Use Test Scripts
Validate responses automatically:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has access token", function () {
    pm.expect(pm.response.json()).to.have.property('tokens');
});
```

---

## 🎓 Advanced Features

### 1. Running Collection with Newman
Run entire collection from command line:
```bash
npm install -g newman
newman run Rideshare_API.postman_collection.json -e your-environment.json
```

### 2. Automated Testing
Create test suites with assertions:
```javascript
pm.test("Driver balance increased", function () {
    const balance = pm.response.json().current_balance;
    pm.expect(parseFloat(balance)).to.be.above(100);
});
```

### 3. Mock Servers
Create mock responses for frontend development without backend.

---

## 📖 API Endpoint Reference

### Authentication
- `POST /api/register/driver/` - Register driver
- `POST /api/register/rider/` - Register rider
- `POST /api/login/` - Login
- `POST /api/logout/` - Logout
- `POST /api/token/refresh/` - Refresh access token

### User Profile
- `GET /api/user/me/` - Get current user
- `PATCH /api/user/profile/` - Update profile
- `POST /api/user/password-change/request/` - Request password change OTP
- `POST /api/user/password-change/verify/` - Verify OTP and change password

### Driver
- `GET /api/driver/profile/` - Get driver profile
- `PATCH /api/driver/profile/` - Update driver profile
- `POST /api/driver/recharge/` - Recharge balance
- `GET /api/drivers/` - List all drivers (with filters)
- `GET /api/drivers/{id}/` - Get specific driver details

### Rides
- `POST /api/rides/request/` - Request ride (rider)
- `POST /api/rides/{id}/accept/` - Accept ride (driver)
- `POST /api/rides/{id}/reject/` - Reject with counter price (driver)
- `POST /api/rides/{id}/rerequest/` - Re-request at counter price (rider)

### WebSocket
- `ws://localhost:8000/ws/notifications/?token=XXX` - Ride notifications
- `ws://localhost:8000/ws/location/?token=XXX` - Location tracking

---

## 📞 Need Help?

1. Check error response message
2. Review this guide
3. Check Django server logs
4. Verify `.env` configuration
5. Test WebSocket with HTML pages
6. Check browser console (F12) for WebSocket errors

---

## ✅ Checklist Before Testing

- [ ] Django server running (`python manage.py runserver`)
- [ ] Database migrated (`python manage.py migrate`)
- [ ] `.env` file configured (for email)
- [ ] Vehicle types created in database (for driver registration)
- [ ] Postman collection imported
- [ ] Environment variables visible (eye icon)
- [ ] WebSocket test pages ready (if testing real-time features)

---

**Happy Testing! 🚀**
