import { WS_BASE } from "../config";
import { ensureFreshAccess } from "../api/client";

// Connect to the ride-notification socket. `onEvent` receives parsed
// { type, message, ride } objects. Returns a handle with close().
//
// The notifications socket is receive-only (server -> client). For drivers the
// relevant event is `ride_requested`.
export async function connectNotifications(onEvent, onStatus) {
  let ws = null;
  let closedByUs = false;
  let retry = 0;

  async function open(forceRefresh = false) {
    // ensureFreshAccess refreshes (and persists) if needed; returns null and
    // forces logout if the session is dead. On a reconnect we force a refresh,
    // since the previous token was likely rejected as expired.
    const token = await ensureFreshAccess(forceRefresh);
    if (!token) {
      onStatus?.("no-token");
      return;
    }
    ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);

    ws.onopen = () => {
      retry = 0;
      onStatus?.("open");
    };

    ws.onmessage = (e) => {
      try {
        onEvent?.(JSON.parse(e.data));
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onclose = () => {
      onStatus?.("closed");
      if (closedByUs) return;
      // The server closes the socket when the token is invalid/expired. Reconnect
      // with backoff; ensureFreshAccess() will mint a fresh token on the next try.
      retry = Math.min(retry + 1, 5);
      const delay = retry * 1500;
      setTimeout(() => { if (!closedByUs) open(true); }, delay);
    };

    ws.onerror = () => onStatus?.("error");
  }

  open();

  return {
    close() {
      closedByUs = true;
      try { ws?.close(); } catch {}
    },
  };
}
