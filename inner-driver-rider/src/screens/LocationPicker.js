import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker /* , PROVIDER_GOOGLE */ } from "react-native-maps";
import { getCurrentLocation, reverseGeocode } from "../location";

// Full-screen map to set pickup (draggable, starts at current GPS) and dropoff
// (tap to place). On confirm, returns both points (+ addresses) to the caller via
// route.params.onConfirm({ pickup, dropoff }).
//
// NOTE: react-native-maps only renders in a DEV BUILD (not Expo Go).
export default function LocationPicker({ navigation, route }) {
  const onConfirm = route.params?.onConfirm;
  const initialLoc = route.params?.initialLoc; // rider's known location (fallback map center)
  const insets = useSafeAreaInsets();

  const [region, setRegion] = useState(null);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [pickupAddr, setPickupAddr] = useState(null);
  const [dropoffAddr, setDropoffAddr] = useState(null);
  const [pickupGeocoding, setPickupGeocoding] = useState(false); // reverse-geocode in flight
  const [mode, setMode] = useState("pickup"); // which pin the next tap sets
  const mapRef = useRef(null);

  // Ask FIRST whether to use the current location as pickup — before fetching GPS.
  //  - Yes: fetch GPS, center there, place the pickup pin.
  //  - No:  center on the rider's known location (passed in) and let them tap.
  useEffect(() => {
    setMode("pickup"); // keep pickup selected by default; user switches to dropoff manually

    // Center the map immediately so it renders while the user decides. Falls back
    // to a wide default region if the rider's location isn't known yet.
    setRegion(
      initialLoc
        ? { ...initialLoc, latitudeDelta: 0.02, longitudeDelta: 0.02 }
        : { latitude: 30.0444, longitude: 31.2357, latitudeDelta: 0.2, longitudeDelta: 0.2 } // Cairo fallback
    );

    Alert.alert(
      "Pickup point",
      "Use your current location as the pickup point?",
      [
        { text: "No, I'll choose", style: "cancel" },
        {
          text: "Yes, use it",
          onPress: async () => {
            try {
              const loc = await getCurrentLocation();
              setRegion({ ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 });
              setPickup(loc);
              setMode("dropoff"); // pickup set — next tap places the dropoff
              setPickupGeocoding(true);
              reverseGeocode(loc.latitude, loc.longitude)
                .then(setPickupAddr)
                .catch(() => {})
                .finally(() => setPickupGeocoding(false));
            } catch (e) {
              Alert.alert("Location needed", `${e.message}. Tap the map to place your pickup.`);
            }
          },
        },
      ]
    );
  }, []);

  function onMapPress(e) {
    const c = e.nativeEvent.coordinate;
    if (mode === "pickup") {
      setPickup(c);
      reverseGeocode(c.latitude, c.longitude).then(setPickupAddr).catch(() => {});
    } else {
      setDropoff(c);
      reverseGeocode(c.latitude, c.longitude).then(setDropoffAddr).catch(() => {});
    }
  }

  function onDragPickup(e) {
    const c = e.nativeEvent.coordinate;
    setPickup(c);
    reverseGeocode(c.latitude, c.longitude).then(setPickupAddr).catch(() => {});
  }
  function onDragDropoff(e) {
    const c = e.nativeEvent.coordinate;
    setDropoff(c);
    reverseGeocode(c.latitude, c.longitude).then(setDropoffAddr).catch(() => {});
  }

  function confirm() {
    if (!pickup || !dropoff) {
      Alert.alert("Set both points", "Tap the map to place your dropoff.");
      return;
    }
    onConfirm?.({
      pickup: { ...pickup, address: pickupAddr },
      dropoff: { ...dropoff, address: dropoffAddr },
    });
    navigation.goBack();
  }

  if (!region) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color="#38bdf8" size="large" />
        <Text style={styles.hint}>Getting your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <MapView
        ref={mapRef}
        style={styles.fill}
        // provider={PROVIDER_GOOGLE}  // re-enable once a BILLED Google Maps key is set (app.json + AndroidManifest). Default provider needs no key.
        initialRegion={region}
        showsUserLocation
        onPress={onMapPress}
      >
        {pickup ? (
          <Marker coordinate={pickup} draggable onDragEnd={onDragPickup} pinColor="green" title="Pickup" />
        ) : null}
        {dropoff ? (
          <Marker coordinate={dropoff} draggable onDragEnd={onDragDropoff} pinColor="red" title="Dropoff" />
        ) : null}
      </MapView>

      {/* Top instruction + which pin you're placing */}
      <View style={styles.topCard}>
        <View style={styles.topTextRow}>
          <Text style={styles.topText}>{mode === "pickup" ? "Tap to set Pickup" : "Tap to set Dropoff"}</Text>
        </View>
        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.chip, mode === "pickup" && styles.chipActive]} onPress={() => setMode("pickup")}>
            <Ionicons name="arrow-up-circle" size={16} color="#e2e8f0" />
            <Text style={styles.chipText}>Pickup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, mode === "dropoff" && styles.chipActive]} onPress={() => setMode("dropoff")}>
            <Ionicons name="arrow-down-circle" size={16} color="#e2e8f0" />
            <Text style={styles.chipText}>Dropoff</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom summary + confirm */}
      <View style={[styles.bottomCard, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.addrRow}>
          <Ionicons name="arrow-up-circle" size={16} color="#e2e8f0" />
          {pickupGeocoding ? (
            <ActivityIndicator color="#94a3b8" size="small" style={{ marginLeft: 2 }} />
          ) : (
            <Text style={styles.addrLine} numberOfLines={1}>{pickupAddr || (pickup ? "Pin placed" : "Tap the map")}</Text>
          )}
        </View>
        <View style={styles.addrRow}>
          <Ionicons name="arrow-down-circle" size={16} color="#e2e8f0" />
          <Text style={styles.addrLine} numberOfLines={1}>{dropoffAddr || (dropoff ? "Pin placed" : "Tap the map")}</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmBtn, (!pickup || !dropoff) && styles.confirmDisabled]}
          onPress={confirm}
          disabled={!pickup || !dropoff}
        >
          <Text style={styles.confirmText}>Confirm locations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0f172a" },
  center: { justifyContent: "center", alignItems: "center" },
  hint: { color: "#94a3b8", marginTop: 10 },
  topCard: {
    position: "absolute", top: 14, left: 14, right: 14,
    backgroundColor: "#1e293b", borderRadius: 12, padding: 12,
  },
  topTextRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 8 },
  topText: { color: "#fff", fontWeight: "700", fontSize: 15, textAlign: "center" },
  modeRow: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#334155" },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#e2e8f0", fontWeight: "700" },
  bottomCard: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#1e293b", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18,
  },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  addrLine: { color: "#cbd5e1", fontSize: 14, flex: 1 },
  confirmBtn: { backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 10 },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
