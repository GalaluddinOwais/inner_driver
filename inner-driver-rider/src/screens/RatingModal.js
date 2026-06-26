import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// A 1-5 star rating prompt. Ignorable: the X / "Ignore" button calls onIgnore.
// Picking stars + "Submit" calls onSubmit(score). Both close the modal.
// Usage:
//   <RatingModal visible title="Rate your rider" subtitle="Ahmed"
//     onSubmit={(score)=>...} onIgnore={()=>...} />
export default function RatingModal({ visible, title, subtitle, origin, destination, onSubmit, onIgnore }) {
  const [score, setScore] = useState(0);

  useEffect(() => { if (visible) setScore(0); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onIgnore}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* X to ignore */}
          <TouchableOpacity style={styles.close} onPress={onIgnore} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {origin ? <Text style={styles.dest} numberOfLines={1}>{origin}</Text> : null}
          {origin && destination ? (
            <Ionicons name="arrow-down" size={16} color="#64748b" style={styles.routeArrow} />
          ) : null}
          {destination ? <Text style={styles.dest} numberOfLines={1}>{destination}</Text> : null}

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setScore(n)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                <Ionicons
                  name={n <= score ? "star" : "star-outline"}
                  size={38}
                  color={n <= score ? "#facc15" : "#475569"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.ignore]} onPress={onIgnore}>
              <Text style={styles.ignoreText}>Ignore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.submit, score === 0 && styles.submitDisabled]}
              onPress={() => onSubmit(score)}
              disabled={score === 0}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 28 },
  card: { backgroundColor: "#1e293b", borderRadius: 16, padding: 22, paddingTop: 26 },
  close: { position: "absolute", top: 12, right: 12, padding: 4 },
  title: { color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#94a3b8", fontSize: 14, marginTop: 6, marginBottom: 14, textAlign: "center" },
  dest: { color: "#64748b", fontSize: 13, textAlign: "center" },
  routeArrow: { alignSelf: "center", marginTop: 2 },
  stars: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 20, marginBottom: 6 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  ignore: { backgroundColor: "#334155" },
  submit: { backgroundColor: "#2563eb" },
  submitDisabled: { opacity: 0.5 },
  ignoreText: { color: "#cbd5e1", fontWeight: "700" },
  submitText: { color: "#fff", fontWeight: "700" },
});
