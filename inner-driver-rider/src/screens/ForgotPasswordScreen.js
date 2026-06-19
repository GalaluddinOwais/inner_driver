import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { requestPasswordReset, verifyPasswordReset } from "../api/rider";
import { apiError } from "../api/client";

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState("email"); // 'email' | 'reset'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSendCode() {
    if (!email.trim()) { Alert.alert("Email", "Enter your email."); return; }
    setBusy(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setStep("reset");
      Alert.alert("Check your email", res.message || "If an account exists, a reset code was sent.");
    } catch (e) {
      Alert.alert("Could not send code", apiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (!otp || !pw || !pw2) { Alert.alert("Missing info", "Fill in all fields."); return; }
    if (pw !== pw2) { Alert.alert("Passwords", "Passwords do not match."); return; }
    if (pw.length < 8) { Alert.alert("Password", "Use at least 8 characters."); return; }
    setBusy(true);
    try {
      await verifyPasswordReset(email.trim(), otp, pw, pw2);
      Alert.alert("Done", "Password reset. Please log in.", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
    } catch (e) {
      Alert.alert("Could not reset", apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>

      {step === "email" ? (
        <>
          <Text style={styles.hint}>Enter your account email — we'll send a code.</Text>
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity style={styles.btn} onPress={onSendCode} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send reset code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.hint}>Enter the code sent to {email} and your new password.</Text>
          <Field label="Reset code" value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="123456" />
          <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry placeholder="At least 8 characters" />
          <Field label="Confirm new password" value={pw2} onChangeText={setPw2} secureTextEntry />
          <TouchableOpacity style={styles.btn} onPress={onReset} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset password</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onSendCode} disabled={busy} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={styles.link}>Resend code</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, alignItems: "center" }}>
        <Text style={styles.link}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 24, justifyContent: "center" },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  hint: { color: "#94a3b8", fontSize: 14, marginBottom: 18, lineHeight: 20 },
  fieldLabel: { color: "#cbd5e1", fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#1e293b", color: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16 },
  btn: { backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#38bdf8", fontWeight: "700" },
});
