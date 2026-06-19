import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haversineKm } from "../location";

// Expo Go-friendly fallback for the map. Two modes:
//  - No active ride: list of nearby drivers (🚗 single-ride, 🚌 multi) + distance.
//  - Active ride: a contextual status view (offers coming / waiting / tracking),
//    NOT the nearby-drivers list.
// Swap this for a real react-native-maps MapView in a dev build.
export default function DiscoverMap({ riderLoc, drivers = [], driverLive, driverAddress, activeRide, wsStatus }) {
  if (activeRide) {
    const confirmed = activeRide.status === "confirmed";
    const assigned = activeRide.status === "assigned";
    const bigIconName = confirmed
      ? (activeRide.driver_single_ride_mode ? "car-sport" : "bus")
      : assigned ? "hourglass" : "radio";
    return (
      <View style={[styles.wrap, styles.center]}>
        <Ionicons name={bigIconName} size={56} color={confirmed ? "#e2e8f0" : "#38bdf8"} style={styles.bigIcon} />
        <Text style={styles.activeTitle}>
          {confirmed ? "Driver on the way" : assigned ? "Driver chosen — confirming" : "Finding you a ride"}
        </Text>
        <Text style={styles.activeSub}>
          {confirmed
            ? riderLoc && driverLive
              ? `~${haversineKm(riderLoc, driverLive)?.toFixed(1)} km away`
              : "Sharing the driver's location"
            : assigned
            ? "Waiting for the driver to confirm"
            : "Drivers near you are sending offers"}
        </Text>
        {confirmed && driverAddress ? (
          <View style={styles.activeAddrCol}>
            <Ionicons name="location" size={22} color="#e2e8f0" />
            <Text style={styles.activeAddr}>{driverAddress}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const withDist = drivers
    .map((d) => {
      const loc =
        d.current_latitude != null && d.current_longitude != null
          ? { latitude: Number(d.current_latitude), longitude: Number(d.current_longitude) }
          : null;
      return { ...d, _km: loc && riderLoc ? haversineKm(riderLoc, loc) : null };
    })
    .sort((a, b) => (a._km ?? 1e9) - (b._km ?? 1e9));

  return (
    <View style={styles.wrap}>
      {riderLoc ? (
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{drivers.length} drivers nearby</Text>
          <View style={[styles.wsDot, { backgroundColor: wsStatus === "live" ? "#22c55e" : "#f59e0b" }]} />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
        {!riderLoc ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={40} color="#64748b" />
            <Text style={styles.empty}>Enable location to see nearby drivers.</Text>
          </View>
        ) : withDist.length === 0 ? (
          <Text style={styles.empty}>No available drivers within 10 kilometers right now.</Text>
        ) : (
          withDist.map((d, i) => (
            <View key={i} style={styles.row}>
              <Ionicons name={d.single_ride_mode ? "car-sport" : "bus"} size={24} color="#e2e8f0" />
              <Text style={styles.kind}>{d.single_ride_mode ? "Private" : "Bus"}</Text>
              <Text style={styles.dist}>{d._km != null ? `${d._km.toFixed(1)} km` : "—"}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: 16, paddingTop: 90 },
  center: { justifyContent: "center", alignItems: "center" },
  bigIcon: { marginBottom: 12 },
  activeTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  activeSub: { color: "#94a3b8", fontSize: 14, marginTop: 6, textAlign: "center", paddingHorizontal: 24 },
  activeAddrCol: { alignItems: "center", gap: 6, marginTop: 14, paddingHorizontal: 24 },
  activeAddr: { color: "#e2e8f0", fontSize: 14, fontWeight: "600", textAlign: "center" },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  heading: { color: "#e2e8f0", fontSize: 16, fontWeight: "800" },
  wsDot: { width: 9, height: 9, borderRadius: 5 },
  empty: { color: "#64748b", fontSize: 14, marginTop: 20, textAlign: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 4 },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b",
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
  },
  kind: { color: "#fff", fontSize: 15, fontWeight: "600", flex: 1 },
  dist: { color: "#38bdf8", fontSize: 15, fontWeight: "800" },
});
