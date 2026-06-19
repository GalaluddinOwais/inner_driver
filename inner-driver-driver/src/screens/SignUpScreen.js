import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { registerDriver, getMe } from "../api/driver";
import { apiError } from "../api/client";
import { COLOR_CHOICES } from "../config";
import { VehiclePicker, ColorSwatches } from "./VehiclePicker";

export default function SignUpScreen({ navigation }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone_number: "", password: "", password_confirm: "",
  });
  const [vehicleTypeId, setVehicleTypeId] = useState(null); // selected VehicleModel id
  const [color, setColor] = useState(COLOR_CHOICES[0].hex);
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit() {
    if (!form.email || !form.password || !form.full_name) {
      Alert.alert("Missing info", "Name, email and password are required.");
      return;
    }
    if (form.password !== form.password_confirm) {
      Alert.alert("Passwords", "Passwords do not match.");
      return;
    }
    if (!vehicleTypeId) {
      Alert.alert("Vehicle", "Pick your vehicle brand and model.");
      return;
    }
    setBusy(true);
    try {
      await registerDriver({
        ...form,
        email: form.email.trim(),
        vehicle_type_id: vehicleTypeId,
        vehicle_color: color,
      });
      // registerDriver already saved tokens — confirm and route.
      const me = await getMe();
      if (me.user_type !== "driver") {
        Alert.alert("Error", "Account created but not a driver profile.");
        return;
      }
      navigation.replace("Home");
    } catch (e) {
      Alert.alert("Sign up failed", apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Create driver account</Text>

      <Field label="Full name" value={form.full_name} onChangeText={set("full_name")} />
      <Field label="Email" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Phone" value={form.phone_number} onChangeText={set("phone_number")} keyboardType="phone-pad" />
      <Field label="Password" value={form.password} onChangeText={set("password")} secureTextEntry />
      <Field label="Confirm password" value={form.password_confirm} onChangeText={set("password_confirm")} secureTextEntry />

      <VehiclePicker modelId={vehicleTypeId} onChange={setVehicleTypeId} />

      <Text style={styles.label}>Vehicle color</Text>
      <ColorSwatches value={color} onChange={setColor} />

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 18, alignItems: "center" }}>
        <Text style={styles.link}>Already have an account? <Text style={styles.linkStrong}>Log in</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...props} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 24 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 30, marginBottom: 20 },
  label: { color: "#cbd5e1", fontSize: 14, marginBottom: 6, marginTop: 4, fontWeight: "600" },
  input: {
    backgroundColor: "#1e293b", color: "#fff", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: "#1e293b", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "#334155",
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#cbd5e1", fontSize: 14, textTransform: "capitalize" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  button: {
    backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 22,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  link: { color: "#94a3b8", fontSize: 15 },
  linkStrong: { color: "#38bdf8", fontWeight: "700" },
  hint: { color: "#94a3b8", fontSize: 14 },
});
