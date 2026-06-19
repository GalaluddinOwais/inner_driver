import * as SecureStore from "expo-secure-store";

const ACCESS = "access";
const REFRESH = "refresh";

export async function saveTokens({ access, refresh }) {
  if (access) await SecureStore.setItemAsync(ACCESS, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
}

export const getAccess = () => SecureStore.getItemAsync(ACCESS);
export const getRefresh = () => SecureStore.getItemAsync(REFRESH);

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}
