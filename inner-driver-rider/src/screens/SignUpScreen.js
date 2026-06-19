import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { registerRider, getMe } from "../api/rider";
import { apiError } from "../api/client";

export default function SignUpScreen({ navigation }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone_number: "", password: "", password_confirm: "",
  });
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
    setBusy(true);
    try {
      await registerRider({ ...form, email: form.email.trim() });
      const me = await getMe();
      if (me.user_type !== "rider") {
        Alert.alert("Error", "Account created but not a rider profile.");
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
      <Text style={styles.title}>Create rider account</Text>

      <Field label="Full name" value={form.full_name} onChangeText={set("full_name")} />
      <Field label="Email" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Phone" value={form.phone_number} onChangeText={set("phone_number")} keyboardType="phone-pad" />
      <Field label="Password" value={form.password} onChangeText={set("password")} secureTextEntry />
      <Field label="Confirm password" value={form.password_confirm} onChangeText={set("password_confirm")} secureTextEntry />

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
  button: { backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 22 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  link: { color: "#94a3b8", fontSize: 15 },
  linkStrong: { color: "#38bdf8", fontWeight: "700" },
});
