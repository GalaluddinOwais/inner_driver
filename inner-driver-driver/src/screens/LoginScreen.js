import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { login, getMe } from "../api/driver";
import { apiError } from "../api/client";
import { clearTokens } from "../auth/tokens";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      const me = await getMe();
      if (me.user_type !== "driver") {
        await clearTokens();
        Alert.alert("Wrong app", "This account is not a driver. Use the rider app.");
        return;
      }
      navigation.replace("Home");
    } catch (e) {
      Alert.alert("Login failed", apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Inner Driver</Text>
      <Text style={styles.subtitle}>Driver</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={onLogin} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={[styles.linkWrap, { marginTop: 14 }]}>
        <Text style={styles.linkStrong}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignUp")} style={styles.linkWrap}>
        <Text style={styles.link}>No account? <Text style={styles.linkStrong}>Sign up as driver</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 24, justifyContent: "center" },
  brand: { color: "#fff", fontSize: 34, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#38bdf8", fontSize: 16, textAlign: "center", marginBottom: 36, fontWeight: "600" },
  input: {
    backgroundColor: "#1e293b", color: "#fff", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, marginBottom: 14,
  },
  button: {
    backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 6,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  linkWrap: { marginTop: 22, alignItems: "center" },
  link: { color: "#94a3b8", fontSize: 15 },
  linkStrong: { color: "#38bdf8", fontWeight: "700" },
});
