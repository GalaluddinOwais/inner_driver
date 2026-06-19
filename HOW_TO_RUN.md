adb reverse tcp:8000 tcp:8000 (+ 8081, 8082)
python manage.py runserver 0.0.0.0:8000 (root, venv active)
npx expo start --dev-client (in the app folder)

# How to Run — Inner Driver

The apps talk to the backend over a **USB tunnel** (`config.js` → `HOST = "localhost:8000"`).
Phone must be connected by **USB with Debugging enabled**.

---

## One-time setup (already done — skip unless on a fresh machine)

- **Firewall rule** (persistent — survives reboot, do NOT re-run each time).
  PowerShell **as Administrator**:
  ```powershell
  New-NetFirewallRule -DisplayName "Inner Driver Dev Ports" -Direction Inbound -Protocol TCP -LocalPort 8000,8081,8082 -Action Allow -Profile Private
  ```
- **Build the app once** (only the first time, or after adding a native package / changing app.json):
  ```powershell
  cd D:\Personal\inner_driver_app\inner-driver-driver
  npx expo run:android
  ```

---

## Every session — 3 terminals

### 1. USB tunnels  ⚠️ REQUIRED every time (they drop on unplug/reboot)
This is what makes `localhost:8000` reach the PC. Skipping this = "network failed".
```powershell
adb reverse tcp:8000 tcp:8000   # Django backend
adb reverse tcp:8081 tcp:8081   # rider Metro
adb reverse tcp:8082 tcp:8082   # driver Metro
```
(adb is at `C:\Users\galaluddin.o\AppData\Local\Android\Sdk\platform-tools\adb.exe` if not on PATH)

### 2. Backend (Django) — from the ROOT
```powershell
cd D:\Personal\inner_driver_app
.\venv\Scripts\Activate.ps1
python manage.py runserver 0.0.0.0:8000
```

### 3. App JS server — NOT `run:android` (no rebuild needed)
```powershell
cd D:\Personal\inner_driver_app\inner-driver-driver
npx expo start --dev-client
```
Then open the app on the phone (or press `a` in the Metro terminal). Press `r` to reload.

> For the **rider** app instead, use `inner-driver-rider` (its Metro is port 8081).

---

## "Network failed" fix (most common issue)
The `adb reverse tcp:8000` tunnel dropped. Re-run the **step 1** commands, then reload the app.
Quick check it's set: `adb reverse --list` should list `tcp:8000`, `tcp:8081`, `tcp:8082`.

## When you DO need `npx expo run:android` (full rebuild)
- Added/removed a native dependency (e.g. an `expo-*` / `react-native-*` package)
- Changed `app.json` native config (permissions, package name, Maps key)
- Uninstalled the app from the device
JS/UI edits only → never rebuild; just reload (`r`).

## Notes
- Both apps point to `localhost:8000` (USB). To run over **Wi-Fi** instead, set
  `HOST = "<PC-LAN-IP>:8000"` in `src/config.js` (e.g. `192.168.1.8:8000`) — then the
  `adb reverse tcp:8000` step isn't needed, but the phone must share the PC's Wi-Fi.
- Secrets live in `.env` (gitignored). The map is grey until a **billed** Google Maps key is added.
