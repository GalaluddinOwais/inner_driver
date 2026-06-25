import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Switch, Alert,
  RefreshControl, ActivityIndicator, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getDriverProfile, setAvailability, recharge,
  listOpenRequests, listMyRides, createOffer, hideRide, rateRide,
  confirmRide, withdrawOffer,
  logout,
} from "../api/driver";
import { apiError } from "../api/client";
import { connectNotifications } from "../ws/notifications";
import { captureAndSendLocation, captureSendAndGeocode, getCurrentAddress, haversineKm } from "../location";
import PromptModal from "./PromptModal";
import LocationModal from "./LocationModal";
import RatingModal from "./RatingModal";

const LOCATION_INTERVAL_MS = 10000; // push GPS every 10s while on a confirmed ride
const ADDRESS_INTERVAL_MS = 30000;  // silently refresh the shown address every 30s

// Per-state accent color for the card's status label + price.
const STATE_COLORS = {
  offered: "#22d3ee",   // cyan blue
  countered: "#facc15", // canary yellow
  accepted: "#22c55e",  // green
  cancelled: "#f87171", // red
};

// Addresses are stored as "street - area - city". Show only the last segment
// (most specific-to-broad varies; the last is the shortest, cleanest label).
function shortAddr(addr) {
  if (!addr) return "Tap to view";
  const parts = addr.split("-").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "Tap to view";
}

