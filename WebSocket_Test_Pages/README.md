# WebSocket Test Pages

This folder contains interactive HTML pages for testing WebSocket functionality in the Rideshare application.

## 📁 Files

### 1. **driver_location_sender.html**
Test page for drivers to send real-time location updates.

**Features:**
- Connect to location WebSocket as a driver
- Send manual location updates
- Simulate automatic movement (10 updates every 2 seconds)
- Real-time connection log
- Visual feedback for sent/received messages

**How to Use:**
1. Open the file in a web browser
2. Paste your **driver access token** (get it from login/register API)
3. Click "Connect to WebSocket"
4. Enter latitude/longitude or use default values
5. Click "Send Location" for manual update, or "Simulate Movement" for automatic updates

---

### 2. **rider_location_receiver.html**
Test page for riders to receive real-time driver location updates.

**Features:**
- Connect to location WebSocket as a rider
- Automatically receive location updates from tracked drivers
- Live location display with coordinates and timestamps
- Update counter
- Real-time connection log

**How to Use:**
1. **IMPORTANT:** You must have an active or pending ride first!
   - Use Postman to create a ride request as a rider
2. Open the file in a web browser
3. Paste your **rider access token**
4. Click "Connect to WebSocket"
5. You'll automatically receive location updates from the driver you have a ride with

**Note:** Riders only receive locations from drivers they have active/pending rides with.

---

### 3. **ride_notifications_tester.html**
Test page for both drivers and riders to receive real-time ride notifications.

**Features:**
- Connect as driver or rider
- Receive real-time notifications for:
  - Ride requests (drivers receive)
  - Ride acceptances (riders receive)
  - Ride rejections with counter prices (riders receive)
  - Ride re-requests (drivers receive)
- Beautiful notification cards with full ride details
- Notification counter
- Connection log

**How to Use:**
1. Open the file in a web browser
2. Paste your access token (driver or rider)
3. Click "Connect to WebSocket"
4. Use Postman to trigger ride events:
   - As rider: Request a ride → Driver will see notification
   - As driver: Accept/reject ride → Rider will see notification
5. Watch notifications appear in real-time!

---

## 🔧 Setup Instructions

### Prerequisites
1. Django server running on `http://localhost:8000`
2. Daphne ASGI server running (for WebSocket support)
3. Valid access tokens (from login/register endpoints)

### Running the Test Pages

1. **Start the Django server:**
   ```bash
   cd "c:\Users\galaluddin.o\Desktop\New folder"
   python manage.py runserver
   ```

2. **Open HTML files:**
   - Simply double-click any HTML file
   - Or right-click → Open with → Your browser

3. **Get Access Tokens:**
   - Use Postman collection to register/login
   - Copy the access token from the response
   - Paste into the test page

---

## 🧪 Testing Scenarios

### Scenario 1: Driver Location Broadcasting
**Participants:** 1 Driver, 1 Rider

1. **Driver:**
   - Login as driver via Postman
   - Open `driver_location_sender.html`
   - Connect with driver token
   - Click "Simulate Movement"

2. **Rider:**
   - Login as rider via Postman
   - Create a ride request to the driver (via Postman)
   - Open `rider_location_receiver.html`
   - Connect with rider token
   - Watch real-time location updates!

---

### Scenario 2: Ride Notifications Flow
**Participants:** 1 Driver, 1 Rider

1. **Both:**
   - Open `ride_notifications_tester.html` in separate browser windows
   - Connect with respective tokens

2. **Rider (via Postman):**
   - Request a ride to the driver
   - **Driver's page** will show "Ride Requested" notification

3. **Driver (via Postman):**
   - Accept the ride
   - **Rider's page** will show "Ride Accepted" notification

4. **Alternative - Rejection:**
   - Driver rejects with counter price
   - **Rider's page** shows "Ride Rejected" with counter price
   - Rider re-requests at counter price
   - **Driver's page** shows "Ride Re-requested"

---

### Scenario 3: Complete Workflow
**Full end-to-end test**

1. **Setup (Postman):**
   - Register driver and rider
   - Get both access tokens
   - Recharge driver balance
   - Set driver as available

2. **Connect WebSockets:**
   - Driver opens `driver_location_sender.html` + `ride_notifications_tester.html`
   - Rider opens `rider_location_receiver.html` + `ride_notifications_tester.html`
   - All connect with their tokens

3. **Ride Flow (Postman):**
   - Rider requests ride
   - Driver sees notification in ride_notifications_tester
   - Driver accepts ride via Postman
   - Rider sees acceptance notification
   - Driver starts sending location
   - Rider sees real-time location updates

---

## 🐛 Troubleshooting

### "WebSocket connection failed"
- ✅ Check Django server is running
- ✅ Verify you're using `ws://` not `wss://` for local testing
- ✅ Ensure ASGI server (Daphne) is running
- ✅ Check CORS settings in Django

### "Authentication failed / Connection closed immediately"
- ✅ Verify access token is valid and not expired
- ✅ Copy full token without extra spaces
- ✅ Token should start with `eyJ...`

### Rider not receiving location updates
- ✅ Ensure rider has an active or pending ride
- ✅ Check ride is with the driver sending locations
- ✅ Verify driver is connected and sending updates

### No notifications appearing
- ✅ Ensure WebSocket is connected (status shows green)
- ✅ Trigger events via Postman API
- ✅ Check connection log for errors
- ✅ Verify you're using correct user type (driver/rider)

---

## 📊 WebSocket Endpoints Reference

### Location Tracking
```
ws://localhost:8000/ws/location/?token=YOUR_ACCESS_TOKEN
```

**Driver sends:**
```json
{
    "type": "location_update",
    "latitude": 40.7128,
    "longitude": -74.0060
}
```

**Rider receives:**
```json
{
    "type": "location_update",
    "driver_id": 1,
    "latitude": "40.712800",
    "longitude": "-74.006000",
    "timestamp": "2025-01-15T10:30:00Z"
}
```

### Ride Notifications
```
ws://localhost:8000/ws/notifications/?token=YOUR_ACCESS_TOKEN
```

**Notification format:**
```json
{
    "type": "ride_requested",
    "message": "New ride request from Jane Rider",
    "ride": {
        "id": 1,
        "status": "pending",
        "price": "50.00",
        "pickup_location": "123 Main St",
        "dropoff_location": "456 Oak Ave",
        "rejection_price": null
    }
}
```

---

## 💡 Tips

1. **Multiple Tabs:** Open multiple test pages in different browser tabs to simulate multiple users
2. **Console Logs:** Open browser DevTools (F12) to see detailed WebSocket messages
3. **Token Expiry:** Access tokens expire after 1 hour - generate new ones if connection fails
4. **Real-time Testing:** Keep Postman collection open alongside test pages for quick API calls

---

## 🎨 Features of Test Pages

- ✅ Beautiful, modern UI with gradients
- ✅ Real-time connection status indicators
- ✅ Automatic token saving in environment
- ✅ Live message logs with color coding
- ✅ Visual feedback for all operations
- ✅ Error handling and validation
- ✅ Responsive design
- ✅ No external dependencies (pure HTML/CSS/JS)

---

## 📝 Notes

- These pages are for **testing only** - not production-ready
- All connections are to `localhost:8000` by default
- For production, replace WebSocket URLs with your server domain
- Consider using `wss://` (secure WebSocket) in production
