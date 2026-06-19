import axios from "axios";
import { API_BASE } from "../config";
import { getAccess, getRefresh, saveTokens, clearTokens } from "../auth/tokens";

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

// The app registers a handler (via setOnAuthFailure) that clears tokens and
// routes back to Login. Called whenever the session is unrecoverable (refresh
// expired/blacklisted/missing).
let onAuthFailure = null;
export function setOnAuthFailure(fn) {
  onAuthFailure = fn;
}

let loggingOut = false;
async function forceLogout() {
  if (loggingOut) return;
  loggingOut = true;
  try {
    await clearTokens();
    if (onAuthFailure) onAuthFailure();
  } finally {
    // allow future logins to fail again
    setTimeout(() => { loggingOut = false; }, 1000);
  }
}

// Attach the access token to every request.
api.interceptors.request.use(async (cfg) => {
  const access = await getAccess();
  if (access) cfg.headers.Authorization = `Bearer ${access}`;
  return cfg;
});

// On 401, refresh the access token once and retry the original request.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Don't try to refresh the refresh-endpoint itself.
    const isRefreshCall = original?.url?.includes("/token/refresh/");

    if (status === 401 && original && !original._retried && !isRefreshCall) {
      original._retried = true;
      try {
        if (!refreshing) refreshing = refreshAccess();
        const newAccess = await refreshing;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        // Refresh failed (expired / blacklisted / missing) → session is dead.
        await forceLogout();
        throw e;
      } finally {
        refreshing = null;
      }
    }

    throw error;
  }
);

async function refreshAccess() {
  const refresh = await getRefresh();
  if (!refresh) throw new Error("No refresh token");
  const { data } = await axios.post(`${API_BASE}/token/refresh/`, { refresh });
  // IMPORTANT: ROTATE_REFRESH_TOKENS is on, so the server returns a NEW refresh
  // token and blacklists the old one. We MUST persist the new refresh token, or
  // the next refresh will use a blacklisted token and fail.
  await saveTokens({ access: data.access, refresh: data.refresh });
  return data.access;
}

// Return a usable access token, refreshing if needed. Used by the WebSocket,
// which authenticates with the token in its URL (outside the axios pipeline).
// Pass forceRefresh=true to mint a new access token even if one is stored (used
// when reconnecting after the server rejected the token as expired).
// Returns null and forces logout if the session can't be recovered.
export async function ensureFreshAccess(forceRefresh = false) {
  if (!forceRefresh) {
    const access = await getAccess();
    if (access) return access;
  }
  try {
    if (!refreshing) refreshing = refreshAccess();
    return await refreshing;
  } catch (e) {
    await forceLogout();
    return null;
  } finally {
    refreshing = null;
  }
}

// Turn an axios error into a short human message from the API's error shape.
export function apiError(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Network error";
  if (typeof d === "string") return d;
  if (d.error) return d.error;
  if (d.detail) return d.detail;
  // DRF field errors → "field: message"
  const first = Object.entries(d)[0];
  if (first) {
    const [k, v] = first;
    return `${k}: ${Array.isArray(v) ? v[0] : v}`;
  }
  return "Request failed";
}