export default function HomeScreen({ navigation }) {

  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]); // open requests near me (each may carry my_offer)
  const [activeRides, setActiveRides] = useState([]); // assigned, not-hidden rides
  const [wsStatus, setWsStatus] = useState("connecting");
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [myAddress, setMyAddress] = useState(null);
  // prompt: { kind: 'recharge' | 'offer', ride? }  (null = hidden)
  const [prompt, setPrompt] = useState(null);
  const [locModal, setLocModal] = useState(null); // { title, latitude, longitude, address? } | null
  const [ratingRide, setRatingRide] = useState(null); // ride to rate the rider for (after clear)
  const wsRef = useRef(null);

  // Load profile + open requests + my assigned rides.
  const loadAll = useCallback(async () => {
    try {
      const [p, open, mine] = await Promise.all([
        getDriverProfile(),
        listOpenRequests(),
        // Include cancelled (not-hidden) so a rider-cancelled confirmed ride still
        // shows with its "Sorry" note until the driver dismisses it with Done.
        listMyRides(["assigned", "confirmed", "arrived", "cancelled"]),
      ]);
      setProfile(p);
      setRequests(open);
      setActiveRides(mine);
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  }, []);

  useEffect(() => {
    loadAll();
    let handle;
    (async () => {
      handle = await connectNotifications(
        (event) => {
          if (event.type === "ride_cancelled") {
            // Rider cancelled → drop it from the list right away.
            const id = event.ride?.id;
            if (id != null) setRequests((prev) => prev.filter((r) => r.id !== id));
          } else if (
            // New request, rider countering, an offer resolution, or a rider
            // cancelling an assigned/confirmed ride → refresh the lists.
            event.type === "ride_requested" ||
            event.type === "offer_countered" ||
            event.type === "offer_accepted" ||
            event.type === "offer_declined" ||
            event.type === "ride_cancelled_by_rider" ||
            event.type === "ride_arrived"
          ) {
            loadAll();
          }
        },
        (status) => setWsStatus(status === "open" ? "live" : status)
      );
      wsRef.current = handle;
    })();
    return () => wsRef.current?.close();
  }, [loadAll]);

  // Manual tap: push GPS now (works anytime, even with no ride) WITH the loading
  // spinner, AND refresh the shown address. Drivers use this to update both their
  // position and the displayed address on demand.
  const pushLocation = useCallback(async () => {
    setUpdatingLocation(true);
    try {
      const { address } = await captureSendAndGeocode();
      if (address) setMyAddress(address);
    } finally {
      setUpdatingLocation(false);
    }
  }, []);

  const isSharing = activeRides.some((r) => r.status === "confirmed" || r.status === "arrived");

  // GPS push every 10s during a confirmed ride (fast, no geocode, skip-if-busy so
  // a slow request can never pile up). Shows the button spinner on each push so the
  // driver sees it's actively sharing. No list polling — the WebSocket handles that.
  useEffect(() => {
    if (!isSharing) return;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      setUpdatingLocation(true);
      try { await captureAndSendLocation(); } catch {} finally {
        inFlight = false;
        setUpdatingLocation(false);
      }
    };
    tick();
    const id = setInterval(tick, LOCATION_INTERVAL_MS);
    return () => { clearInterval(id); setUpdatingLocation(false); };
  }, [isSharing]);

  // Address refresh every 30s — ONLY during a confirmed ride, silent (no spinner).
  // When the trip ends, the cleanup clears the address so nothing stale lingers
  // (a manual tap can still set a fresh address on demand while idle).
  useEffect(() => {
    if (!isSharing) return;
    let inFlight = false;
    const refreshAddr = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const addr = await getCurrentAddress();
        if (addr) setMyAddress(addr);
      } catch {} finally { inFlight = false; }
    };
    refreshAddr(); // first address shortly after confirming
    const id = setInterval(refreshAddr, ADDRESS_INTERVAL_MS);
    // On trip end, clear the auto-refreshed address so nothing stale lingers.
    return () => { clearInterval(id); setMyAddress(null); };
  }, [isSharing]);

  // How many OTHER live offers this driver has out (excludes the ride being confirmed).
  function countOtherLiveOffers(exceptRideId) {
    const onOpen = requests.filter(
      (r) => r.id !== exceptRideId && r.my_offer && r.my_offer.status !== "declined"
    ).length;
    const onAssigned = activeRides.filter(
      (r) => r.id !== exceptRideId && r.status === "assigned"
    ).length;
    return onOpen + onAssigned;
  }

  async function doConfirm(ride, withdrawOthers) {
    try {
      await confirmRide(ride.id, withdrawOthers);
      await loadAll(); // refreshes status→confirmed, balance, and cleared offers
    } catch (e) {
      Alert.alert("Cannot confirm", apiError(e));
    }
  }

  function onConfirm(ride) {
    const others = countOtherLiveOffers(ride.id);
    // One-ride mode: server auto-declines others on confirm — no need to ask.
    // Multi mode: ask the driver whether to withdraw the other offers.
    if (!profile.single_ride_mode && others > 0) {
      Alert.alert(
        "Confirmed!",
        `You have ${others} other offer${others === 1 ? "" : "s"} out on other requests. Withdraw them?`,
        [
          { text: "Keep them", style: "cancel", onPress: () => doConfirm(ride, false) },
          { text: "Withdraw all", style: "destructive", onPress: () => doConfirm(ride, true) },
        ]
      );
    } else {
      doConfirm(ride, false);
    }
  }

  async function onWithdraw(ride) {
    // Withdraw the driver's offer on this ride (open or assigned-unconfirmed).
    try {
      await withdrawOffer(ride.id);
      await loadAll(); // ride reopens / leaves active; request reappears fresh
    } catch (e) {
      Alert.alert("Could not withdraw", apiError(e));
      loadAll();
    }
  }

  async function onDone(ride) {
    // Optimistic: remove the card AND show the rating prompt immediately, then
    // fire the hide request in the background (no waiting on the round-trip).
    setActiveRides((prev) => prev.filter((r) => r.id !== ride.id));
    setRatingRide(ride);
    try {
      await hideRide(ride.id);
    } catch (e) {
      Alert.alert("Could not finish", apiError(e));
      loadAll();
    }
  }

  async function submitRiderRating(score) {
    const ride = ratingRide;
    setRatingRide(null);
    if (!ride || !score) return;
    try { await rateRide(ride.id, score); } catch {}
  }

  async function onToggleAvailability(value) {
    setToggling(true);
    try {
      if (value) {
        try {
          await captureAndSendLocation();
        } catch (locErr) {
          Alert.alert("Location needed", `${locErr.message}. Enable location to go online so riders can find you.`);
          return;
        }
      }
      const updated = await setAvailability(value);
      setProfile((p) => ({ ...p, ...updated }));
      // Turning off hides open requests immediately; turning on refetches them.
      if (!value) setRequests([]);
      loadAll();
    } catch (e) {
      Alert.alert("Cannot change availability", apiError(e));
    } finally {
      setToggling(false);
    }
  }

  async function onUpdateLocation() {
    try {
      await pushLocation();
    } catch (e) {
      Alert.alert("Location error", e.message);
    }
  }

  async function submitRecharge(text) {
    const amount = parseFloat(text);
    setPrompt(null);
    if (!amount || amount <= 0) return;
    try {
      const res = await recharge(amount);
      setProfile((p) => ({ ...p, current_balance: res.current_balance }));
    } catch (e) {
      Alert.alert("Recharge failed", apiError(e));
    }
  }

  async function submitOffer(ride, text) {
    const price = parseFloat(text);
    setPrompt(null);
    if (!price || price <= 0) return;
    try {
      await createOffer(ride.id, price);
      await loadAll();
    } catch (e) {
      Alert.alert("Could not offer", apiError(e));
    }
  }

  async function onLogout() {
    await logout();
    navigation.replace("Login");
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top bar: balance + actions */}
      <View style={styles.topCard}>
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={{ alignItems: "flex-start", gap: 8 }}>
            {/* Rating + total rides, shown above the balance */}
            <View style={styles.statsRow}>


