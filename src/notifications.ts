/**
 * notifications.ts
 *
 * Strategia "5 bump":
 * - Per ogni sveglia attiva, per ogni giorno selezionato, pianifichiamo
 *   5 notifiche settimanali a +0, +1, +2, +3, +4 minuti dall'orario.
 *   Se l'utente ignora la prima, continua a riceverne ogni minuto per 4 minuti.
 * - Id pattern: alarm-<id>-day<appDay>-bump<0..4>  → cancellazione selettiva.
 * - Sveglia una sola volta (days vuoto): 5 notifiche one-shot a +0..+4 min.
 * - Sul web: noop su tutto.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Alarm } from "./types";

// app: 0=Lun,1=Mar,...,6=Dom  →  JS Date.getDay(): 0=Dom,1=Lun,...,6=Sab
function appToJsDay(appDay: number): number {
  return appDay === 6 ? 0 : appDay + 1;
}

// JS getDay() → Expo WEEKLY weekday (1=Dom,2=Lun,...,7=Sab)
function jsDayToExpoWeekday(jsDay: number): number {
  return jsDay === 0 ? 1 : jsDay + 1;
}

/** Configura il canale Android ad alta priorità (no-op su iOS/web). */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("alarms", {
    name: "Sveglie",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#7c6cff",
  });
}

/** Richiede il permesso notifiche. Restituisce true se concesso. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await setupNotificationChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Cancella tutte le notifiche pianificate per questa sveglia. */
export async function cancelAlarmNotifications(alarmId: string): Promise<void> {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled
    .filter((n) => n.identifier.startsWith(`alarm-${alarmId}-`))
    .map((n) => n.identifier);
  await Promise.all(
    toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id))
  );
}

/** Cancella TUTTE le notifiche sveglia pianificate. */
export async function cancelAllAlarmNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled
    .filter((n) => n.identifier.startsWith("alarm-"))
    .map((n) => n.identifier);
  await Promise.all(
    toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id))
  );
}

/**
 * Pianifica le notifiche per una sveglia attiva (strategia 5-bump).
 * Sostituisce quelle esistenti per la stessa sveglia.
 */
export async function scheduleAlarmNotifications(alarm: Alarm): Promise<void> {
  if (Platform.OS === "web") return;
  if (!alarm.enabled) {
    await cancelAlarmNotifications(alarm.id);
    return;
  }

  await cancelAlarmNotifications(alarm.id);

  const label = alarm.label || "Sveglia";
  const BUMPS = 5; // 0..4 minuti in più

  if (alarm.days.length === 0) {
    // ── Sveglia una sola volta: 5 notifiche one-shot ──────────────────────
    const now = new Date();
    for (let bump = 0; bump < BUMPS; bump++) {
      const trigger = new Date();
      trigger.setHours(alarm.hour, alarm.minute + bump, 0, 0);
      if (trigger <= now) {
        trigger.setDate(trigger.getDate() + 1);
      }
      await Notifications.scheduleNotificationAsync({
        identifier: `alarm-${alarm.id}-once-bump${bump}`,
        content: {
          title: bump === 0 ? `⏰ ${label}` : `⏰ ${label} (ancora!)`,
          body: "Alzati e fotografa un oggetto per spegnere la sveglia!",
          sound: "default",
          data: { alarmId: alarm.id },
          ...(Platform.OS === "android" ? { channelId: "alarms" } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
        },
      });
    }
    return;
  }

  // ── Sveglia ricorrente: 5 bump × ogni giorno selezionato ─────────────────
  for (const appDay of alarm.days) {
    const jsDay = appToJsDay(appDay);
    const expoWeekday = jsDayToExpoWeekday(jsDay);

    for (let bump = 0; bump < BUMPS; bump++) {
      // Calcola ora:minuto con overflow minuti
      let h = alarm.hour;
      let m = alarm.minute + bump;
      if (m >= 60) {
        h = (h + 1) % 24;
        m = m - 60;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: `alarm-${alarm.id}-day${appDay}-bump${bump}`,
        content: {
          title: bump === 0 ? `⏰ ${label}` : `⏰ ${label} (ancora!)`,
          body:
            bump === 0
              ? "Alzati e fotografa un oggetto per spegnere la sveglia!"
              : "La sveglia aspetta ancora — fotografa un oggetto!",
          sound: "default",
          data: { alarmId: alarm.id },
          ...(Platform.OS === "android" ? { channelId: "alarms" } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour: h,
          minute: m,
        },
      });
    }
  }
}

/**
 * Risincronizza TUTTE le notifiche in base alla lista corrente di sveglie.
 * Da chiamare: al primo avvio, dopo ogni modifica/cancellazione sveglia.
 */
export async function syncAllNotifications(alarms: Alarm[]): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelAllAlarmNotifications();
  await Promise.all(
    alarms.filter((a) => a.enabled).map((a) => scheduleAlarmNotifications(a))
  );
}
