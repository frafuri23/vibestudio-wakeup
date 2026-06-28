import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Alert } from "react-native";
import { Audio } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, font, radii, spacing } from "../theme";
import { useStore, newAlarm } from "../store";
import { Alarm, Difficulty, Weekday } from "../types";
import { WEEKDAY_LABELS, WEEKDAYS, ALL_DAYS, TONES, DIFFICULTY_META } from "../constants";
import { pad } from "../time";
import { PrimaryButton } from "../components/ui";

function haptic() {
  if (Platform.OS !== "web") {
    Haptics.selectionAsync().catch(() => {});
  }
}

function Stepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  const wrap = (v: number) => ((v % (max + 1)) + (max + 1)) % (max + 1);
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => {
          haptic();
          onChange(wrap(value + 1));
        }}
        style={({ pressed }) => [styles.stepBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="chevron-up" size={26} color={theme.text} />
      </Pressable>
      <Text style={styles.stepValue}>{pad(value)}</Text>
      <Pressable
        onPress={() => {
          haptic();
          onChange(wrap(value - 1));
        }}
        style={({ pressed }) => [styles.stepBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="chevron-down" size={26} color={theme.text} />
      </Pressable>
    </View>
  );
}

export default function EditAlarmScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { alarms, addAlarm, updateAlarm, deleteAlarm } = useStore();
  const editingId: string | undefined = route.params?.id;
  const existing = editingId ? alarms.find((a) => a.id === editingId) : undefined;

  const [draft, setDraft] = useState<Alarm>(existing ?? newAlarm());
  const [previewTone, setPreviewTone] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (patch: Partial<Alarm>) => setDraft((d) => ({ ...d, ...patch }));
  const maxWidth = width >= 700 ? 560 : width;

  const toggleDay = (d: Weekday) => {
    haptic();
    setDraft((cur) => {
      const has = cur.days.includes(d);
      const days = has ? cur.days.filter((x) => x !== d) : [...cur.days, d];
      return { ...cur, days };
    });
  };

  async function stopPreview() {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = null;
    setPreviewTone(null);
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }

  async function previewToneFn(toneId: string) {
    haptic();
    if (previewTone === toneId) {
      await stopPreview();
      return;
    }
    setPreviewTone(toneId);
    // Suono reale solo su device (expo-av è inerte nel preview web).
    if (Platform.OS !== "web") {
      try {
        await stopPreview();
        setPreviewTone(toneId);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          allowsRecordingIOS: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          {
            uri: "https://appspawn-gateway-production.up.railway.app/v1/files/9ad93083-cae4-44da-ac10-695beb605caf/mixkit-facility-alarm-sound-999.wav",
          },
          { shouldPlay: true, isLooping: false, volume: 1.0 }
        );
        soundRef.current = sound;
      } catch {}
    }
    // anteprima di 6 secondi
    previewTimer.current = setTimeout(() => {
      stopPreview();
    }, 6000);
  }

  function onSave() {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    stopPreview();
    if (existing) updateAlarm(draft);
    else addAlarm(draft);
    navigation.goBack();
  }

  function onDelete() {
    Alert.alert("Elimina sveglia", "Vuoi eliminare questa sveglia?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: () => {
          if (editingId) deleteAlarm(editingId);
          stopPreview();
          navigation.goBack();
        },
      },
    ]);
  }

  const difficulties: Difficulty[] = ["easy", "medium", "hard"];

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => { stopPreview(); navigation.goBack(); }} hitSlop={10}>
          <Text style={styles.cancel}>Annulla</Text>
        </Pressable>
        <Text style={styles.topTitle}>
          {existing ? "Modifica" : "Nuova sveglia"}
        </Text>
        <Pressable onPress={onSave} hitSlop={10}>
          <Text style={styles.save}>Salva</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: spacing(2.5),
          width: maxWidth,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Orario */}
        <View style={styles.clock}>
          <Stepper value={draft.hour} onChange={(h) => set({ hour: h })} max={23} />
          <Text style={styles.colon}>:</Text>
          <Stepper
            value={draft.minute}
            onChange={(m) => set({ minute: m })}
            max={59}
          />
        </View>

        {/* Giorni */}
        <Text style={styles.sectionTitle}>Ripeti</Text>
        <View style={styles.daysRow}>
          {WEEKDAY_LABELS.map((d) => {
            const active = draft.days.includes(d.key);
            return (
              <Pressable
                key={d.key}
                onPress={() => toggleDay(d.key)}
                style={[styles.dayBtn, active && styles.dayBtnActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>
                  {d.short}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.quickDays}>
          <Pressable onPress={() => { haptic(); set({ days: [] }); }} style={styles.quick}>
            <Text style={styles.quickText}>Una volta</Text>
          </Pressable>
          <Pressable onPress={() => { haptic(); set({ days: [...WEEKDAYS] }); }} style={styles.quick}>
            <Text style={styles.quickText}>Feriali</Text>
          </Pressable>
          <Pressable onPress={() => { haptic(); set({ days: [...ALL_DAYS] }); }} style={styles.quick}>
            <Text style={styles.quickText}>Ogni giorno</Text>
          </Pressable>
        </View>

        {/* Nome */}
        <Text style={styles.sectionTitle}>Nome</Text>
        <TextInput
          value={draft.label}
          onChangeText={(t) => set({ label: t })}
          placeholder="Es. Lavoro, Palestra…"
          placeholderTextColor={theme.faintText}
          style={styles.input}
          maxLength={30}
        />

        {/* Difficoltà */}
        <Text style={styles.sectionTitle}>Difficoltà sfida</Text>
        <View style={styles.diffRow}>
          {difficulties.map((d) => {
            const active = draft.difficulty === d;
            const meta = DIFFICULTY_META[d];
            return (
              <Pressable
                key={d}
                onPress={() => { haptic(); set({ difficulty: d }); }}
                style={[styles.diffCard, active && styles.diffCardActive]}
              >
                <Text style={[styles.diffLabel, active && { color: "#fff" }]}>
                  {meta.label}
                </Text>
                <Text style={[styles.diffSub, active && { color: "#e8e6ff" }]}>
                  {meta.objects} ogg.
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Suoneria */}
        <Text style={styles.sectionTitle}>Suoneria</Text>
        <View style={styles.tones}>
          {TONES.map((t) => {
            const selected = draft.toneId === t.id;
            const playing = previewTone === t.id;
            return (
              <View key={t.id} style={styles.toneRow}>
                <Pressable
                  onPress={() => { haptic(); set({ toneId: t.id }); }}
                  style={styles.toneSelect}
                >
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selected ? theme.accent : theme.faintText}
                  />
                  <Text style={styles.toneName}>{t.name}</Text>
                </Pressable>
                <Pressable
                  onPress={() => previewToneFn(t.id)}
                  style={styles.previewBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={playing ? "stop" : "play"}
                    size={16}
                    color={playing ? theme.danger : theme.accent2}
                  />
                  <Text style={[styles.previewText, playing && { color: theme.danger }]}>
                    {playing ? "Stop" : "Prova"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        {Platform.OS === "web" ? (
          <Text style={styles.hint}>
            L'anteprima audio si sente sul dispositivo. Nell'anteprima web il
            timer di 6 secondi parte ugualmente.
          </Text>
        ) : null}

        {existing ? (
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
            <Text style={styles.deleteText}>Elimina sveglia</Text>
          </Pressable>
        ) : null}

        <PrimaryButton
          label={existing ? "Salva modifiche" : "Crea sveglia"}
          onPress={onSave}
          style={{ marginTop: spacing(2) }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(2.5),
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cancel: { color: theme.mutedText, fontSize: font.body },
  topTitle: { color: theme.text, fontSize: font.h3, fontWeight: "700" },
  save: { color: theme.accent, fontSize: font.body, fontWeight: "700" },
  clock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing(4),
  },
  stepper: { alignItems: "center", gap: 4 },
  stepBtn: {
    width: 64,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    color: theme.text,
    fontSize: 64,
    fontWeight: "200",
    fontVariant: ["tabular-nums"],
    width: 96,
    textAlign: "center",
  },
  colon: { color: theme.text, fontSize: 56, fontWeight: "200", marginHorizontal: 4 },
  sectionTitle: {
    color: theme.mutedText,
    fontSize: font.small,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing(3),
    marginBottom: spacing(1.5),
  },
  daysRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: 999,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  dayText: { color: theme.mutedText, fontSize: font.body, fontWeight: "700" },
  dayTextActive: { color: "#fff" },
  quickDays: { flexDirection: "row", gap: 8, marginTop: 12 },
  quick: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickText: { color: theme.mutedText, fontSize: font.small, fontWeight: "600" },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.text,
    fontSize: font.h3,
  },
  diffRow: { flexDirection: "row", gap: 10 },
  diffCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  diffCardActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  diffLabel: { color: theme.text, fontSize: font.body, fontWeight: "700" },
  diffSub: { color: theme.mutedText, fontSize: font.tiny },
  tones: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  toneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  toneSelect: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toneName: { color: theme.text, fontSize: font.body, fontWeight: "600" },
  previewBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  previewText: { color: theme.accent2, fontSize: font.small, fontWeight: "700" },
  hint: { color: theme.faintText, fontSize: font.tiny, marginTop: 10, lineHeight: 16 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing(3),
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.danger,
  },
  deleteText: { color: theme.danger, fontSize: font.body, fontWeight: "700" },
});