<View style={styles.statItem}>
  {/* Wrapper box with a locked height to guarantee baseline alignment */}
  <View style={{ width: 70, height: 14, position: 'relative' }}>
    
    {/* Background: 5 Empty Stars */}
    <View style={{ flexDirection: 'row', position: 'absolute', top: 0, left: 0 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={{ width: 16, alignItems: 'center' }}>
          <Ionicons name="star-outline" size={16} color="#e2e8f0" />
        </View>
      ))}
    </View>

    {/* Foreground: 5 Gold Stars */}
    <View 
      style={{ 
        flexDirection: 'row', 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: `${(Math.min(Math.max(Number(profile.rating || 0), 0), 5) / 5) * 100}%`, 
        overflow: 'hidden' 
      }}
    >

      <View style={{ flexDirection: 'row', width: 70 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{ width: 16, alignItems: 'center' }}>
            <Ionicons name="star" size={16} color="#e2e8f0" />
          </View>
        ))}
      </View>
    </View>
    
  </View>
</View>             

 <View style={styles.statItem}>
                <Text style={styles.statText}>on {profile.total_rides || 0} rides</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={styles.gearBtn}>
              <Ionicons name="settings-sharp" size={22} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={styles.gearBtn}>
              <Ionicons name="log-out-outline" size={24} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Full-width separator under the stats row + icons */}
        <View style={styles.divider} />

        {/* Balance + recharge, below the separator */}
        <View style={[styles.row, { alignItems: "flex-end", marginTop: 14 }]}>
          <View>
            <Text style={styles.label}>Balance</Text>
            <Text style={styles.balance}>${profile.current_balance}</Text>
          </View>
          <TouchableOpacity style={styles.rechargeBtn} onPress={() => setPrompt({ kind: "recharge" })}>
            <Ionicons name="wallet" size={16} color="#fff" />
            <Text style={styles.rechargeText}>Recharge</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={[styles.row, { marginTop: 14 }]}>
          <Text style={[styles.availText, { flex: 1, color: profile.is_available ? "#22c55e" : "#94a3b8" }]}>
            Receive requests and offer rides
          </Text>
          {toggling ? (
            <ActivityIndicator color="#38bdf8" />
          ) : (
            <Switch
              value={!!profile.is_available}
              onValueChange={onToggleAvailability}
              trackColor={{ true: "#16a34a", false: "#475569" }}
              thumbColor="#fff"
            />
          )}
        </View>

        {profile.is_available ? (
          <TouchableOpacity
            style={[styles.locBtn, (updatingLocation || isSharing) && styles.locBtnDisabled]}
            onPress={onUpdateLocation}
            disabled={updatingLocation || isSharing}
          >
            <View style={styles.locLoading}>
              <View style={styles.locIconSlot}>
                {updatingLocation ? (
                  <ActivityIndicator color="#e2e8f0" size="small" />
                ) : (
                  <Ionicons name="location" size={18} color="#e2e8f0" />
                )}
              </View>
              <Text style={[styles.locText, { flexShrink: 1 }]} numberOfLines={2}>
                {myAddress || (isSharing ? "Sharing your location" : "Update my location")}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={requests}
        keyExtractor={(r) => String(r.id)}
                contentContainerStyle={{ paddingBottom: 120 }}

        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        ListHeaderComponent={
          <>
            {activeRides.length > 0 && (
              <View style={styles.activeSection}>
                <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Active ride</Text>
                {activeRides.map((ride) => {
                  const confirmed = ride.status === "confirmed";
                  const arrived = ride.status === "arrived";
                  const onGoing = confirmed || arrived; // both shown as "On going"
                  const cancelled = ride.status === "cancelled";
                  const tripKm = haversineKm(
                    { latitude: Number(ride.pickup_latitude), longitude: Number(ride.pickup_longitude) },
                    { latitude: Number(ride.dropoff_latitude), longitude: Number(ride.dropoff_longitude) }
                  );
                  // assigned = Accepted, confirmed/arrived = On going (both green), cancelled = Cancelled (red).
                  const stateColor = cancelled ? STATE_COLORS.cancelled : STATE_COLORS.accepted;
                  const stateText = cancelled ? "Cancelled" : onGoing ? "On going" : "Accepted";
                  return (
                    <View key={ride.id} style={styles.reqCard}>
                      {/* Top row: state label (left) + price (right) */}
                      <View style={styles.cardTop}>
                        <Text style={[styles.stateLabel, { color: stateColor }]}>{stateText}</Text>
                        {ride.final_price != null ? (
                          <Text style={[styles.reqPrice, { color: stateColor }]}>${ride.final_price}</Text>
                        ) : null}
                      </View>

                      {/* Rider name + phone (side by side); shown while on going and on cancelled */}
                      {(onGoing || cancelled) && (ride.rider_name || ride.rider_phone) ? (
                        <View style={styles.riderRow}>
                          {ride.rider_name ? (
                            <View style={styles.riderItem}>
                              <Ionicons name="person" size={14} color="#e2e8f0" />
                              <Text style={styles.riderName}>{ride.rider_name}</Text>
                            </View>
                          ) : null}
                          {ride.rider_phone ? (
                            <TouchableOpacity style={styles.riderItem} onPress={() => Linking.openURL(`tel:${ride.rider_phone}`)}>
                              <Ionicons name="call" size={14} color="#e2e8f0" />
                              <Text style={styles.reqPhone}>{ride.rider_phone}</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ) : null}

                      <View style={styles.locChipRow}>
                        <TouchableOpacity
                          style={styles.locChip}
                          onPress={() => setLocModal({ title: "Pickup", latitude: ride.pickup_latitude, longitude: ride.pickup_longitude, address: ride.pickup_location || null })}
                        >
                          <Ionicons name="arrow-up-circle" size={16} color="#e2e8f0" />
                          <View style={styles.locTextCol}>
                            <Text style={styles.locLabel}>Pickup</Text>
                            <Text style={styles.locAddr} numberOfLines={1}>{shortAddr(ride.pickup_location)}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.locChip}
                          onPress={() => setLocModal({ title: "Dropoff", latitude: ride.dropoff_latitude, longitude: ride.dropoff_longitude, address: ride.dropoff_location || null })}
                        >
                          <Ionicons name="arrow-down-circle" size={16} color="#e2e8f0" />
                          <View style={styles.locTextCol}>
                            <Text style={styles.locLabel}>Dropoff</Text>
                            <Text style={styles.locAddr} numberOfLines={1}>{shortAddr(ride.dropoff_location)}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>

                      {tripKm != null ? (
                        <Text style={styles.reqMeta}>{tripKm.toFixed(1)} km trip</Text>
                      ) : null}

                      {onGoing || cancelled ? (
                        <View style={styles.reqActions}>
                          <TouchableOpacity style={[styles.actBtn, cancelled ? styles.clearBtn : styles.done]} onPress={() => onDone(ride)}>
                            <Text style={styles.actText}>{"Clear"}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <View style={styles.reqActions}>
                            <TouchableOpacity style={[styles.actBtn, styles.accept]} onPress={() => onConfirm(ride)}>
                              <Text style={styles.actText}>Confirm, I'm coming</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity style={[styles.actBtn, styles.withdrawBtn, styles.withdrawFull]} onPress={() => onWithdraw(ride)}>
                            <Text style={styles.withdrawText}>Withdraw</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Nearby requests</Text>
              <View style={[styles.wsDot, { backgroundColor: (wsStatus === "live" && profile.is_available) ? "#22c55e" : "#f59e0b" }]} />
            </View>
          </>
        }
        ListEmptyComponent={
          profile.is_available ? (
            <Text style={styles.empty}>No open requests nearby right now.</Text>
          ) : (
            <View style={styles.emptyToggleWrap}>
              <Text style={styles.emptyInline}>Turn on the</Text>
              <Switch
                value={false}
                disabled
                trackColor={{ true: "#16a34a", false: "#475569" }}
                thumbColor="#fff"
                style={styles.emptyToggle}
              />
              <Text style={styles.emptyInline}>to receive requests.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const myOffer = item.my_offer; // null | offer object
          const countered = myOffer && myOffer.status === "countered";
          const km = item.distance_km;
          const tripKm = haversineKm(
            { latitude: Number(item.pickup_latitude), longitude: Number(item.pickup_longitude) },
            { latitude: Number(item.dropoff_latitude), longitude: Number(item.dropoff_longitude) }
          );
          const stateColor = countered ? STATE_COLORS.countered : STATE_COLORS.offered;
          return (
            <View style={styles.reqCard}>
              {/* Top row: state label (left) + price (right). No offer yet → no label. */}
              {myOffer ? (
                <View style={styles.cardTop}>
                  {countered ? (
                    <>
                      <Text style={[styles.stateLabel, { color: stateColor }]}>Countered</Text>
                      <Text style={[styles.reqPrice, { color: stateColor }]}>
                        <Text style={[styles.priceStrike, { color: stateColor }]}>${myOffer.price}</Text>
                        {"  →  "}${myOffer.counter_price}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.stateLabel, { color: stateColor }]}>Offered</Text>
                      <Text style={[styles.reqPrice, { color: stateColor }]}>${myOffer.price}</Text>
                    </>
                  )}
                </View>
              ) : null}

              <View style={styles.locChipRow}>
                <TouchableOpacity
                  style={styles.locChip}
                  onPress={() => setLocModal({ title: "Pickup", latitude: item.pickup_latitude, longitude: item.pickup_longitude, address: item.pickup_location || null })}
                >
                  <Ionicons name="arrow-up-circle" size={16} color="#e2e8f0" />
                  <View style={styles.locTextCol}>
                    <Text style={styles.locLabel}>Pickup</Text>
                    <Text style={styles.locAddr} numberOfLines={1}>{shortAddr(item.pickup_location)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.locChip}
                  onPress={() => setLocModal({ title: "Dropoff", latitude: item.dropoff_latitude, longitude: item.dropoff_longitude, address: item.dropoff_location || null })}
                >
                  <Ionicons name="arrow-down-circle" size={16} color="#e2e8f0" />
                  <View style={styles.locTextCol}>
                    <Text style={styles.locLabel}>Dropoff</Text>
                    <Text style={styles.locAddr} numberOfLines={1}>{shortAddr(item.dropoff_location)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Info line under the route (omit unknown parts, no dangling dots) */}
              <Text style={styles.reqMeta}>
                {[
                  km != null ? `${km.toFixed(1)} km away` : null,
                  tripKm != null ? `${tripKm.toFixed(1)} km trip` : null,
                  `${item.offers_count} offer${item.offers_count === 1 ? "" : "s"}`,
                ].filter(Boolean).join(" · ")}
              </Text>

              {/* Offer state actions. A driver only makes an offer (and may
                  re-offer if the rider counters). The rider closes every deal. */}
              {!myOffer ? (
                <View style={styles.reqActions}>
                  <TouchableOpacity style={[styles.actBtn, styles.accept]} onPress={() => setPrompt({ kind: "offer", ride: item })}>
                    <Text style={styles.actText}>Make offer</Text>
                  </TouchableOpacity>
                </View>
              ) : countered ? (
                <>
                  <View style={styles.reqActions}>
                    <TouchableOpacity style={[styles.actBtn, styles.accept]} onPress={() => setPrompt({ kind: "offer", ride: item })}>
                      <Text style={styles.actText}>Re-offer</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.actBtn, styles.withdrawBtn, styles.withdrawFull]} onPress={() => onWithdraw(item)}>
                    <Text style={styles.withdrawText}>Withdraw</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.actBtn, styles.withdrawBtn, styles.withdrawFull]} onPress={() => onWithdraw(item)}>
                  <Text style={styles.withdrawText}>Withdraw</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <PromptModal
        visible={prompt?.kind === "recharge"}
        title="Recharge balance"
        message="Amount to add to your balance"
        placeholder="100"
        submitLabel="Add"
        onCancel={() => setPrompt(null)}
        onSubmit={submitRecharge}
      />
      <PromptModal
        visible={prompt?.kind === "offer"}
        title="Your offer"
        message="Set your price for this ride:"
        placeholder="e.g. 50"
        initialValue={
          prompt?.ride?.my_offer?.status === "countered"
            ? String(prompt.ride.my_offer.counter_price)
            : prompt?.ride?.my_offer
            ? String(prompt.ride.my_offer.price)
            : ""
        }
        submitLabel="Send offer"
        onCancel={() => setPrompt(null)}
        onSubmit={(text) => submitOffer(prompt.ride, text)}
      />

      <LocationModal
        visible={!!locModal}
        title={locModal?.title}
        latitude={locModal?.latitude}
        longitude={locModal?.longitude}
        address={locModal?.address}
        onClose={() => setLocModal(null)}
      />

      <RatingModal
        visible={!!ratingRide}
        title="Rate your rider"
        subtitle={ratingRide?.rider_name || undefined}
        destination={ratingRide?.dropoff_location || undefined}
        onSubmit={submitRiderRating}
        onIgnore={() => setRatingRide(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16, paddingTop: 24 },
  center: { justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topCard: { backgroundColor: "#1e293b", borderRadius: 16, padding: 18, marginBottom: 10 },
  label: { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  availText: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  balance: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 2 },
  rechargeBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  rechargeText: { color: "#fff", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#334155", marginTop: 14 },
  locBtn: { marginTop: 14, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  locBtnDisabled: { opacity: 0.6 },
  locText: { color: "#e2e8f0", fontWeight: "600" },
  modeHint: { color: "#64748b", fontSize: 12, marginTop: 2 },
  wsDot: { width: 9, height: 9, borderRadius: 5 },
  locLoading: { flexDirection: "row", alignItems: "center", gap: 8 },
  locIconSlot: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  locAddress: { color: "#94a3b8", fontSize: 12, marginTop: 8, textAlign: "center" },
  gearBtn: { marginLeft: 12, padding: 4 },
  activeSection: { marginTop: 20 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 10 },
  sectionTitle: { color: "#e2e8f0", fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  empty: { color: "#64748b", fontSize: 15, textAlign: "center", lineHeight: 22, marginTop: 30, paddingHorizontal: 20 },
  emptyToggleWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 30, paddingHorizontal: 20 },
  emptyInline: { color: "#64748b", fontSize: 15, lineHeight: 22 },
  emptyToggle: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  reqCard: { backgroundColor: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  stateLabel: { color: "#94a3b8", fontSize: 18, fontWeight: "800" },
  reqMeta: { color: "#94a3b8", fontSize: 13, marginTop: 8, textAlign: "center" },
  riderRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 16, marginTop: 6 },
  riderItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  riderName: { color: "#e2e8f0", fontSize: 15, fontWeight: "700" },
  reqPhone: { color: "#e2e8f0", fontSize: 15, fontWeight: "700", textDecorationLine: "underline" },
  reqPrice: { color: "#22c55e", fontSize: 18, fontWeight: "800" },
  priceStrike: { color: "#22c55e", textDecorationLine: "line-through", fontWeight: "800", fontSize: 18 },
  locChipRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  locChip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0f172a", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#334155",
  },
  locTextCol: { flex: 1 },
  locLabel: { color: "#e2e8f0", fontSize: 15, fontWeight: "700" },
  locAddr: { color: "#94a3b8", fontSize: 12, marginTop: 1 },
  reqActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  accept: { backgroundColor: "#16a34a" },
  done: { backgroundColor: "#0ea5e9" },
  clearBtn: { backgroundColor: "#475569" },
  actText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  withdrawBtn: { backgroundColor: "rgba(239,68,68,0.15)" },
  withdrawFull: { marginTop: 10 },
  withdrawText: { color: "#fca5a5", fontWeight: "700", fontSize: 15 },
});
