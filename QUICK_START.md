# 🚀 Quick Start Guide

## Virtual Environment Setup

### Option 1: Using PowerShell (Recommended)
```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Option 2: Using Command Prompt
```cmd
# Activate virtual environment
venv\Scripts\activate.bat

# Or simply double-click:
activate_venv.bat
```

### Option 3: Quick Server Start
```cmd
# Just double-click this file:
RUN_SERVER.bat
```

---

## 🔧 Common Commands

### Start Development Server
```bash
python manage.py runserver
```
Server will be at: http://localhost:8000

### Populate Fake Data
```bash
python manage.py populate_fake_data
```

### Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

### Run Migrations
```bash
python manage.py migrate
```

### Create New Migration
```bash
python manage.py makemigrations
```

---

## 👤 Test Accounts (Already Created)

### Drivers
- **galaluddinowais@gmail.com** | Password: `123`
- **driver2@example.com** | Password: `123`
- **driver3@example.com** | Password: `123`

### Rider
- **leonilandrismessi@gmail.com** | Password: `123`

---

## 📍 Important URLs

- **API Base:** http://localhost:8000/api/
- **Admin Panel:** http://localhost:8000/admin/
- **WebSocket Notifications:** ws://localhost:8000/ws/notifications/?token=XXX
- **WebSocket Location:** ws://localhost:8000/ws/location/?token=XXX

---

## 🧪 Quick Test Flow

1. **Start Server:**
   ```bash
   python manage.py runserver
   ```

2. **Test Login (Postman):**
   ```json
   POST http://localhost:8000/api/login/
   {
       "email": "galaluddinowais@gmail.com",
       "password": "123"
   }
   ```

3. **Copy Access Token from response**

4. **Test Authenticated Endpoint:**
   ```
   GET http://localhost:8000/api/user/me/
   Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
   ```

---

## 📦 Project Structure

```
New folder/
├── api/                          # Main Django app
│   ├── models.py                # Database models
│   ├── views.py                 # API endpoints
│   ├── serializers.py           # Data serializers
│   ├── urls.py                  # URL routing
│   ├── consumers.py             # WebSocket handlers
│   └── management/
│       └── commands/
│           └── populate_fake_data.py
├── rideshare_project/           # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── asgi.py                  # ASGI config for WebSocket
├── WebSocket_Test_Pages/       # HTML test pages
│   ├── driver_location_sender.html
│   ├── rider_location_receiver.html
│   └── ride_notifications_tester.html
├── venv/                        # Virtual environment
├── db.sqlite3                   # SQLite database
├── manage.py                    # Django management script
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
├── Rideshare_API.postman_collection.json  # Postman collection
└── Documentation files (.md)
```

---

## 🐛 Troubleshooting

### Virtual Environment Not Activating (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1
```

### Port Already in Use
```bash
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
python manage.py runserver 8001
```

### Database Locked
```bash
# Close all connections and restart server
# Or delete and recreate database:
del db.sqlite3
python manage.py migrate
python manage.py populate_fake_data
```

### Module Not Found
```bash
# Make sure virtual environment is activated
# Then reinstall dependencies:
pip install -r requirements.txt
```

---

## ✅ Pre-flight Checklist

Before testing:
- [ ] Virtual environment activated
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Migrations applied: `python manage.py migrate`
- [ ] Fake data populated: `python manage.py populate_fake_data`
- [ ] `.env` file created (optional, for email)
- [ ] Server running: `python manage.py runserver`

---

## 🎯 Next Steps

1. ✅ Virtual environment created
2. ✅ Dependencies installed
3. ✅ Fake data populated
4. **→ Start server:** Double-click `RUN_SERVER.bat` or run `python manage.py runserver`
5. **→ Test API:** Import Postman collection and start testing!
6. **→ Test WebSocket:** Open HTML pages in `WebSocket_Test_Pages/`

---

## 📚 Documentation

- **START_HERE.html** - Visual overview (open in browser)
- **API_TESTING_COMPLETE_GUIDE.md** - Full testing guide
- **POSTMAN_GUIDE.md** - Postman usage
- **FAKE_DATA_INFO.md** - Test accounts reference
- **OTP_AND_PROFILE_README.md** - Email/OTP features

---

**You're all set! Start the server and begin testing! 🚀**
