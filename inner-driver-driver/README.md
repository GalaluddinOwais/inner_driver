# Inner Driver — Driver App (Expo / React Native)

The driver-side mobile app. Drivers log in, go online, and accept/counter incoming ride
requests in real time. Talks to the Django REST API in the parent folder.

## Screens
- **Login** — driver login (rejects non-driver accounts), link to Sign up.
- **Sign up** — driver registration; vehicle type pulled from the public
  `GET /api/vehicle-types/`, color picker.
- **Home** — the main screen:
  - Availability toggle → `PATCH /api/driver/profile/` (API blocks going online if
    balance < price_per_trip).
  - Balance + Recharge → `POST /api/driver/recharge/`.
  - Live incoming requests via WebSocket `ws/notifications/`, **plus** a poll of
    `GET /api/rides/?status=pending` on mount / pull-to-refresh so nothing is missed
    while the socket is down.
  - Accept → `POST /api/rides/{id}/accept/` · Counter → `POST /api/rides/{id}/reject/`.

## Run it

1. **Point the app at your backend.** Edit [`src/config.js`](src/config.js) and set `HOST`
   to your computer's **LAN IP** + port (e.g. `192.168.1.20:8000`). A phone on Expo Go
   cannot reach `127.0.0.1`. Find your IP with `ipconfig` (Windows).

2. **Start Django on all interfaces** (from the project root, venv active):
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   (Optional) seed data: `python manage.py populate_fake_data`
   Test driver login: `galaluddinowais@gmail.com` / `123`

3. **Start the app:**
   ```bash
   cd inner-driver-driver
   npm install        # first time only
   npm start
   ```
   Scan the QR code with **Expo Go** (Android/iOS). Phone and PC must be on the same Wi‑Fi.

## Notes
- Auth is JWT; tokens are stored with `expo-secure-store` and auto-refreshed on 401
  ([`src/api/client.js`](src/api/client.js)).
- The notifications socket is receive-only and auto-reconnects with backoff
  ([`src/ws/notifications.js`](src/ws/notifications.js)).
- Recharge/counter prompts use a cross-platform modal (not `Alert.prompt`, which is iOS-only).

## Project layout
```
App.js                     navigation + auth bootstrap
src/config.js              HOST / API_BASE / WS_BASE  ← edit this
src/auth/tokens.js         secure token storage
src/api/client.js          axios + refresh interceptor
src/api/driver.js          endpoint wrappers
src/ws/notifications.js    ride-notification socket
src/screens/               Login / SignUp / Home / PromptModal
```
