import AsyncStorage from "@react-native-async-storage/async-storage";

const LOGS_KEY = "interaction_logs";

export async function logInteraction(action, metadata = {}) {
  const currentLogs = await getInteractionLogs();

  const newLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    action,
    metadata,
    timestamp: new Date().toISOString(),
  };

  const updatedLogs = [...currentLogs, newLog];

  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));

  return newLog;
}

export async function getInteractionLogs() {
  const rawLogs = await AsyncStorage.getItem(LOGS_KEY);
  return rawLogs ? JSON.parse(rawLogs) : [];
}

export async function clearInteractionLogs() {
  await AsyncStorage.removeItem(LOGS_KEY);
}
