# 🚗 Rideshare API - Testing Resources

Complete testing resources for the Rideshare Django REST API with WebSocket support.

---

## 📁 What You Have

### 1. **Postman Collection**
📄 `Rideshare_API.postman_collection.json`

Complete collection with all 16 REST API endpoints:
- ✅ Authentication (register, login, logout, refresh)
- ✅ User profile management
- ✅ Driver operations (balance, availability, profile)
- ✅ Ride management (request, accept, reject, negotiate)
- ✅ Auto-saved tokens and IDs
- ✅ Ready-to-use request bodies

### 2. **WebSocket Test Pages**
📁 `WebSocket_Test_Pages/`

Interactive HTML pages for testing real-time features:
- 🚗 **driver_location_sender.html** - Send GPS location updates
- 📍 **rider_location_receiver.html** - Receive driver locations
- 🔔 **ride_notifications_tester.html** - Test ride notifications

### 3. **Documentation**
- 📖 **API_TESTING_COMPLETE_GUIDE.md** - Comprehensive testing guide (START HERE!)
- 📖 **POSTMAN_GUIDE.md** - Detailed Postman usage
- 📖 **OTP_AND_PROFILE_README.md** - OTP and profile features
- 📖 **WebSocket_Test_Pages/README.md** - WebSocket testing

---

## 🚀 Quick Start (3 Steps)

### Step 1: Import to Postman
1. Open Postman
2. Click **Import**
3. Select `Rideshare_API.postman_collection.json`

### Step 2: Start Server
```bash
cd "c:\Users\galaluddin.o\Desktop\New folder"
python manage.py runserver
```

### Step 3: Test Your First Endpoint
1. Postman → `1. Authentication` → `Register Driver`
2. Click **Send**
3. ✅ Done! Token auto-saved, ready to test other endpoints

---

## 📚 Documentation Overview

### For Quick Testing
**Read:** `API_TESTING_COMPLETE_GUIDE.md`
- All test cases with step-by-step instructions
- Complete workflows
- Error scenarios
- Integration tests

### For Postman Mastery
**Read:** `POSTMAN_GUIDE.md`
- Environment setup
- Variable management
- Advanced features
- Troubleshooting

### For Real-time Features
**Read:** `WebSocket_Test_Pages/README.md`
- How to use HTML test pages
- WebSocket connection guide
- Testing scenarios
- Message formats

### For OTP & Profiles
**Read:** `OTP_AND_PROFILE_README.md`
- Email configuration
- OTP workflow
- Password change
- Profile updates

---

## 🎯 What Can You Test?

### REST API (16 Endpoints)
✅ User registration (driver/rider) with OTP emails
✅ Login & JWT authentication
✅ Token refresh & logout
✅ User profile updates
✅ Password change with OTP verification
✅ Driver profile management
✅ Driver balance recharge
✅ List & filter available drivers
✅ Ride requests with pricing
✅ Ride acceptance/rejection
✅ Counter-pricing negotiation
✅ Ride re-requests

### WebSocket Real-time Features
✅ Ride notifications (request, accept, reject)
✅ Driver location broadcasting
✅ Rider location tracking
✅ Multiple concurrent connections

---

## 🧪 Testing Scenarios Included

### Basic Workflows
- User registration → Login → Profile update
- Driver setup → Set available → Receive rides
- Rider request → Driver accept → Ride complete

### Advanced Workflows
- Price negotiation (reject → counter price → re-request)
- Real-time location tracking with WebSocket
- Live ride notifications
- Balance management (recharge, deduction on availability)

### Error Handling
- Insufficient balance prevention
- Expired token handling
- Invalid OTP verification
- Permission restrictions
- Unavailable driver checks

---

## 📊 API Endpoints Reference

| Category | Count | Examples |
|----------|-------|----------|
| Authentication | 5 | Register, Login, Logout, Refresh |
| User Profile | 4 | Get profile, Update, Password change |
| Driver | 5 | Profile, Recharge, List, Filter, Detail |
| Rides | 4 | Request, Accept, Reject, Re-request |
| **Total REST** | **16** | - |
| WebSocket | 2 | Notifications, Location |

---

## 🔑 Key Features

### Automatic Token Management
- Tokens auto-saved after login/register
- No manual copy-paste needed
- Works across all authenticated endpoints

