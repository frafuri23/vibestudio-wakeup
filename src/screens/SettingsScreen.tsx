import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, font, radii, spacing } from "../theme";
import { useStore } from "../store";
import { formatTime } from "../time";

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.row,
        onPress && pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? theme.danger : theme.accent}
      />
      <Text style={[styles.rowLabel, danger && { color: theme.danger }]}>
        {label}
      </Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.faintText} />
      ) : null}
    </Wrapper>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { subscribed, setSubscribed, history } = useStore();
  const [restoring, setRestoring] = useState(false);
  const maxWidth = width >= 700 ? 640 : width;

  async function restore() {
    if (Platform.OS === "web") {
      // nel preview RevenueCat non gira: simuliamo
      setSubscribed(true);
      return;
    }
    try {
      setRestoring(true);
      const info = await Purchases.restorePurchases();
      const active = Object.keys(info.entitlements.active).length > 0;
      setSubscribed(active);
    } catch {
      // ignora
    } finally {
      setRestoring(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        <Text style={styles.topTitle}>Impostazioni</Text>
        <View style={{ width: 26 }} />
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
        {/* Abbonamento */}
        <View style={[styles.subCard, subscribed ? styles.subActive : null]}>
          <View style={styles.subTop}>
            <Ionicons
              name={subscribed ? "checkmark-circle" : "star"}
              size={24}
              color={subscribed ? theme.success : theme.warning}
            />
            <Text style={styles.subTitle}>
              {subscribed ? "Premium attivo" : "Piano gratuito"}
            </Text>
          </View>
          <Text style={styles.subText}>
            {subscribed
              ? "Hai accesso a sveglie illimitate e a tutte le difficoltà della sfida."
              : "Sblocca sveglie illimitate, tutte le suonerie e le sfide difficili."}
          </Text>
          {!subscribed ? (
            <Pressable
              onPress={() => navigation.navigate("Paywall")}
              style={styles.upgradeBtn}
            >
              <Text style={styles.upgradeText}>Passa a Premium</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Abbonamento</Text>
        <View style={styles.group}>
          <Row
            icon="card-outline"
            label="Gestisci piano"
            onPress={() =>
              Linking.openURL(
                Platform.OS === "ios"
                  ? "https://apps.apple.com/account/subscriptions"
                  : "https://play.google.com/store/account/subscriptions"
              ).catch(() => {})
            }
          />
          <Row
            icon="refresh-outline"
            label={restoring ? "Ripristino…" : "Ripristina acquisti"}
            onPress={restore}
          />
        </View>

        <Text style={styles.sectionTitle}>Cronologia risvegli</Text>
        <View style={styles.group}>
          {history.length === 0 ? (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={20} color={theme.faintText} />
              <Text style={styles.rowLabel}>Nessun risveglio registrato</Text>
            </View>
          ) : (
            history.slice(0, 8).map((h) => {
              const d = new Date(h.dismissedAt);
              return (
                <View key={h.id} style={styles.row}>
                  <Ionicons name="sunny-outline" size={20} color={theme.accent2} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{h.label}</Text>
                    <Text style={styles.historyMeta}>
                      {h.objects.join(", ")}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>
                    {formatTime(d.getHours(), d.getMinutes())}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.sectionTitle}>Supporto</Text>
        <View style={styles.group}>
          <Row
            icon="help-circle-outline"
            label="Centro assistenza"
            onPress={() =>
              Linking.openURL("https://example.com/supporto").catch(() => {})
            }
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy"
            onPress={() =>
              Linking.openURL("https://example.com/privacy").catch(() => {})
            }
          />
          <Row
            icon="document-text-outline"
            label="Termini di servizio"
            onPress={() =>
              Linking.openURL("https://example.com/termini").catch(() => {})
            }
          />
        </View>

        {subscribed && Platform.OS === "web" ? (
          <Pressable
            onPress={() => setSubscribed(false)}
            style={styles.devRow}
          >
            <Text style={styles.devText}>
              (Anteprima) Reimposta a piano gratuito
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.version}>Sveglia Caccia Oggetti · v1.0</Text>
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
  },
  topTitle: { color: theme.text, fontSize: font.h3, fontWeight: "700" },
  subCard: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing(2.5),
    gap: 10,
    marginTop: 8,
  },
  subActive: { borderColor: theme.success },
  subTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  subTitle: { color: theme.text, fontSize: font.h3, fontWeight: "800" },
  subText: { color: theme.mutedText, fontSize: font.small, lineHeight: 20 },
  upgradeBtn: {
    backgroundColor: theme.accent,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  },
  upgradeText: { color: "#fff", fontSize: font.body, fontWeight: "700" },
  sectionTitle: {
    color: theme.mutedText,
    fontSize: font.small,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing(3),
    marginBottom: spacing(1.5),
  },
  group: {
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  rowLabel: { color: theme.text, fontSize: font.body, fontWeight: "500" },
  rowValue: { color: theme.mutedText, fontSize: font.small, marginLeft: "auto" },
  historyMeta: { color: theme.faintText, fontSize: font.tiny, marginTop: 2 },
  devRow: { paddingVertical: 16, alignItems: "center" },
  devText: { color: theme.faintText, fontSize: font.small },
  version: {
    color: theme.faintText,
    fontSize: font.tiny,
    textAlign: "center",
    marginTop: spacing(4),
  },
});
