// Backend host. Two options:
//  - USB dev build (current): "localhost:8000" routes through the adb reverse
//    tunnel (`adb reverse tcp:8000 tcp:8000`) to the PC. Reliable, IP-independent.
//  - Wi-Fi / Expo Go: use the PC's LAN IP, e.g. "192.168.1.8:8000", and run
//    Django on all interfaces: python manage.py runserver 0.0.0.0:8000
export const HOST = "192.168.1.4:8000";

export const API_BASE = `http://${HOST}/api`;
export const WS_BASE = `ws://${HOST}`;
