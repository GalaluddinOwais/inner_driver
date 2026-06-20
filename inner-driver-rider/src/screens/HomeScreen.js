import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert,
  ActivityIndicator, ScrollView, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMe, logout, listNearbyDrivers, requestRide, listMyRides,
  cancelRide, listOffers, counterOffer, acceptOffer, declineOffer,
  rateRide, listPendingRatings, resolveRating,
} from "../api/rider";
import { apiError } from "../api/client";
import { connectNotifications } from "../ws/notifications";
import { getCurrentLocation, haversineKm, reverseGeocode } from "../location";
import DiscoverMap from "./DiscoverMap";
import PromptModal from "./PromptModal";
import LocationModal from "./LocationModal";
import RatingModal from "./RatingModal";

const DRIVER_LIVE_INTERVAL_MS = 10000; // poll the assigned driver's location every 10s
const NEARBY_POLL_INTERVAL_MS = 5000; // refresh nearby drivers every 60s on the discovery screen

// Per-state accent color for an offer card's status label + price (mirrors the driver app).
const STATE_COLORS = {
  countered: "#facc15", // canary yellow
  accepted: "#22c55e",  // green
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [riderLoc, setRiderLoc] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [activeRide, setActiveRide] = useState(null); // the rider's current open/assigned/confirmed ride
  const [offers, setOffers] = useState([]);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [busy, setBusy] = useState(false);

  const [prompt, setPrompt] = useState(null); // { kind: 'price' | 'counter', offer? }
  const [driverAddress, setDriverAddress] = useState(null); // geocoded from driver's live coords
  const [locModal, setLocModal] = useState(null); // { title, latitude, longitude, address? } | null
  const [cancelRating, setCancelRating] = useState(null); // ride to rate the driver for (after cancel)
  const [pendingRatings, setPendingRatings] = useState([]); // queued driver-rating prompts (one at a time)

  const wsRef = useRef(null);
  const liveTimer = useRef(null);
  const nearbyTimer = useRef(null);
  const dismissedRideId = useRef(null); // ride the rider marked "arrived" — hide it locally

  // --- Initial location + region ---
  // Keep retrying until we get a fix, so enabling GPS after the screen loads is
  // picked up automatically (no app restart needed). Stops once we have a location.
  useEffect(() => {
    if (riderLoc) return;
    let cancelled = false;
    let retry;
    const tryGetLocation = async () => {
      try {
        const loc = await getCurrentLocation();
        if (!cancelled) setRiderLoc(loc);
      } catch (e) {
        if (!cancelled) retry = setTimeout(tryGetLocation, 4000); // GPS off — retry soon
      }
    };
    tryGetLocation();
    return () => { cancelled = true; if (retry) clearTimeout(retry); };
  }, [riderLoc]);

  // --- Load my active ride + offers (and nearby drivers if none) ---
  const refresh = useCallback(async () => {
    try {
      const mine = await listMyRides(["open", "assigned", "confirmed"]);
      // Ignore a ride the rider already marked "arrived" (frontend-only dismissal).
      const visible = mine.filter((r) => r.id !== dismissedRideId.current);
      const current = visible[0] || null;
      setActiveRide(current);
      if (current) {
        setOffers(await listOffers(current.id));
      } else {
        setOffers([]);
        setDrivers(await listNearbyDrivers(riderLoc));
      }
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
    // Refresh the pending driver-rating prompts (queued, shown one at a time).
    try { setPendingRatings(await listPendingRatings()); } catch {}
  }, [riderLoc]);

  useEffect(() => { refresh(); }, [refresh]);

  // --- WebSocket: refresh on any ride/offer event ---
  useEffect(() => {
    let handle;
    (async () => {
      handle = await connectNotifications(
        () => { refresh(); }, // any event → re-pull current state
        (status) => setWsStatus(status === "open" ? "live" : status)
      );
      wsRef.current = handle;
    })();
    return () => wsRef.current?.close();
  }, [refresh]);

  // --- Poll assigned driver's live location every 10s while confirmed ---
  const confirmed = activeRide?.status === "confirmed";
  useEffect(() => {
    if (confirmed && !liveTimer.current) {
      const tick = () => refresh();
      liveTimer.current = setInterval(tick, DRIVER_LIVE_INTERVAL_MS);
    } else if (!confirmed && liveTimer.current) {
      clearInterval(liveTimer.current);
      liveTimer.current = null;
    }
    return () => {
      if (liveTimer.current) { clearInterval(liveTimer.current); liveTimer.current = null; }
    };
  }, [confirmed, refresh]);

  // --- Poll nearby drivers every 60s while on the discovery screen (no active ride) ---
  // The nearby list is a REST snapshot, not a live feed, so refresh it on a timer
  // here. Fetch only the drivers (no full refresh) and swallow errors so a transient
  // network hiccup doesn't alert the user every minute.
  useEffect(() => {
    if (!activeRide) {
      nearbyTimer.current = setInterval(async () => {
        try { setDrivers(await listNearbyDrivers(riderLoc)); } catch {}
      }, NEARBY_POLL_INTERVAL_MS);
    }
    return () => {
      if (nearbyTimer.current) { clearInterval(nearbyTimer.current); nearbyTimer.current = null; }
    };
  }, [activeRide, riderLoc]);

  // --- Request a ride ---
  // Opens the map picker; on confirm, posts the chosen pickup/dropoff. The rider
  // names no price — drivers set prices via their offers.
  function startBuilding() {
    navigation.navigate("LocationPicker", { onConfirm: submitRequest, initialLoc: riderLoc });
  }

  async function submitRequest({ pickup, dropoff }) {
    setBusy(true);
    try {
      const r6 = (n) => Math.round(n * 1e6) / 1e6; // model stores 6 decimals
      await requestRide({
        pickup_latitude: r6(pickup.latitude),
        pickup_longitude: r6(pickup.longitude),
        pickup_location: pickup.address || "",
        dropoff_latitude: r6(dropoff.latitude),
        dropoff_longitude: r6(dropoff.longitude),
        dropoff_location: dropoff.address || "",
      });
      await refresh();
    } catch (e) {
      Alert.alert("Could not request", apiError(e));
    } finally {
      setBusy(false);
    }
  }

  // --- Offer actions ---
  async function onAccept(offer) {
    setBusy(true);
    try { await acceptOffer(offer.id); await refresh(); }
    catch (e) { Alert.alert("Could not accept", apiError(e)); }
    finally { setBusy(false); }
  }
  async function onDecline(offer) {
    try { await declineOffer(offer.id); await refresh(); }
    catch (e) { Alert.alert("Could not decline", apiError(e)); }
  }
  function onCounter(offer) { setPrompt({ kind: "counter", offer }); }
  async function submitCounter(offer, text) {
    const price = parseFloat(text);
    setPrompt(null);
    if (!price || price <= 0) return;
    try { await counterOffer(offer.id, price); await refresh(); }
    catch (e) { Alert.alert("Could not counter", apiError(e)); }
  }

  async function onCancelRide() {
    if (!activeRide) return;
    Alert.alert("Cancel ride?", "This cancels your request.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel", style: "destructive",
        onPress: async () => {
          // Snapshot BEFORE cancel/refresh (refresh() clears activeRide).
          const wasConfirmed = activeRide.status === "confirmed";
          const driverName = activeRide.driver_name || null;
          const destination = activeRide.dropoff_location || null;
          const rideId = activeRide.id;
          try {
            await cancelRide(rideId);
            // Open the rate-driver prompt first, then refresh in the background.
            if (wasConfirmed) setCancelRating({ id: rideId, driverName, destination });
            await refresh();
          }
          catch (e) { Alert.alert("Could not cancel", apiError(e)); }
        },
      },
    ]);
  }

  async function submitDriverRating(score) {
    const r = cancelRating;
    setCancelRating(null);
    if (!r || !score) return;
    try { await rateRide(r.id, score); } catch {}
  }

  // Resolve the head of the pending-rating queue (rate the driver, or ignore).
  // Either way the request is marked done server-side and popped locally so the
  // next one (if any) shows.
  async function resolvePendingRating(score) {
    const head = pendingRatings[0];
    if (!head) return;
    setPendingRatings((q) => q.slice(1));
    try { await resolveRating(head.id, score); } catch {}
  }

  function onDriverArrived() {
    if (!activeRide) return;
    Alert.alert("Driver arrived?", "End the trip and go back to home?", [
      { text: "Not yet", style: "cancel" },
      {
        text: "Yes, arrived",
        onPress: async () => {
          // Frontend-only: stop showing this ride and return home. The
          // dismissedRideId guard keeps it out of subsequent refreshes.
          dismissedRideId.current = activeRide.id;
          setActiveRide(null);
          setOffers([]);
          setDrivers(await listNearbyDrivers(riderLoc));
        },
      },
    ]);
  }

  async function onLogout() {
    await logout();
    navigation.replace("Login");
  }

  // Driver live position (only present when confirmed)
  const driverLive =
    activeRide?.driver_latitude != null && activeRide?.driver_longitude != null
      ? { latitude: Number(activeRide.driver_latitude), longitude: Number(activeRide.driver_longitude) }
      : null;

  // Reverse-geocode the driver's live coords (rounded so we only re-geocode when
  // they actually move). Clears when there's no live driver position.
  const dvLatKey = driverLive ? driverLive.latitude.toFixed(4) : null;
  const dvLngKey = driverLive ? driverLive.longitude.toFixed(4) : null;
  useEffect(() => {
    if (!driverLive) { setDriverAddress(null); return; }
    let cancelled = false;
    reverseGeocode(driverLive.latitude, driverLive.longitude)
      .then((addr) => { if (!cancelled && addr) setDriverAddress(addr); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dvLatKey, dvLngKey]);

  // Which offers to show: after acceptance, only the accepted one.
  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const visibleOffers = acceptedOffer ? [acceptedOffer] : offers.filter((o) => o.status !== "declined");

  return (
    <View style={styles.container}>
      {/* BIG AREA: nearby drivers (no ride) · offers (open/assigned) · tracking (confirmed) */}
      <View style={styles.mapWrap}>
        {!activeRide || confirmed ? (
          <DiscoverMap
            riderLoc={riderLoc}
            drivers={activeRide ? [] : drivers}
            driverLive={driverLive}
            driverAddress={driverAddress}
            activeRide={activeRide}
            wsStatus={wsStatus}
          />
        ) : (
          <ScrollView style={styles.bigArea} contentContainerStyle={{ paddingTop: 88, paddingBottom: 20 }}>
            <Text style={[styles.sheetTitle, { marginBottom: 12 }]}>
              {activeRide.status === "assigned" ? "Awaiting confirmation…" : "Offers"}
            </Text>

            {visibleOffers.map((o) => {
              const countered = o.status === "countered";
              const accepted = o.status === "accepted";
              // State accent: accepted = green, countered = canary yellow, plain offer = none.
              const stateColor = accepted ? STATE_COLORS.accepted : countered ? STATE_COLORS.countered : null;
              const stateText = accepted ? "Accepted" : countered ? "Countered" : null;
              // "Brand Model" with any "Other" token dropped.
              const vehicleLabel = (o.driver_vehicle || "")
                .split(" ").filter((w) => w && w.toLowerCase() !== "other").join(" ").trim();
              return (
                <View key={o.id} style={styles.offerCard}>
                  {/* Top row: price (left) + state label (right) */}
                  <View style={styles.row}>
                    {countered ? (
                      <Text style={[styles.offerPrice, { color: stateColor }]}>
                        <Text style={[styles.priceStrike, { color: stateColor }]}>${o.price}</Text>
                        {"  →  "}${o.counter_price}
                      </Text>
                    ) : (
                      <Text style={[styles.offerPrice, stateColor && { color: stateColor }]}>${o.price}</Text>
                    )}
                    <Text style={[styles.offerState, stateColor && { color: stateColor }]}>
                      {stateText}
                    </Text>
                  </View>
  
                  {/* vehicle (icon + brand·model) and km away, centered under the top row */}
                  <View style={styles.kmRow}>
                    <Ionicons name={o.driver_single_ride_mode ? "car-sport" : "bus"} size={16} color="#e2e8f0" />
                    {vehicleLabel ? <Text style={styles.vehicleLabel}>{vehicleLabel}</Text> : null}
                    {o.driver_distance_km != null ? (
                      <Text style={styles.offerMeta}>
                        {vehicleLabel ? `   ${o.driver_distance_km} km away` : `${o.driver_distance_km} km away`}
                      </Text>
                    ) : null}
                  </View>

                  {accepted ? (
                    <>
                      <TouchableOpacity style={[styles.btn, styles.declineBtn, { marginTop: 8 }]} onPress={() => onDecline(o)}>
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.btn, styles.primary, { marginTop: 8 }]} onPress={() => onAccept(o)}>
                        <Text style={styles.btnText}>{countered ? `Accept $${o.price}` : "Accept"}</Text>
                      </TouchableOpacity>
                      <View style={[styles.row, { marginTop: 10 }]}>
                        <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={() => onCounter(o)}>
                          <Text style={styles.ghostText}>Counter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={() => onDecline(o)}>
                          <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            {!acceptedOffer && visibleOffers.length === 0 && activeRide.status === "open" ? (
              <View style={styles.waitingWrap}>
                <Ionicons name="hourglass-outline" size={56} color="#e2e8f0" />
                <Text style={styles.waitingTitle}>Waiting for offers…</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        <View style={styles.topRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
              <Ionicons name="settings-sharp" size={24} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout}>
              <Ionicons name="log-out-outline" size={26} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* BOTTOM SHEET: request CTA (no ride) · request summary + Cancel (active) */}
      <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
        {!activeRide ? (
          <View>
            <View />
            <TouchableOpacity style={styles.cta} onPress={startBuilding} activeOpacity={0.85}>
              <Ionicons name="location" size={20} color="#fff" />
              <Text style={styles.ctaText}>Request a ride</Text>
            </TouchableOpacity>
            <Text style={styles.ctaSub}>and drivers will send you price offers</Text>
          </View>
        ) : (
          <View>
            <View  />
            <View style={styles.row}>
              <Text style={styles.reqTitle}>Your request</Text>
              {activeRide.final_price != null ? (
                <Text style={styles.reqPrice}>${activeRide.final_price}</Text>
              ) : null}
            </View>
            {confirmed && (activeRide.driver_name || activeRide.driver_phone) ? (
              <View style={[styles.driverInfoRow, { marginTop: 6 }]}>
                {activeRide.driver_name ? (
                  <View style={styles.driverInfoItem}>
                    <Ionicons name={activeRide.driver_single_ride_mode ? "car-sport" : "bus"} size={15} color="#e2e8f0" />
                    <Text style={styles.driverInfoName}>{activeRide.driver_name}</Text>
                  </View>
                ) : null}
                {activeRide.driver_phone ? (
                  <TouchableOpacity style={styles.driverInfoItem} onPress={() => Linking.openURL(`tel:${activeRide.driver_phone}`)}>
                    <Ionicons name="call" size={15} color="#e2e8f0" />
                    <Text style={styles.driverInfoPhone}>{activeRide.driver_phone}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* Tappable locations → detail popup */}
            <View style={styles.locChipRow}>
              <TouchableOpacity
                style={styles.locChip}
                onPress={() => setLocModal({ title: "Pickup", latitude: activeRide.pickup_latitude, longitude: activeRide.pickup_longitude, address: activeRide.pickup_location || null })}
              >
                <Ionicons name="arrow-up-circle" size={16} color="#e2e8f0" />
                <Text style={[styles.locLink, { flex: 1 }]}>Pickup</Text>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locChip}
                onPress={() => setLocModal({ title: "Dropoff", latitude: activeRide.dropoff_latitude, longitude: activeRide.dropoff_longitude, address: activeRide.dropoff_location || null })}
              >
                <Ionicons name="arrow-down-circle" size={16} color="#e2e8f0" />
                <Text style={[styles.locLink, { flex: 1 }]}>Dropoff</Text>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            {confirmed && driverLive ? (
              <TouchableOpacity
                style={styles.locLinkRow}
                onPress={() => setLocModal({ title: "Driver location", latitude: driverLive.latitude, longitude: driverLive.longitude, address: driverAddress })}
              >
                <Ionicons name="car-sport" size={16} color="#e2e8f0" />
                <Text style={[styles.locLink, { flex: 1 }]}>Driver location</Text>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
              </TouchableOpacity>
            ) : null}

            {confirmed ? (
              <TouchableOpacity style={styles.arrivedBtn} onPress={onDriverArrived}>
                <Text style={styles.btnText}>Driver arrived</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancelRide}>
              <Text style={styles.btnText}>Cancel ride</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {busy ? (
        <View style={styles.overlay}><ActivityIndicator color="#38bdf8" size="large" /></View>
      ) : null}

      <PromptModal
        visible={prompt?.kind === "counter"}
        title="Counter offer"
        message="Propose a lower price"
        placeholder={prompt?.offer ? String(prompt.offer.price) : ""}
        submitLabel="Send"
        onCancel={() => setPrompt(null)}
        onSubmit={(text) => submitCounter(prompt.offer, text)}
      />

      <LocationModal
        visible={!!locModal}
        title={locModal?.title}
        latitude={locModal?.latitude}
        longitude={locModal?.longitude}
        address={locModal?.address}
        onClose={() => setLocModal(null)}
      />

      {/* Rate the driver after cancelling a confirmed ride. */}
      <RatingModal
        visible={!!cancelRating}
        title="Rate your driver"
        subtitle={cancelRating?.driverName || undefined}
        destination={cancelRating?.destination || undefined}
        onSubmit={submitDriverRating}
        onIgnore={() => setCancelRating(null)}
      />

      {/* Pending driver-rating prompts (driver ended the ride). One at a time;
          hidden while the cancel-rating modal is up to avoid overlap. */}
      <RatingModal
        visible={!cancelRating && pendingRatings.length > 0}
        title="Rate your driver"
        subtitle={pendingRatings[0]?.driver_name || undefined}
        destination={pendingRatings[0]?.destination || undefined}
        onSubmit={resolvePendingRating}
        onIgnore={() => resolvePendingRating(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  mapWrap: { flex: 1 },
  topRow: {
    position: "absolute", top: 44, left: 16, right: 16,
    flexDirection: "row", justifyContent: "flex-end", alignItems: "center",
  },
  sheet: {
    backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 18, maxHeight: "55%",
  },
  sheetTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sheetHint: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  statusHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  bigArea: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: 16 },
  waitingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  waitingTitle: { color: "#e2e8f0", fontSize: 17, fontWeight: "700", marginTop: 18 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#475569", marginBottom: 12 },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#2563eb", borderRadius: 14, paddingVertical: 18, marginTop: 18,
    shadowColor: "#2563eb", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  ctaText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  ctaSub: { color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 10 },
  row: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "space-between" },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  arrivedBtn: { backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 15, alignItems: "center", justifyContent: "center", marginTop: 14 },
  cancelBtn: { backgroundColor: "#ef4444", borderRadius: 12, paddingVertical: 15, alignItems: "center", justifyContent: "center", marginTop: 10 },
  primary: { backgroundColor: "#16a34a" },
  danger: { backgroundColor: "#ef4444" },
  ghost: { backgroundColor: "#334155" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  ghostText: { color: "#cbd5e1", fontWeight: "700" },
  reqCard: { backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginBottom: 12 },
  reqTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  reqPrice: { color: "#22c55e", fontSize: 18, fontWeight: "800" },
  locLink: { color: "#e2e8f0", fontSize: 15, fontWeight: "700" },
  locChipRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  locChip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0f172a", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#334155",
  },
  locLinkRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10,
    backgroundColor: "#0f172a", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#334155",
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  driverInfoRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14 },
  driverInfoItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  driverInfoName: { color: "#e2e8f0", fontSize: 15, fontWeight: "700" },
  driverInfoPhone: { color: "#e2e8f0", fontSize: 15, fontWeight: "700", textDecorationLine: "underline" },
  offerCard: { backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginBottom: 10 },
  offerPrice: { color: "#22c55e", fontSize: 18, fontWeight: "800" },
  priceStrike: { textDecorationLine: "line-through", fontWeight: "800", fontSize: 18 },
  offerMeta: { color: "#94a3b8", fontSize: 13 ,fontWeight: "700"},
  vehicleLabel: { color: "#e2e8f0", fontSize: 14, fontWeight: "700" },
  offerState: { color: "#e2e8f0", fontSize: 16, fontWeight: "800" },
  kmRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  declineBtn: { backgroundColor: "rgba(239,68,68,0.15)" },
  declineText: { color: "#fca5a5", fontWeight: "700", fontSize: 15 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
});
