import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { getMe, updateUserProfile, requestPasswordOtp, verifyPasswordChange } from "../api/rider";
import { apiError } from "../api/client";

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);

  // Profile
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setFullName(me.full_name || "");
        setEmail(me.email || "");
        setPhone(me.phone_number || "");
      } catch (e) {
        Alert.alert("Error", apiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSaveProfile() {
    setSavingProfile(true);
    try {
      await updateUserProfile({ full_name: fullName, email, phone_number: phone });
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e) {
      Alert.alert("Could not save", apiError(e));
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSendOtp() {
    setSendingOtp(true);
    try {
      await requestPasswordOtp();
      setOtpSent(true);
      Alert.alert("OTP sent", "Check your email for the verification code.");
    } catch (e) {
      Alert.alert("Could not send OTP", apiError(e));
    } finally {
      setSendingOtp(false);
    }
  }

  async function onChangePassword() {
    if (!otp || !pw || !pw2) { Alert.alert("Missing info", "Fill in all fields."); return; }
    if (pw !== pw2) { Alert.alert("Passwords", "Passwords do not match."); return; }
    if (pw.length < 8) { Alert.alert("Password", "Use at least 8 characters."); return; }
    setChanging(true);
    try {
      await verifyPasswordChange(otp, pw, pw2);
      setOtp(""); setPw(""); setPw2(""); setOtpSent(false);
      Alert.alert("Done", "Your password has been changed.");
    } catch (e) {
      Alert.alert("Could not change password", apiError(e));
    } finally {
      setChanging(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Profile */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <Field label="Full name" value={fullName} onChangeText={setFullName} />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TouchableOpacity style={styles.btn} onPress={onSaveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save profile</Text>}
        </TouchableOpacity>
      </View>

      {/* Password */}
      <Text style={styles.sectionTitle}>Change password</Text>
      <View style={styles.card}>
        {!otpSent ? (
          <>
            <Text style={styles.hint}>We'll email you a one-time code to confirm.</Text>
            <TouchableOpacity style={styles.btn} onPress={onSendOtp} disabled={sendingOtp}>
              {sendingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send code to my email</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Field label="OTP code" value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="123456" />
            <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry placeholder="At least 8 characters" />
            <Field label="Confirm new password" value={pw2} onChangeText={setPw2} secureTextEntry />
            <TouchableOpacity style={styles.btn} onPress={onChangePassword} disabled={changing}>
              {changing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Change password</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onSendOtp} disabled={sendingOtp} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={styles.link}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
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
  container: { flex: 1, backgroundColor: "#0f172a", padding: 18 },
  sectionTitle: { color: "#e2e8f0", fontSize: 15, fontWeight: "800", marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: "#1e293b", borderRadius: 14, padding: 16 },
  hint: { color: "#94a3b8", fontSize: 13, marginBottom: 4, lineHeight: 18 },
  fieldLabel: { color: "#cbd5e1", fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#0f172a", color: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  btn: { backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#38bdf8", fontWeight: "700" },
});