### Pre-configured Requests
- All request bodies ready to use
- Sample data included
- Just click Send!

### Test Scripts
- Auto-save tokens, user IDs, ride IDs
- Environment variable management
- Response validation

### WebSocket Testing
- Beautiful, interactive HTML pages
- No coding required
- Real-time visual feedback
- Connection logs

---

## 🎓 Learning Path

### Beginner (1 hour)
1. Import Postman collection
2. Test basic auth (register, login)
3. Try one ride request → accept flow
4. **You'll understand:** Basic API usage

### Intermediate (2-3 hours)
1. Complete all Postman endpoints
2. Test filtering & searching drivers
3. Try error scenarios (insufficient balance, etc.)
4. Test OTP email flow
5. **You'll understand:** All REST API features

### Advanced (4-5 hours)
1. Complete all REST tests
2. Test WebSocket real-time features
3. Run integration scenarios
4. Test concurrent operations
5. **You'll understand:** Full system including real-time

---

## 💡 Pro Tips

1. **Read API_TESTING_COMPLETE_GUIDE.md first** - Comprehensive test cases
2. **Use WebSocket pages** - Visual testing is easier than command-line
3. **Check Django console** - See OTP codes when using console email backend
4. **Keep both browsers open** - Test driver and rider simultaneously
5. **Use Postman Runner** - Automate repetitive tests

---

## 🐛 Common Issues

### "Connection refused"
→ Django server not running. Run: `python manage.py runserver`

### "Unauthorized 401"
→ Token expired. Use **Refresh Token** or **Login** again

### "Forbidden 403"
→ Wrong user type. Check you're logged in as driver/rider correctly

### "WebSocket closed immediately"
→ Invalid token or ASGI server not running

### Email not sending
→ Configure `.env` or use console backend for testing

**See POSTMAN_GUIDE.md for detailed troubleshooting!**

---

## ✅ Pre-flight Checklist

Before starting tests:

- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Database migrated (`python manage.py migrate`)
- [ ] `.env` file created (copy from `.env.example`)
- [ ] Django server running (`python manage.py runserver`)
- [ ] Postman collection imported
- [ ] At least one VehicleType exists in database

**To create VehicleType:**
```bash
python manage.py shell
>>> from api.models import VehicleType
>>> VehicleType.objects.create(brand="Toyota", model="Camry")
>>> VehicleType.objects.create(brand="Honda", model="Accord")
>>> exit()
```

---

## 📖 Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| **API_TESTING_COMPLETE_GUIDE.md** | Complete testing guide | First time testing |
| **POSTMAN_GUIDE.md** | Postman specifics | When using Postman |
| **OTP_AND_PROFILE_README.md** | Email & OTP features | Testing emails/OTP |
| **WebSocket_Test_Pages/README.md** | WebSocket testing | Testing real-time features |

---

## 🚀 Start Testing Now!

### Option A: Quick Test (5 min)
```
1. Import Postman collection
2. Start server
3. Register Driver → Send
4. Done! ✅
```

### Option B: Full Workflow (15 min)
```
1. Follow "Quick Start" section above
2. Create driver + rider
3. Test complete ride flow
4. Test WebSocket notifications
5. Done! ✅
```

### Option C: Comprehensive (1 hour)
```
1. Read API_TESTING_COMPLETE_GUIDE.md
2. Test all 16 REST endpoints
3. Test both WebSocket features
4. Try error scenarios
5. Master the API! ✅
```

---

## 📞 Need Help?

1. **General Issues:** Check `API_TESTING_COMPLETE_GUIDE.md`
2. **Postman Questions:** Check `POSTMAN_GUIDE.md`
3. **WebSocket Problems:** Check `WebSocket_Test_Pages/README.md`
4. **OTP/Email Issues:** Check `OTP_AND_PROFILE_README.md`
5. **Still stuck?** Check Django server logs

---

## 🎉 Ready to Go!

You have everything you need:
- ✅ Complete Postman collection
- ✅ Interactive WebSocket test pages
- ✅ Comprehensive documentation
- ✅ Step-by-step test cases
- ✅ Error scenarios
- ✅ Integration workflows

**Pick a guide and start testing!** 🚀

---

**Happy Testing!**
