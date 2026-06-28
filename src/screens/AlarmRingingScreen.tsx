import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, font, spacing } from "../theme";
import { useStore } from "../store";
import { formatTime } from "../time";
import { toneName } from "../constants";
import { PrimaryButton } from "../components/ui";

interface Props {
  onChallenge?: () => void;
  onCancel?: () => void;
  navigation?: any;
}

export default function AlarmRingingScreen({ onChallenge, onCancel, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { ringing, cancelRinging } = useStore();
  const pulse = useRef(new Animated.Value(0)).current;
  const outerPulse = useRef(new Animated.Value(0)).current;
  const [now, setNow] = useState(new Date());
  const hapticTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // animazione pulsazione doppia
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const outerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(outerPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(outerPulse, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    outerLoop.start();

    const clock = setInterval(() => setNow(new Date()), 1000);

    // Haptic ripetuto sul device (l'audio è gestito dall'overlay in App.tsx)
    if (Platform.OS !== "web") {
      hapticTimer.current = setInterval(() => {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        ).catch(() => {});
      }, 1500);
    }

    return () => {
      loop.stop();
      outerLoop.stop();
      clearInterval(clock);
      if (hapticTimer.current) clearInterval(hapticTimer.current);
    };
  }, [pulse, outerPulse]);

  if (!ringing) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.32] });
  const outerScale = outerPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const outerOpacity = outerPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.18, 0] });

  function handleDisattiva() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
    // L'audio NON si ferma qui: continua nella schermata Challenge
    if (onChallenge) {
      onChallenge();
    } else if (navigation) {
      navigation.replace("Challenge");
    }
  }

  function handleCancel() {
    // L'audio viene fermato dall'overlay in App.tsx prima di chiamare cancelRinging
    if (onCancel) {
      onCancel();
    } else {
      cancelRinging();
    }
  }

  return (
    <LinearGradient
      colors={["#1a1430", "#0a0c14"]}
      style={styles.container}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + spacing(5),
            paddingBottom: insets.bottom + spacing(4),
          },
        ]}
      >
        {/* Orario in alto */}
        <View style={styles.top}>
          {/* Animazione campana */}
          <View style={styles.bellWrap}>
            <Animated.View
              style={[
                styles.ringOuter,
                { transform: [{ scale: outerScale }], opacity: outerOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                { transform: [{ scale }] },
              ]}
            />
            <View style={styles.bellInner}>
              <Ionicons name="alarm" size={52} color="#fff" />
            </View>
          </View>

          <Text style={styles.time}>
            {formatTime(now.getHours(), now.getMinutes())}
          </Text>
          <Text style={styles.label}>
            {ringing.alarm.label || "Sveglia"}
          </Text>
          <Text style={styles.tone}>{toneName(ringing.alarm.toneId)}</Text>
        </View>

        {/* Sezione inferiore */}
        <View style={styles.bottom}>
          {/* Hint oggetti */}
          <View style={styles.objectsHint}>
            <View style={styles.objectsHintRow}>
              <Ionicons name="camera-outline" size={18} color={theme.accent2} />
              <Text style={styles.hintTitle}>
                {ringing.objects.length === 1
                  ? "1 oggetto da trovare"
                  : `${ringing.objects.length} oggetti da trovare`}
              </Text>
            </View>
            <View style={styles.objectsList}>
              {ringing.objects.map((obj, i) => (
                <View key={i} style={styles.objectChip}>
                  <Text style={styles.objectChipText}>{obj}</Text>
                </View>
              ))}
            </View>
          </View>

          <PrimaryButton
            label="Disattiva"
            onPress={handleDisattiva}
            icon={<Ionicons name="power" size={20} color="#fff" />}
          />

          <Pressable onPress={handleCancel} style={styles.cancelBtn} hitSlop={12}>
            <Text style={styles.cancelText}>Annulla simulazione</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing(3),
    alignItems: "center",
  },
  top: { alignItems: "center", gap: 8 },
  bellWrap: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2),
  },
  ringOuter: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.accent,
  },
  ring: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: theme.accent,
    opacity: 0.55,
  },
  bellInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    color: "#fff",
    fontSize: 78,
    fontWeight: "200",
    letterSpacing: 2,
    marginTop: spacing(1),
  },
  label: { color: "#fff", fontSize: font.h2, fontWeight: "700" },
  tone: { color: theme.mutedText, fontSize: font.body },
  bottom: { width: "100%", maxWidth: 460, gap: 14 },
  objectsHint: {
    backgroundColor: "rgba(74,214,200,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(74,214,200,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  objectsHintRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hintTitle: {
    color: theme.accent2,
    fontSize: font.body,
    fontWeight: "700",
  },
  objectsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  objectChip: {
    backgroundColor: "rgba(74,214,200,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(74,214,200,0.3)",
  },
  objectChipText: {
    color: "#fff",
    fontSize: font.small,
    fontWeight: "600",
  },
  cancelBtn: { alignItems: "center", paddingVertical: 4 },
  cancelText: {
    color: theme.faintText,
    fontSize: font.small,
    textAlign: "center",
  },
});
