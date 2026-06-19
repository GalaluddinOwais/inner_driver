import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";

// Cross-platform numeric prompt (Alert.prompt is iOS-only, so we use a Modal).
// Usage: <PromptModal visible title ... onSubmit={(value)=>...} onCancel={...} />
export default function PromptModal({
  visible, title, message, placeholder, initialValue = "", submitLabel = "OK", onSubmit, onCancel,
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
            autoFocus
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.ok]} onPress={() => onSubmit(value)}>
              <Text style={styles.okText}>{submitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 28 },
  card: { backgroundColor: "#1e293b", borderRadius: 16, padding: 22 },
  title: { color: "#fff", fontSize: 19, fontWeight: "800" },
  message: { color: "#94a3b8", fontSize: 14, marginTop: 6 },
  input: {
    backgroundColor: "#0f172a", color: "#fff", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 18, marginTop: 16,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  cancel: { backgroundColor: "#334155" },
  ok: { backgroundColor: "#2563eb" },
  cancelText: { color: "#cbd5e1", fontWeight: "700" },
  okText: { color: "#fff", fontWeight: "700" },
});
