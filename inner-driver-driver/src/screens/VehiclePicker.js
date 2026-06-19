import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { listVehicleBrands, listVehicleModels } from "../api/driver";
import { COLOR_CHOICES } from "../config";

// Cascading brand → model picker.
//  - props.modelId: currently selected VehicleModel id (or null)
//  - props.onChange(modelId): called when the user picks a model
//  - props.initialBrandId: optional, pre-open this brand's models (e.g. in Settings)
export function VehiclePicker({ modelId, onChange, initialBrandId = null }) {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(initialBrandId);
  const [models, setModels] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setBrands(await listVehicleBrands());
      } catch {
        /* surfaced by the empty state below */
      } finally {
        setLoadingBrands(false);
      }
    })();
  }, []);

  // Is the selected brand the global "Other" brand?
  const selectedBrand = brands.find((b) => b.id === brandId);
  const isOtherBrand = (selectedBrand?.name || "").toLowerCase() === "other";

  // Load models whenever a brand is selected.
  useEffect(() => {
    if (brandId == null) { setModels([]); return; }
    let cancelled = false;
    setLoadingModels(true);
    listVehicleModels(brandId)
      .then((m) => {
        if (cancelled) return;
        setModels(m);
        // For the "Other" brand, skip the model step — auto-pick its "Other" model.
        if (isOtherBrand && m.length) onChange(m[0].id);
      })
      .catch(() => { if (!cancelled) setModels([]); })
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [brandId, isOtherBrand]);

  return (
    <View>
      <Text style={styles.label}>Vehicle brand</Text>
      {loadingBrands ? (
        <ActivityIndicator color="#38bdf8" style={{ marginVertical: 10 }} />
      ) : brands.length === 0 ? (
        <Text style={styles.hint}>No brands on the server yet.</Text>
      ) : (
        <View style={styles.chips}>
          {brands.map((b) => (
            <Chip
              key={b.id}
              label={b.name}
              active={b.id === brandId}
              onPress={() => { setBrandId(b.id); onChange(null); }} // reset model when brand changes
            />
          ))}
        </View>
      )}

      {brandId != null && !isOtherBrand ? (
        <>
          <Text style={styles.label}>Vehicle model</Text>
          {loadingModels ? (
            <ActivityIndicator color="#38bdf8" style={{ marginVertical: 10 }} />
          ) : models.length === 0 ? (
            <Text style={styles.hint}>No models for this brand.</Text>
          ) : (
            <View style={styles.chips}>
              {models.map((m) => (
                <Chip
                  key={m.id}
                  label={m.model}
                  active={m.id === modelId}
                  onPress={() => onChange(m.id)}
                />
              ))}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

// Color palette shown as tappable swatches. Saves/returns the hex string.
export function ColorSwatches({ value, onChange }) {
  return (
    <View style={styles.swatchRow}>
      {COLOR_CHOICES.map((c) => {
        const active = (value || "").toUpperCase() === c.hex.toUpperCase();
        return (
          <TouchableOpacity
            key={c.hex}
            onPress={() => onChange(c.hex)}
            style={[styles.swatch, { backgroundColor: c.hex }, active && styles.swatchActive]}
            accessibilityLabel={c.name}
          >
            {active ? <Text style={[styles.check, isLight(c.hex) ? styles.checkDark : styles.checkLight]}>✓</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Rough luminance check so the ✓ stays visible on light swatches.
function isLight(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={active}            // already-selected chip isn't tappable
      activeOpacity={active ? 1 : 0.2}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: { color: "#cbd5e1", fontSize: 14, marginBottom: 6, marginTop: 10, fontWeight: "600" },
  hint: { color: "#94a3b8", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: "#1e293b", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "#334155",
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#cbd5e1", fontSize: 14 },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8, marginTop: 4 },
  swatch: {
    width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#334155",
  },
  swatchActive: { borderWidth: 3, borderColor: "#38bdf8" },
  check: { fontSize: 18, fontWeight: "900" },
  checkLight: { color: "#fff" },
  checkDark: { color: "#111827" },
});
