import { api } from "./client";
import { saveTokens, clearTokens, getRefresh } from "../auth/tokens";

// --- Auth ---
export async function login(email, password) {
  const { data } = await api.post("/login/", { email, password });
  await saveTokens(data.tokens);
  return data;
}

export async function registerDriver(payload) {
  // payload: { email, password, password_confirm, full_name, phone_number,
  //            vehicle_type_id, vehicle_color }
  const { data } = await api.post("/register/driver/", payload);
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
  return data; // includes user_type + profile
}

// Update shared user fields (full_name, email, phone_number).
export async function updateUserProfile(payload) {
  const { data } = await api.patch("/user/profile/", payload);
  return data.user ?? data;
}

// Update driver-specific fields (vehicle_type_id, vehicle_color).
export async function updateDriverProfile(payload) {
  const { data } = await api.patch("/driver/profile/", payload);
  return data.driver ?? data;
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

// --- Vehicle brands & models (public, for signup/settings pickers) ---
export async function listVehicleBrands() {
  const { data } = await api.get("/vehicle-brands/");
  return Array.isArray(data) ? data : data.results ?? [];
}

// Models for a given brand id. The chosen model's id is what's saved as the
// driver's vehicle (vehicle_type_id). Each item: { id, brand, brand_id, model }.
export async function listVehicleModels(brandId) {
  const { data } = await api.get("/vehicle-models/", { params: { brand: brandId } });
  return Array.isArray(data) ? data : data.results ?? [];
}

// --- Driver profile / balance ---
export async function getDriverProfile() {
  const { data } = await api.get("/driver/profile/");
  return data; // { vehicle_type, vehicle_color, current_balance, is_available, ... }
}

export async function setAvailability(isAvailable) {
  const { data } = await api.patch("/driver/profile/", { is_available: isAvailable });
  return data.driver ?? data;
}

// single_ride_mode: true = one ride at a time (auto-decline others on confirm),
// false = multi (app asks).
export async function setSingleRideMode(singleRideMode) {
  const { data } = await api.patch("/driver/profile/", { single_ride_mode: singleRideMode });
  return data.driver ?? data;
}

export async function recharge(amount) {
  const { data } = await api.post("/driver/recharge/", { amount });
  return data; // { message, current_balance }
}

export async function updateLocation(latitude, longitude) {
  const { data } = await api.post("/driver/location/", { latitude, longitude });
  return data;
}

// --- Rides & Offers (broadcast/auction model) ---

// status may be a string or array (e.g. ["assigned"]).
export async function listMyRides(status) {
  const value = Array.isArray(status) ? status.join(",") : status;
  const { data } = await api.get("/rides/", { params: value ? { status: value } : {} });
  return data;
}

// Open requests near this driver (sorted nearest-first by the server).
// Each item includes distance_km and my_offer (this driver's offer, if any).
export async function listOpenRequests() {
  const { data } = await api.get("/rides/open/");
  return data;
}

// Submit (or update) an offer on an open request.
export async function createOffer(rideId, price) {
  const { data } = await api.post(`/rides/${rideId}/offers/create/`, { price });
  return data.offer ?? data;
}

// Driver confirms an assigned ride ("I'm coming") → charges fee, status confirmed.
// Pass withdrawOthers=true to also withdraw this driver's offers on other requests.
export async function confirmRide(rideId, withdrawOthers = false) {
  const { data } = await api.post(`/rides/${rideId}/confirm/`, { withdraw_others: withdrawOthers });
  return data;
}

// Driver withdraws their own offer on a ride (while open or assigned-but-unconfirmed).
export async function withdrawOffer(rideId) {
  const { data } = await api.post(`/rides/${rideId}/withdraw/`);
  return data;
}

export async function hideRide(rideId) {
  const { data } = await api.post(`/rides/${rideId}/hide/`);
  return data;
}

// Driver rates the rider on a ride (1-5). Ignorable on the client (don't call).
export async function rateRide(rideId, score) {
  const { data } = await api.post(`/rides/${rideId}/rate/`, { score });
  return data;
}
