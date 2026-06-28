import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alarm, HistoryEntry } from "./types";

const ALARMS_KEY = "@sveglia/alarms";
const HISTORY_KEY = "@sveglia/history";
const SUB_KEY = "@sveglia/subscribed";
const ONBOARD_KEY = "@sveglia/onboarded";

export async function loadAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  } catch {
    // ignora errori di scrittura
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignora
  }
}

export async function loadSubscribed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SUB_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function saveSubscribed(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SUB_KEY, value ? "1" : "0");
  } catch {
    // ignora
  }
}

export async function loadOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARD_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function saveOnboarded(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARD_KEY, value ? "1" : "0");
  } catch {
    // ignora
  }
}
