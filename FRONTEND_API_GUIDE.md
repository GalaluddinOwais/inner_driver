# Inner Driver — Mobile Frontend & API Integration Guide

Two **separate React Native (Expo)** apps consume the Django REST API:
- **Rider app** — browse/filter drivers, request a ride (map pickup/dropoff + price), wait inline.
- **Driver app** — go available, receive ride requests live, accept/reject.

The Django backend is **API-only and unchanged**. This document is the contract between
the apps and the API.

---

## 0. Stack & prerequisites

You have **Node.js** ✅ — that's the toolchain Expo runs on. Per app:

```bash
npx create-expo-app inner-driver-rider     # rider app
npx create-expo-app inner-driver-driver    # driver app
```

Install **Expo Go** on your phone (Play Store / App Store) to run via QR code — no Android
Studio / Xcode needed to start.

Shared dependencies (install in each app):

```bash
npx expo install axios expo-secure-store
# Rider app also needs the map picker:
npx expo install react-native-maps expo-location
```

> **Important — local dev networking:** a phone running Expo Go **cannot reach
> `127.0.0.1`** (that's the phone itself). Use your computer's **LAN IP**
> (e.g. `http://192.168.1.20:8000`). Find it with `ipconfig` (Windows). Run the server
> bound to all interfaces: `python manage.py runserver 0.0.0.0:8000`.

---

## 1. Configuration

```js
// config.js  (both apps)
export const HOST = "192.168.1.20:8000";        // ← your machine's LAN IP
export const API_BASE = `http://${HOST}/api`;
export const WS_BASE  = `ws://${HOST}`;
```

---

## 2. Auth flow (both apps)

The API uses **JWT**. Login/registration return `{ access, refresh }`. Send
`Authorization: Bearer <access>` on protected calls. Access tokens expire (~1h) → refresh
with the refresh token.

### Token storage (secure)
```js
// auth/tokens.js
import * as SecureStore from "expo-secure-store";

export const saveTokens = async ({ access, refresh }) => {
  await SecureStore.setItemAsync("access", access);
  if (refresh) await SecureStore.setItemAsync("refresh", refresh);
};
export const getAccess  = () => SecureStore.getItemAsync("access");
export const getRefresh = () => SecureStore.getItemAsync("refresh");
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync("access");
  await SecureStore.deleteItemAsync("refresh");
};
```

### Axios client with auto-refresh interceptor
```js
// api/client.js
import axios from "axios";
import { API_BASE } from "../config";
import { getAccess, getRefresh, saveTokens, clearTokens } from "../auth/tokens";

export const api = axios.create({ baseURL: API_BASE });

// attach access token
api.interceptors.request.use(async (cfg) => {
  const access = await getAccess();
  if (access) cfg.headers.Authorization = `Bearer ${access}`;
  return cfg;
});

// on 401, try refresh once, then retry
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      try {
        refreshing = refreshing ?? refreshAccess();
        const newAccess = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        await clearTokens();           // refresh failed → force re-login
        throw e;
      }
    }
    throw error;
  }
);

async function refreshAccess() {
  const refresh = await getRefresh();
  const { data } = await axios.post(`${API_BASE}/token/refresh/`, { refresh });
  await saveTokens({ access: data.access });
  return data.access;
}
```

### Endpoints
| Action | Method & path | Body | Returns |
|---|---|---|---|
| Login | `POST /login/` | `{ email, password }` | `{ tokens: { access, refresh } }` |
| Refresh | `POST /token/refresh/` | `{ refresh }` | `{ access }` |
| Logout | `POST /logout/` (auth) | `{ refresh }` | blacklists token |
| Current user | `GET /user/me/` (auth) | — | user + profile (incl. `user_type`) |

> After login, call `GET /user/me/` once and read `user_type` (`"driver"` / `"rider"`) to
> confirm the account matches the app. The rider app should reject a driver login and vice
> versa (or just route accordingly).

---

## 3. Registration

### Rider app — Sign Up
`POST /register/rider/`
```json
{ "email": "...", "password": "...", "password_confirm": "...",
  "full_name": "...", "phone_number": "+1..." }
```
Returns user + tokens (auto-logs them in). An OTP email is sent (not required to use the app).

### Driver app — Sign Up
First fetch vehicle types (**public, no auth**) to populate a dropdown:
`GET /vehicle-types/` → `[{ id, brand, model }, ...]`

Then `POST /register/driver/`
```json
{ "email": "...", "password": "...", "password_confirm": "...",
  "full_name": "...", "phone_number": "+1...",
  "vehicle_type_id": 1, "vehicle_color": "black" }
```
`vehicle_color` must be one of: `black, white, silver, gray, red, blue, green, yellow, other`.

---

## 4. RIDER APP

### Screen A — Login (with "Sign up" link → rider registration)

### Screen B — Main (driver list + filter)  ·  *the only real screen*

**List available drivers:**
`GET /drivers/?is_available=true&ordering=-rating`

Filters you can expose (all query params):
| Filter | Param example |
|---|---|
| Vehicle type id | `vehicle_type=1` |
| Brand contains | `vehicle_type__brand__icontains=Toyota` |
| Min rating | `rating__gte=4.5` |
| Available only | `is_available=true` |
| Search name/email | `search=jane` |
| Order | `ordering=-rating` or `total_rides` |

Each driver card shows: `full_name`, `vehicle_brand`/`vehicle_model`, `vehicle_color`,
`rating`, `price_per_trip`. The card's id for requesting is the **`user`** field
(that's the driver's user id = the `driver_id` you send).

> Only render cards where `is_available === true` as tappable.

### Offer popup (modal) — map picker + price
On tapping an available driver:
1. `react-native-maps` + `expo-location` → let the rider drop **pickup** and **dropoff** pins.
2. Convert each coordinate to a string for the API (it stores text):
   - simplest: `pickup_location = `${lat},${lng}``
   - nicer: reverse-geocode with `Location.reverseGeocodeAsync({latitude, longitude})`
     → build `"123 Main St, City"`.
3. Price input (number).

**Submit:** `POST /rides/request/`
```json
{ "driver_id": 7, "price": 50.00,
  "pickup_location": "40.71,-74.00", "dropoff_location": "40.73,-73.99" }
