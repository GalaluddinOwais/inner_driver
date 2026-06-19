// react-native-maps is a Paper (legacy) native component. Under the New
// Architecture (Fabric), its AIRMap views must be registered with the legacy
// interop layer, otherwise you get "View config not found for component AIRMap".
// See react-native-maps README → "Configuration for Fabric / New Architecture".
const AIR_MAP_COMPONENTS = [
  "AIRMap",
  "AIRMapCallout",
  "AIRMapCalloutSubview",
  "AIRMapCircle",
  "AIRMapHeatmap",
  "AIRMapLocalTile",
  "AIRMapMarker",
  "AIRMapOverlay",
  "AIRMapPolygon",
  "AIRMapPolyline",
  "AIRMapUrlTile",
  "AIRMapWMSTile",
];

module.exports = {
  project: {
    android: { unstable_reactLegacyComponentNames: AIR_MAP_COMPONENTS },
    ios: { unstable_reactLegacyComponentNames: AIR_MAP_COMPONENTS },
  },
};
