import * as Location from "expo-location";
import { updateLocation } from "./api/driver";

// Request permission, get the current GPS fix, and push it to the server.
// FAST: does NOT reverse-geocode (that can take >10s and would make the 10s
// loop overlap/pile up). Use captureSendAndGeocode() when you also want the
// address. Returns { latitude, longitude }.
export async function captureAndSendLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  // Model stores 6 decimal places — round to avoid validation errors.
  const r6 = (n) => Math.round(n * 1e6) / 1e6;
  const latitude = r6(pos.coords.latitude);
  const longitude = r6(pos.coords.longitude);

  await updateLocation(latitude, longitude);
  return { latitude, longitude };
}

// Like captureAndSendLocation but also resolves a human-readable address.
// Use for the manual button / going online — NOT the 10s loop. The geocode is
// best-effort and may be slow, so only call this on-demand.
export async function captureSendAndGeocode() {
  const { latitude, longitude } = await captureAndSendLocation();
  const address = await reverseGeocode(latitude, longitude);
  return { latitude, longitude, address };
}

// Resolve ONLY the current address (no server POST). Used by the silent ~30s
// address refresh during a trip. Best-effort; returns null if unavailable.
export async function getCurrentAddress() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
  } catch {
    return null;
  }
}

// Turn coordinates into a readable address: street, district/area, city —
// WITHOUT the street number and WITHOUT the country. e.g.
// "Ahmed Hussain, Omrania, Giza". null if unavailable.
export async function reverseGeocode(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const p = results?.[0];
    if (!p) return null;

    // Street name without any leading house number (e.g. "31 Ahmed Hussain" → "Ahmed Hussain").
    const street = (p.street || p.name || "").replace(/^\s*\d+\s*/, "").trim();

    // No street number, no region/governorate, no country — keep area + city.
    const ordered = [street, p.district, p.subregion, p.city];
    const parts = [];
    for (const part of ordered) {
      if (part && part !== parts[parts.length - 1]) parts.push(part);
    }
    return parts.length ? parts.join(" - ") : null;
  } catch {
    return null;
  }
}

// Straight-line (great-circle) distance in km between two {latitude, longitude}.
export function haversineKm(a, b) {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
