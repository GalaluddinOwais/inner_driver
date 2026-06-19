# Testing Ride Notifications via WebSocket (Postman)

## TL;DR — How do drivers find ride requests?

**Push, not pull.** There is **no REST endpoint** for a driver to list incoming ride
requests. When a rider calls `POST /api/rides/request/`, the server pushes a
`ride_requested` message to that specific driver over a WebSocket. The driver only
receives it **if they are connected to the notifications socket at that moment**.

> ✅ Catch-up: if the driver wasn't connected when a request arrived, they can poll
> `GET /api/rides/?status=pending` to retrieve pending requests. The WebSocket is the
> real-time path; this REST endpoint is the fallback.

---

## WebSocket endpoints

The server runs on ASGI (Daphne) — `python manage.py runserver` already serves
WebSockets. The channel layer is in-memory, so it works on a single process out of the box.

| Endpoint | Who | Purpose |
|---|---|---|
| `ws://127.0.0.1:8000/ws/notifications/?token=<ACCESS_TOKEN>` | driver & rider | Ride events: `ride_requested`, `ride_accepted`, `ride_rejected`, `ride_rerequested` |
| `ws://127.0.0.1:8000/ws/location/?token=<ACCESS_TOKEN>` | driver sends GPS, rider receives | Live driver location |

**Auth is via the `token` query parameter** (the JWT access token), *not* an
`Authorization` header. No token, or a bad/expired token → the connection is closed
immediately.

---

## Can you experience this in Postman?

**Yes.** Postman has native WebSocket support, but WebSocket requests are **not** stored
inside a `.postman_collection.json` file — Postman keeps them separately. So they can't
be bundled into `InnerDriver_API.postman_collection.json`. You add them by hand (2 clicks),
as below.

> 💡 Easier alternative: the repo already ships ready-made HTML test pages in
> [`WebSocket_Test_Pages/`](WebSocket_Test_Pages/) — `ride_notifications_tester.html` does
> exactly this with a UI. Open it in a browser, paste a token, connect. Use Postman only
> for the REST calls that trigger the events. See that folder's `README.md`.

---

## Step-by-step: see a `ride_requested` push live in Postman

You need **two actors**: a driver (the WS listener) and a rider (who triggers the request).

### 0. Prep the data (REST, in the Postman collection)
1. **Vehicle Types → List Vehicle Types** (public) — grab a `vehicle_type_id`.
2. **Register Driver**, then **Register Rider** (or Login as each). Keep both access tokens.
3. As the driver: **Driver → Recharge Balance** (e.g. 100), then
   **Driver → Update Driver Profile** with `{"is_available": true}`.
   - A driver must be *available* **and** have balance ≥ `price_per_trip` for a rider to
     request them — otherwise the request is rejected at validation.

### 1. Open a WebSocket connection as the DRIVER
1. In Postman: **New → WebSocket Request**.
2. URL:
   ```
   ws://127.0.0.1:8000/ws/notifications/?token=<DRIVER_ACCESS_TOKEN>
   ```
   Paste the driver's access token in place of `<DRIVER_ACCESS_TOKEN>`.
3. Click **Connect**. Status should go green / "Connected". (If it closes instantly, the
   token is missing, malformed, or expired — tokens last ~1 hour.)
4. Leave this tab open and watching the **Messages** pane.

### 2. Trigger the request as the RIDER (REST)
In the collection, **Rider → Request Ride**, with the rider's token, body:
```json
{
    "driver_id": <DRIVER_USER_ID>,
    "price": 50.00,
    "pickup_location": "123 Main St",
    "dropoff_location": "456 Market Ave"
}
```
> `driver_id` is the driver's **user id** (the primary key shown as `user` in the drivers
> list / as `id` in the registration response).

### 3. Watch the push arrive
The driver's WebSocket tab receives, in real time:
```json
{
    "type": "ride_requested",
    "message": "New ride request from Jane Smith",
    "ride": {
        "id": 1,
        "status": "pending",
        "price": "50.00",
        "pickup_location": "123 Main St",
        "dropoff_location": "456 Market Ave",
        "rejection_price": null,
        "...": "..."
    }
}
```
Note the `ride.id` — use it for the accept/reject REST calls.

### 4. Complete the loop (optional)
- Connect a **second** WebSocket tab as the **RIDER** (same URL, rider token).
- Driver calls **Driver → Accept Ride** (`/api/rides/<ride_id>/accept/`) → the **rider's**
  socket gets a `ride_accepted` push.
- Or **Reject Ride** with a `rejection_price` → rider gets `ride_rejected` →
  **Rider → Re-request Ride** → driver gets `ride_rerequested`.

---

## Event reference

| Event `type` | Sent to | Triggered by (REST) |
|---|---|---|
| `ride_requested` | driver | `POST /api/rides/request/` |
| `ride_accepted` | rider | `POST /api/rides/<id>/accept/` |
| `ride_rejected` | rider | `POST /api/rides/<id>/reject/` |
| `ride_rerequested` | driver | `POST /api/rides/<id>/rerequest/` |

The notifications socket is **receive-only** for clients — sending messages into it does
nothing (`receive()` is a no-op). It's purely a server→client push channel.

---

## Troubleshooting

- **Connection closes immediately** → missing/invalid/expired `token` query param. Re-login
  for a fresh access token; ensure no spaces; it should start with `eyJ...`.
- **Connected but no message arrives** → the driver wasn't available / underfunded (the
  request never validated), or you used the wrong `driver_id`, or the listening token
  belongs to a different user than the `driver_id` you requested.
- **Use `ws://` not `wss://`** for local testing.
- For the location socket and richer scenarios, see
  [`WebSocket_Test_Pages/README.md`](WebSocket_Test_Pages/README.md).
