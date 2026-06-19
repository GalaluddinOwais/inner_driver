import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import LoginScreen from "./src/screens/LoginScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import HomeScreen from "./src/screens/HomeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import LocationPicker from "./src/screens/LocationPicker";
import { getAccess } from "./src/auth/tokens";
import { setOnAuthFailure } from "./src/api/client";

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    (async () => {
      const token = await getAccess();
      setInitialRoute(token ? "Home" : "Login");
    })();

    setOnAuthFailure(() => {
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    });
    return () => setOnAuthFailure(null);
  }, []);

  if (!initialRoute) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center" }}>
          <ActivityIndicator color="#38bdf8" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#fff",
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#0f172a" },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign up" }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Forgot password" }} />
        <Stack.Screen name="LocationPicker" component={LocationPicker} options={{ title: "Set pickup & dropoff" }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
