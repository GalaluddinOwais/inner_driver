# Fake Data Populated

## 📊 Database Summary

- **Vehicle Types:** 5
- **Drivers:** 3
- **Riders:** 1
- **Rides:** 3 (pending, accepted, rejected)

---

## 👤 User Credentials

### Drivers (3 total)

#### Driver 1: Galaluddin Owais
```
Email: galaluddinowais@gmail.com
Password: 123
Vehicle: Toyota Camry (black)
Balance: $500
Available: Yes
Rating: 4.5 stars
```

#### Driver 2: Ahmed Hassan
```
Email: driver2@example.com
Password: 123
Vehicle: Honda Accord (white)
Balance: $300
Available: Yes
Rating: 4.5 stars
```

#### Driver 3: Mohamed Ali
```
Email: driver3@example.com
Password: 123
Vehicle: Toyota Corolla (silver)
Balance: $400
Available: No
Rating: 4.5 stars
```

### Rider (1 total)

#### Rider 1: Leonil Andris Messi
```
Email: leonilandrismessi@gmail.com
Password: 123
```

---

## 🚗 Sample Rides Created

### Ride 1 (Pending)
- **Rider:** Leonil Andris Messi
- **Driver:** Galaluddin Owais
- **Pickup:** 123 Main St, Cairo
- **Dropoff:** 456 Nile Ave, Cairo
- **Price:** $50.00
- **Status:** Pending

### Ride 2 (Accepted)
- **Rider:** Leonil Andris Messi
- **Driver:** Ahmed Hassan
- **Pickup:** 789 Tahrir Square, Cairo
- **Dropoff:** 321 Zamalek St, Cairo
- **Price:** $75.00
- **Status:** Accepted

### Ride 3 (Rejected with Counter Price)
- **Rider:** Leonil Andris Messi
- **Driver:** Mohamed Ali
- **Pickup:** 555 Pyramids Rd, Giza
- **Dropoff:** 888 Sphinx Ave, Giza
- **Price:** $60.00
- **Rejection Price:** $80.00
- **Status:** Rejected

---

## 🚀 Quick Test Login

### Test as Driver (Galaluddin)
```json
POST /api/login/
{
    "email": "galaluddinowais@gmail.com",
    "password": "123"
}
```

### Test as Rider (Messi)
```json
POST /api/login/
{
    "email": "leonilandrismessi@gmail.com",
    "password": "123"
}
```

---

## 🔄 Re-populate Data

If you want to add more fake data or reset, run:

```bash
python manage.py populate_fake_data
```

**Note:** The command is safe to run multiple times - it checks for existing data and won't create duplicates.

---

## 🗑️ Clear All Data

To start fresh, you can:

1. **Delete database and recreate:**
   ```bash
   rm db.sqlite3
   python manage.py migrate
   python manage.py populate_fake_data
   ```

2. **Or use Django shell to delete specific data:**
   ```bash
   python manage.py shell
   >>> from api.models import User, Driver, Rider, Ride, VehicleType
   >>> Ride.objects.all().delete()
   >>> Driver.objects.all().delete()
   >>> Rider.objects.all().delete()
   >>> User.objects.filter(is_superuser=False).delete()
   >>> exit()
   ```

---

## 🎯 Testing Scenarios

### Scenario 1: Test Pending Ride
1. Login as **Galaluddin** (driver)
2. Use ride ID from the pending ride
3. Accept or reject the ride

### Scenario 2: Test Available Drivers
1. Login as **Messi** (rider)
2. List available drivers: `GET /api/drivers/?is_available=true`
3. Should see Galaluddin and Ahmed (Mohamed is unavailable)

### Scenario 3: Test Counter-Price Negotiation
1. Login as **Messi** (rider)
2. Find the rejected ride with counter price ($80)
3. Re-request at counter price: `POST /api/rides/{id}/rerequest/`

---

## 📝 Vehicle Types Available

1. Toyota Camry
2. Honda Accord
3. Toyota Corolla
4. BMW X5
5. Mercedes C-Class

Use these IDs when updating driver profiles or registering new drivers.

---

## ✅ Ready to Test!

All accounts are ready to use. Simply login with the credentials above and start testing the API!

**Pro Tip:** Use the Postman collection - it will auto-save tokens after login, so you can immediately test authenticated endpoints.
