import * as Location from "expo-location";

// Request permission and return the rider's current { latitude, longitude }.
// Throws with a readable message on denial/failure.
export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

// Reverse-geocode coordinates → "street, area, city" — no street number,
// no governorate/region, no country. Best-effort; null if unavailable.
export async function reverseGeocode(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const p = results?.[0];
    if (!p) return null;
    const street = (p.street || p.name || "").replace(/^\s*\d+\s*/, "").trim();
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

// Great-circle distance in km between two {latitude, longitude} points.
// Computed client-side (the rider list shows distance without backend help).
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
