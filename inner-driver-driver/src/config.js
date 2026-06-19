// Backend host. Two options:
//  - USB dev build (current): "localhost:8000" routes through the adb reverse
//    tunnel (`adb reverse tcp:8000 tcp:8000`) to the PC. Reliable, IP-independent.
//  - Wi-Fi / Expo Go: use the PC's LAN IP, e.g. "192.168.1.8:8000", and run
//    Django on all interfaces: python manage.py runserver 0.0.0.0:8000
export const HOST = "192.168.1.4:8000";

export const API_BASE = `http://${HOST}/api`;
export const WS_BASE = `ws://${HOST}`;

// Vehicle color palette shown as swatches. The backend stores the hex value.
// `name` is just a label/accessibility hint; `hex` is what's saved.
export const COLOR_CHOICES = [
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Beige", hex: "#E8Dcc0" },
  { name: "Brown", hex: "#7C4A2D" },
  { name: "Red", hex: "#DC2626" },
  { name: "Maroon", hex: "#7F1D1D" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Yellow", hex: "#FACC15" },
  { name: "Green", hex: "#16A34A" },
  { name: "Teal", hex: "#0D9488" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Navy", hex: "#1E3A8A" },
  { name: "Purple", hex: "#7C3AED" },
];
