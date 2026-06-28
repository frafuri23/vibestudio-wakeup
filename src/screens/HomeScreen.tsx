import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, font, radii, spacing } from "../theme";
import { useStore } from "../store";
import { Alarm, HistoryEntry } from "../types";
import { formatTime, describeDays, describeNext } from "../time";
import { toneName, DIFFICULTY_META } from "../constants";

function haptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

// ── Calcola la streak di giorni consecutivi dalla cronologia ────────────────
function computeStreak(history: HistoryEntry[]): number {
  if (history.length === 0) return 0;
  const days = new Set(
    history.map((h) => {
      const d = new Date(h.dismissedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (days.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Banner streak motivazionale ─────────────────────────────────────────────
function StreakBanner({ streak }: { streak: number }) {
  if (streak === 0) return null;

  const messages: Record<number, string> = {
    1: "Ottimo inizio! Primo giorno completato.",
    2: "Già 2 giorni di fila — continua così!",
    3: "3 giorni consecutivi, non ti fermare!",
    7: "Una settimana intera — sei inarrestabile!",
  };

  const msg =
    messages[streak] ??
    (streak >= 30
      ? `${streak} giorni filati — leggendario!`
      : streak >= 14
      ? `${streak} giorni di fila — fantastico!`
      : streak >= 7
      ? `${streak} giorni consecutivi — ottimo ritmo!`
      : `Sei al ${streak}° giorno consecutivo — vai avanti!`);

  return (
    <View style={styles.streakBanner}>
      <Text style={styles.streakEmoji}>🔥</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.streakTitle}>Striscia di {streak} giorn{streak === 1 ? "o" : "i"}</Text>
        <Text style={styles.streakMsg}>{msg}</Text>
      </View>
    </View>
  );
}

// ── Riga sveglia ────────────────────────────────────────────────────────────
function AlarmRow({
  alarm,
  onPress,
  onToggle,
}: {
  alarm: Alarm;
  onPress: () => void;
  onToggle: (v: boolean) => void;
}) {
  const next = alarm.enabled ? describeNext(alarm) : "";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ flex: 1, opacity: alarm.enabled ? 1 : 0.45 }}>
        <View style={styles.timeRow}>
          <Text style={styles.alarmTime}>
            {formatTime(alarm.hour, alarm.minute)}
          </Text>
          {alarm.label ? (
            <Text style={styles.alarmLabel} numberOfLines={1}>
              {alarm.label}
            </Text>
          ) : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {describeDays(alarm.days)} · {toneName(alarm.toneId)}
        </Text>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Ionicons name="camera" size={12} color={theme.accent2} />
            <Text style={styles.tagText}>
              {DIFFICULTY_META[alarm.difficulty].objects} ogg.
            </Text>
          </View>
          {next ? (
            <View style={styles.tag}>
              <Ionicons name="time-outline" size={12} color={theme.mutedText} />
              <Text style={styles.tagText}>{next}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Switch
        value={alarm.enabled}
        onValueChange={(v) => {
          haptic();
          onToggle(v);
        }}
        trackColor={{ false: theme.surfaceAlt, true: theme.accent }}
        thumbColor="#fff"
        ios_backgroundColor={theme.surfaceAlt}
      />
    </Pressable>
  );
}

// ── Schermata principale ────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { alarms, history, toggleAlarm, startRinging } = useStore();
  const [testOpen, setTestOpen] = useState(false);

  const sorted = [...alarms].sort(
    (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)
  );
  const enabledCount = alarms.filter((a) => a.enabled).length;
  const maxWidth = width >= 700 ? 640 : width;
  const streak = useMemo(() => computeStreak(history), [history]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing(1),
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: spacing(2.5),
          width: maxWidth,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>SVEGLIE</Text>
            <Text style={styles.h1}>Buongiorno</Text>
            <Text style={styles.sub}>
              {enabledCount > 0
                ? `${enabledCount} sveglia${enabledCount > 1 ? "e attive" : " attiva"}`
                : "Nessuna sveglia attiva"}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </Pressable>
        </View>

        {/* Banner streak */}
        <StreakBanner streak={streak} />

        {/* Pannello test */}
        <Pressable
          onPress={() => setTestOpen((v) => !v)}
          style={styles.testToggle}
        >
          <Ionicons name="flask-outline" size={18} color={theme.accent2} />
          <Text style={styles.testToggleText}>Strumenti di test</Text>
          <Ionicons
            name={testOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.mutedText}
            style={{ marginLeft: "auto" }}
          />
        </Pressable>

        {testOpen ? (
          <View style={styles.testPanel}>
            <Text style={styles.testHint}>
              Simula una sveglia per provare subito la sfida fotografica.
            </Text>
            <View style={styles.testButtons}>
              {sorted.slice(0, 4).map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    haptic();
                    startRinging(a);
                  }}
                  style={({ pressed }) => [
                    styles.testBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="play" size={14} color="#04201d" />
                  <Text style={styles.testBtnText}>
                    {a.label
                      ? `${a.label} — ${formatTime(a.hour, a.minute)}`
                      : formatTime(a.hour, a.minute)}
                  </Text>
                </Pressable>
              ))}
              {sorted.length === 0 ? (
                <Text style={styles.testHint}>
                  Crea prima una sveglia con il pulsante +.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Lista sveglie */}
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="alarm-outline" size={40} color={theme.accent} />
            </View>
            <Text style={styles.emptyTitle}>Nessuna sveglia</Text>
            <Text style={styles.emptyText}>
              Tocca il pulsante + per creare la tua prima sveglia anti-snooze.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sorted.map((a) => (
              <AlarmRow
                key={a.id}
                alarm={a}
                onPress={() => navigation.navigate("EditAlarm", { id: a.id })}
                onToggle={(v) => toggleAlarm(a.id, v)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => {
          haptic();
          navigation.navigate("EditAlarm", {});
        }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing(3), opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing(2),
  },
  kicker: {
    color: theme.accent,
    fontSize: font.tiny,
    fontWeight: "800",
    letterSpacing: 2,
  },
  h1: { color: theme.text, fontSize: font.h1, fontWeight: "800", marginTop: 2 },
  sub: { color: theme.mutedText, fontSize: font.body, marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,184,77,0.12)",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing(2),
  },
  streakEmoji: { fontSize: 28 },
  streakTitle: {
    color: theme.warning,
    fontSize: font.small,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  streakMsg: {
    color: theme.mutedText,
    fontSize: font.tiny,
    marginTop: 2,
    lineHeight: 16,
  },
  testToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing(1.5),
  },
  testToggleText: { color: theme.text, fontSize: font.body, fontWeight: "600" },
  testPanel: {
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing(1.75),
    marginBottom: spacing(2),
    gap: 10,
  },
  testHint: { color: theme.mutedText, fontSize: font.small, lineHeight: 19 },
  testButtons: { gap: 8 },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.accent2,
    borderRadius: radii.sm,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  testBtnText: { color: "#04201d", fontSize: font.small, fontWeight: "700", flex: 1 },
  list: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing(2),
    gap: 12,
  },
  timeRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  alarmTime: { color: theme.text, fontSize: 34, fontWeight: "800", letterSpacing: 1 },
  alarmLabel: { color: theme.mutedText, fontSize: font.body, flexShrink: 1 },
  meta: { color: theme.faintText, fontSize: font.small, marginTop: 4 },
  tags: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { color: theme.mutedText, fontSize: font.tiny, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: spacing(8), gap: 12 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyTitle: { color: theme.text, fontSize: font.h2, fontWeight: "700" },
  emptyText: {
    color: theme.mutedText,
    fontSize: font.body,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: spacing(4),
  },
  fab: {
    position: "absolute",
    right: spacing(2.5),
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
