import { api } from "./client";
import { saveTokens, clearTokens, getRefresh } from "../auth/tokens";

// --- Auth ---
export async function login(email, password) {
  const { data } = await api.post("/login/", { email, password });
  await saveTokens(data.tokens);
  return data;
}

export async function registerRider(payload) {
  // { email, password, password_confirm, full_name, phone_number }
  const { data } = await api.post("/register/rider/", payload);
  if (data.tokens) await saveTokens(data.tokens);
  return data;
}

export async function logout() {
  const refresh = await getRefresh();
  try {
    if (refresh) await api.post("/logout/", { refresh });
  } finally {
    await clearTokens();
  }
}

export async function getMe() {
  const { data } = await api.get("/user/me/");
  return data; // includes user_type
}

// Update shared user fields (full_name, email, phone_number).
export async function updateUserProfile(payload) {
  const { data } = await api.patch("/user/profile/", payload);
  return data.user ?? data;
}

// --- Forgot password (public, OTP) ---
export async function requestPasswordReset(email) {
  const { data } = await api.post("/password-reset/request/", { email });
  return data;
}
export async function verifyPasswordReset(email, otp_code, new_password, new_password_confirm) {
  const { data } = await api.post("/password-reset/verify/", {
    email, otp_code, new_password, new_password_confirm,
  });
  return data;
}

// --- Password change (OTP, authenticated) ---
export async function requestPasswordOtp() {
  const { data } = await api.post("/user/password-change/request/");
  return data;
}

export async function verifyPasswordChange(otp_code, new_password, new_password_confirm) {
  const { data } = await api.post("/user/password-change/verify/", {
    otp_code, new_password, new_password_confirm,
  });
  return data;
}

// --- Discovery ---
// Anonymous available drivers within `radiusKm` of the rider:
// { single_ride_mode, is_available, current_latitude, current_longitude }.
// Requires the rider's location — without it we return nothing rather than
// dumping every available driver. Callers should prompt the rider to enable GPS.
export async function listNearbyDrivers(loc, radiusKm = 10) {
  if (loc?.latitude == null || loc?.longitude == null) return [];
  const { data } = await api.get("/drivers/nearby/", {
    params: { lat: loc.latitude, lng: loc.longitude, radius_km: radiusKm },
  });
  return Array.isArray(data) ? data : data.results ?? [];
}

// --- Ride requests ---
export async function requestRide(payload) {
  // { pickup_latitude, pickup_longitude, pickup_location?,
  //   dropoff_latitude, dropoff_longitude, dropoff_location? }
  // The rider names no price — drivers set prices via offers.
  const { data } = await api.post("/rides/request/", payload);
  return data.ride ?? data;
}

// status may be string or array, e.g. ["open","assigned","confirmed"]
export async function listMyRides(status) {
  const value = Array.isArray(status) ? status.join(",") : status;
  const { data } = await api.get("/rides/", { params: value ? { status: value } : {} });
  return data;
}

export async function cancelRide(rideId) {
  const { data } = await api.post(`/rides/${rideId}/cancel/`);
  return data;
}

// --- Ratings ---
// Rider rates the driver immediately (e.g. after cancelling a confirmed ride).
export async function rateRide(rideId, score) {
  const { data } = await api.post(`/rides/${rideId}/rate/`, { score });
  return data;
}

// Pending rating prompts (driver ended a confirmed ride). [{ id, ride, driver_name }]
export async function listPendingRatings() {
  const { data } = await api.get("/ratings/pending/");
  return Array.isArray(data) ? data : data.results ?? [];
}

// Resolve a pending request: pass a score to rate, or omit to ignore. Either
// way it's marked done so it won't reappear.
export async function resolveRating(ratingId, score) {
  const body = score ? { score } : {};
  const { data } = await api.post(`/ratings/${ratingId}/resolve/`, body);
  return data;
}


// --- Offers on my request ---
export async function listOffers(rideId) {
  const { data } = await api.get(`/rides/${rideId}/offers/`);
  return data; // array, each with driver_distance_km
}

export async function counterOffer(offerId, price) {
  const { data } = await api.post(`/offers/${offerId}/counter/`, { price });
  return data.offer ?? data;
}

export async function acceptOffer(offerId) {
  const { data } = await api.post(`/offers/${offerId}/accept/`);
  return data;
}

// Rider declines an offer (also un-accepts if it was the accepted one).
export async function declineOffer(offerId) {
  const { data } = await api.post(`/offers/${offerId}/decline/`);
  return data.offer ?? data;
}