```
Validation the API enforces (handle the 400s): driver must exist, be `is_available`, and
have balance ≥ `price_per_trip`. Response includes `ride.id` — **keep it**.

### Wait inline (same screen) — via WebSocket
Open `ws://HOST/ws/notifications/?token=<access>` (see §6). After submitting, show a banner:
- `ride_accepted` → "Accepted by {driver}! 🎉"
- `ride_rejected` → "Counter offer: ${rejection_price}" + **[Accept counter]** button →
  `POST /rides/<rideId>/rerequest/` (no body) → status goes back to pending, wait again.

---

## 5. DRIVER APP

### Screen A — Login (with "Sign up" → driver registration w/ vehicle dropdown)

### Screen B — Main  ·  *the only real screen* (WebSocket connected here)

**Top bar:**
- **Availability toggle** → `PATCH /driver/profile/` `{ "is_available": true|false }`
  - ⚠️ The API rejects going available if `current_balance < price_per_trip`
    (returns 400 with a message). Show it.
- **Balance** → from `GET /driver/profile/` (`current_balance`).
- **Recharge** button → `POST /driver/recharge/` `{ "amount": 100.00 }`.

**Incoming requests (live, pushed):**
Connect `ws://HOST/ws/notifications/?token=<access>`. On `ride_requested` events, prepend a
card with `ride.id`, rider name (from `message`), `price`, pickup/dropoff. Buttons:
- **Accept** → `POST /rides/<id>/accept/` (no body). Sets driver unavailable server-side.
- **Reject + counter** → `POST /rides/<id>/reject/` `{ "rejection_price": 75.00 }`.

> ℹ️ **WebSocket + polling fallback:** the WebSocket is the real-time path. Because a socket
> can drop (token expiry, backgrounded app, network), **on screen mount also call**
> `GET /rides/?status=pending` to load any requests that arrived while disconnected, then
> merge live `ride_requested` events on top. This closes the "missed request" gap.

---

## 6. WebSocket — ride notifications (both apps)

Receive-only, server→client. Auth via **`token` query param** (the JWT access token), not a
header.

```js
// ws/notifications.js
import { WS_BASE } from "../config";
import { getAccess } from "../auth/tokens";

export async function connectNotifications(onEvent) {
  const token = await getAccess();
  const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
  ws.onmessage = (e) => onEvent(JSON.parse(e.data));   // { type, message, ride }
  ws.onclose = () => { /* optional: reconnect with backoff */ };
  return ws;   // remember to ws.close() on screen unmount / logout
}
```

Event `type` values:
| type | received by | meaning |
|---|---|---|
| `ride_requested` | driver | new request (has `ride.id`, price, locations) |
| `ride_accepted` | rider | driver accepted |
| `ride_rejected` | rider | driver countered (`ride.rejection_price`) |
| `ride_rerequested` | driver | rider accepted the counter |

Each message: `{ "type": "...", "message": "human text", "ride": { ...RideSerializer } }`.

**Reconnect tip:** access tokens expire; on `onclose`, refresh the token (§2) and reopen.

---

## 7. Suggested navigation (minimal, as requested)

Each app = a tiny stack, effectively one main screen:

```
Rider app:   Login → SignUp(modal) → Home(list+filter)
                                        └─ OfferModal (map + price)
                                        └─ status banner (inline, WS)

Driver app:  Login → SignUp(modal) → Home(toggle+balance+requests, WS)
```

No bottom tab bar needed. Put **logout** + profile behind a small header icon.

---

## 8. Endpoint cheat-sheet

| App / area | Method | Path | Auth |
|---|---|---|---|
| Vehicle types (driver signup) | GET | `/vehicle-types/` | public |
| Rider signup | POST | `/register/rider/` | public |
| Driver signup | POST | `/register/driver/` | public |
| Login | POST | `/login/` | public |
| Refresh | POST | `/token/refresh/` | public |
| Me | GET | `/user/me/` | auth |
| Logout | POST | `/logout/` | auth |
| My rides (driver: incoming / rider: own) | GET | `/rides/?status=` | auth |
| List/filter drivers | GET | `/drivers/` | auth |
| Driver detail | GET | `/drivers/{id}/` | auth |
| Request ride | POST | `/rides/request/` | rider |
| Re-request (accept counter) | POST | `/rides/{id}/rerequest/` | rider |
| Accept ride | POST | `/rides/{id}/accept/` | driver |
| Reject ride | POST | `/rides/{id}/reject/` | driver |
| Driver profile (get/update) | GET/PATCH | `/driver/profile/` | driver |
| Recharge | POST | `/driver/recharge/` | driver |
| Update user profile | PATCH | `/user/profile/` | auth |
| Password change (request/verify) | POST | `/user/password-change/{request,verify}/` | auth |
| Notifications WS | WS | `/ws/notifications/?token=` | token query |

All request/response bodies are mirrored in `InnerDriver_API.postman_collection.json` — test
each call in Postman first, then wire it into the app.
```
