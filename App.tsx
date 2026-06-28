import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import Purchases from "react-native-purchases";

import { theme } from "./src/theme";
import { StoreProvider, useStore } from "./src/store";
import HomeScreen from "./src/screens/HomeScreen";
import EditAlarmScreen from "./src/screens/EditAlarmScreen";
import AlarmRingingScreen from "./src/screens/AlarmRingingScreen";
import ChallengeScreen from "./src/screens/ChallengeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import {
  requestNotificationPermission,
  syncAllNotifications,
} from "./src/notifications";
import { Alarm } from "./src/types";

const Stack = createNativeStackNavigator();

const ALARM_AUDIO_URI =
  "https://appspawn-gateway-production.up.railway.app/v1/files/9ad93083-cae4-44da-ac10-695beb605caf/mixkit-facility-alarm-sound-999.wav";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.bg,
    text: theme.text,
    primary: theme.accent,
    border: theme.border,
  },
};

// In primo piano: mostriamo il banner di sistema E suoniamo
// (l'overlay parte via addNotificationReceivedListener)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function useRevenueCat() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const key = process.env.REVENUECAT_API_KEY;
    if (!key) return;
    try {
      Purchases.configure({ apiKey: key });
    } catch {
      // ignora se non disponibile
    }
  }, []);
}

// Paywall iniziale non chiudibile
function PaywallIntro(props: any) {
  const { setOnboarded } = useStore();
  useEffect(() => {
    return () => setOnboarded(true);
  }, []);
  return (
    <PaywallScreen
      {...props}
      route={{ ...props.route, params: { dismissible: false } }}
    />
  );
}

function MainNavigator() {
  const { ready, onboarded, subscribed } = useStore();
  useRevenueCat();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  const showPaywallFirst = !onboarded && !subscribed;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
      initialRouteName={showPaywallFirst ? "PaywallIntro" : "Tabs"}
    >
      <Stack.Screen name="Tabs" component={HomeScreen} />
      <Stack.Screen
        name="EditAlarm"
        component={EditAlarmScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="PaywallIntro" component={PaywallIntro} />
    </Stack.Navigator>
  );
}

// ─── Overlay sveglia + sfida ────────────────────────────────────────────────
type OverlayPhase = "ringing" | "challenge";

async function setupAudioSession() {
  try {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      allowsRecordingIOS: false,
    });
  } catch {
    // ignora su web
  }
}

function RingingOverlay() {
  const { ringing, cancelRinging, dismissRinging } = useStore();
  const [phase, setPhase] = React.useState<OverlayPhase>("ringing");
  const soundRef = useRef<Audio.Sound | null>(null);
  const prevRingingId = useRef<string | null>(null);

  useEffect(() => {
    if (ringing && ringing.alarm.id !== prevRingingId.current) {
      prevRingingId.current = ringing.alarm.id;
      setPhase("ringing");
      if (Platform.OS !== "web") {
        setupAudioSession().then(() => {
          Audio.Sound.createAsync(
            { uri: ALARM_AUDIO_URI },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          )
            .then(({ sound }) => {
              soundRef.current = sound;
            })
            .catch(() => {});
        });
      }
    }
    if (!ringing) {
      prevRingingId.current = null;
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    }
  }, [ringing]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  if (!ringing) return null;

  function stopAlarmSound() {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {phase === "ringing" ? (
        <AlarmRingingScreen
          onChallenge={() => setPhase("challenge")}
          onCancel={() => {
            stopAlarmSound();
            cancelRinging();
          }}
        />
      ) : (
        <ChallengeScreen
          onDismiss={(attempts: number) => {
            stopAlarmSound();
            dismissRinging(attempts);
          }}
          onBack={() => setPhase("ringing")}
        />
      )}
    </View>
  );
}

// ─── Scheduler in-app (controlla ogni 30s quando l'app è aperta) ────────────
/**
 * Controlla se una sveglia deve scattare adesso.
 * Usa lo stesso sistema di giorni dell'app (0=Lunedì).
 */
function shouldAlarmRingNow(alarm: Alarm): boolean {
  if (!alarm.enabled) return false;
  const now = new Date();
  if (now.getHours() !== alarm.hour || now.getMinutes() !== alarm.minute) {
    return false;
  }
  if (alarm.days.length === 0) return true; // una sola volta
  const jsDay = now.getDay(); // 0=domenica
  const appDay = jsDay === 0 ? 6 : jsDay - 1; // 0=lunedì
  return alarm.days.includes(appDay as any);
}

function AlarmScheduler() {
  const { alarms, ringing, startRinging } = useStore();
  // tiene traccia degli id già fatti scattare in questo minuto
  const firedThisMinute = useRef<Set<string>>(new Set());
  const lastMinute = useRef<number>(-1);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const currentMinute = now.getHours() * 60 + now.getMinutes();

      // Resetta il set a ogni nuovo minuto
      if (currentMinute !== lastMinute.current) {
        lastMinute.current = currentMinute;
        firedThisMinute.current = new Set();
      }

      // Se c'è già una sveglia in corso non ne avviamo un'altra
      if (ringing) return;

      for (const alarm of alarms) {
        if (
          shouldAlarmRingNow(alarm) &&
          !firedThisMinute.current.has(alarm.id)
        ) {
          firedThisMinute.current.add(alarm.id);
          startRinging(alarm);
          break; // una sveglia alla volta
        }
      }
    };

    check(); // controllo immediato
    const interval = setInterval(check, 15_000); // ogni 15 secondi
    return () => clearInterval(interval);
  }, [alarms, ringing, startRinging]);

  return null;
}

