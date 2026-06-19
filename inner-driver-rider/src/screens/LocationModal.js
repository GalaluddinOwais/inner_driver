import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { reverseGeocode } from "../location";

// Detail popup for a coordinate: shows the text address (reverse-geocoded if not
// passed in), the raw coordinates, and a "Show in Google Maps" deep-link.
// Props: { visible, title, latitude, longitude, address?, onClose }
export default function LocationModal({ visible, title, latitude, longitude, address, onClose }) {
  const [resolved, setResolved] = useState(address || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (address) { setResolved(address); return; }
    if (latitude == null || longitude == null) return;
    setLoading(true);
    reverseGeocode(Number(latitude), Number(longitude))
      .then((a) => setResolved(a))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, address, latitude, longitude]);

  function openInMaps() {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const url = Platform.select({
      ios: `https://maps.apple.com/?q=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {});
  }

  const coordText =
    latitude != null && longitude != null
      ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
      : "—";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title || "Location"}</Text>

          <Text style={styles.label}>Address</Text>
          {loading ? (
            <ActivityIndicator color="#38bdf8" style={{ alignSelf: "flex-start", marginTop: 4 }} />
          ) : (
            <Text style={styles.value}>{resolved || "No address found"}</Text>
          )}

          <Text style={styles.label}>Coordinates</Text>
          <Text style={[styles.value, styles.mono]}>{coordText}</Text>

          <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
            <Ionicons name="location" size={18} color="#fff" />
            <Text style={styles.mapsText}>Google Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 28 },
  card: { backgroundColor: "#1e293b", borderRadius: 16, padding: 22 },
  title: { color: "#fff", fontSize: 19, fontWeight: "800", marginBottom: 8 },
  label: { color: "#64748b", fontSize: 12, fontWeight: "700", marginTop: 14, textTransform: "uppercase" },
  value: { color: "#e2e8f0", fontSize: 15, marginTop: 4, lineHeight: 21 },
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  mapsBtn: { flexDirection: "row", gap: 8, backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center", marginTop: 20 },
  mapsText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  closeBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  closeText: { color: "#94a3b8", fontWeight: "600" },
});