// ─── Root con notifiche ─────────────────────────────────────────────────────
function AppRoot() {
  const { alarms, ready, startRinging } = useStore();
  const alarmsRef = useRef(alarms);
  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  // Richiedi permesso al primo avvio (una volta sola)
  useEffect(() => {
    if (!ready || Platform.OS === "web") return;
    requestNotificationPermission();
  }, [ready]);

  // Risincronizza le notifiche ogni volta che la lista sveglie cambia
  // (aggiunta, modifica, cancellazione, toggle)
  useEffect(() => {
    if (!ready || Platform.OS === "web") return;
    syncAllNotifications(alarms);
  }, [alarms, ready]);

  // App era CHIUSA — l'utente ha tappato la notifica per aprirla
  // getLastNotificationResponseAsync ritorna l'ultima risposta ancora "fresca"
  useEffect(() => {
    if (Platform.OS === "web" || !ready) return;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const alarmId = response.notification.request.content.data
        ?.alarmId as string | undefined;
      if (!alarmId) return;
      // Ritenta per massimo 5 s nel caso AsyncStorage non sia ancora pronto
      let tries = 0;
      const tryStart = () => {
        const alarm = alarmsRef.current.find((a) => a.id === alarmId);
        if (alarm && alarm.enabled) {
          startRinging(alarm);
          return;
        }
        if (++tries < 17) setTimeout(tryStart, 300);
      };
      tryStart();
    });
  }, [ready]);

  // App in PRIMO PIANO — notifica arrivata → mostra overlay direttamente
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const alarmId = notification.request.content.data
        ?.alarmId as string | undefined;
      if (!alarmId) return;
      const alarm = alarmsRef.current.find((a) => a.id === alarmId);
      if (alarm && alarm.enabled) startRinging(alarm);
    });
    return () => sub.remove();
  }, [startRinging]);

  // App in BACKGROUND — utente ha tappato la notifica
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const alarmId = response.notification.request.content.data
          ?.alarmId as string | undefined;
        if (!alarmId) return;
        let tries = 0;
        const tryStart = () => {
          const alarm = alarmsRef.current.find((a) => a.id === alarmId);
          if (alarm && alarm.enabled) {
            startRinging(alarm);
            return;
          }
          if (++tries < 17) setTimeout(tryStart, 300);
        };
        setTimeout(tryStart, 300); // piccolo delay per dare tempo allo store
      }
    );
    return () => sub.remove();
  }, [startRinging]);

  return (
    <>
      <NavigationContainer theme={navTheme}>
        <MainNavigator />
      </NavigationContainer>
      <AlarmScheduler />
      <RingingOverlay />
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <StoreProvider>
          <AppRoot />
        </StoreProvider>
      </View>
    </SafeAreaProvider>
  );
}
