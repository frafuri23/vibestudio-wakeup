import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, font, radii, spacing } from "../theme";
import { useStore } from "../store";
import { PrimaryButton } from "../components/ui";

const ENTITLEMENT = "premium";

const BENEFITS = [
  { icon: "infinite", text: "Sveglie illimitate" },
  { icon: "camera", text: "Sfide foto a difficoltà multipla" },
  { icon: "musical-notes", text: "Tutte le suonerie" },
  { icon: "stats-chart", text: "Cronologia completa dei risvegli" },
];

export default function PaywallScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { setSubscribed } = useStore();
  const dismissible = route.params?.dismissible !== false;
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Platform.OS === "web") {
        // RevenueCat non gira nel preview: mostriamo un piano di esempio
        setLoading(false);
        return;
      }
      try {
        const offerings = await Purchases.getOfferings();
        const pkgs = offerings.current?.availablePackages ?? [];
        if (mounted) {
          setPackages(pkgs);
          setSelected(pkgs[0]?.identifier ?? null);
        }
      } catch {
        // ignora
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function finish() {
    setSubscribed(true);
    if (dismissible) navigation.goBack();
    else navigation.replace("Tabs");
  }

  async function subscribe() {
    if (Platform.OS === "web" || packages.length === 0) {
      // anteprima: simula acquisto
      finish();
      return;
    }
    const pkg =
      packages.find((p) => p.identifier === selected) ?? packages[0];
    try {
      setPurchasing(true);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[ENTITLEMENT]) {
        finish();
      }
    } catch (e: any) {
      if (
        e?.code !== Purchases.PURCHASES_ERROR_CODE?.PURCHASE_CANCELLED_ERROR
      ) {
        // errore reale: lascia la schermata aperta
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function restore() {
    if (Platform.OS === "web") {
      finish();
      return;
    }
    try {
      const info = await Purchases.restorePurchases();
      if (Object.keys(info.entitlements.active).length > 0) finish();
    } catch {}
  }

  return (
    <LinearGradient colors={["#221a3d", "#0c0e16"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing(2),
          paddingBottom: insets.bottom + spacing(3),
          paddingHorizontal: spacing(3),
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {dismissible ? (
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.close}
            hitSlop={10}
          >
            <Ionicons name="close" size={24} color={theme.mutedText} />
          </Pressable>
        ) : (
          <View style={{ height: 24 }} />
        )}

        <View style={styles.badge}>
          <Ionicons name="alarm" size={34} color="#fff" />
        </View>
        <Text style={styles.title}>Sveglia Premium</Text>
        <Text style={styles.subtitle}>
          Alzati davvero ogni mattina. Sblocca tutte le funzioni anti-snooze.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon as any} size={18} color={theme.accent2} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Piano */}
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: 24 }} />
        ) : packages.length > 0 ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            {packages.map((p) => {
              const active = selected === p.identifier;
              return (
                <Pressable
                  key={p.identifier}
                  onPress={() => setSelected(p.identifier)}
                  style={[styles.plan, active && styles.planActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>{p.product.title}</Text>
                    <Text style={styles.planDesc}>
                      {p.product.description}
                    </Text>
                  </View>
                  <Text style={styles.planPrice}>{p.product.priceString}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={[styles.plan, styles.planActive, { marginTop: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>Premium mensile</Text>
              <Text style={styles.planDesc}>
                7 giorni gratis, poi rinnovo automatico
              </Text>
            </View>
            <Text style={styles.planPrice}>€4,99</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <Text style={styles.trial}>
          Prova gratuita di 7 giorni · poi €4,99/mese · disdici quando vuoi
        </Text>

        <PrimaryButton
          label="Inizia la prova gratuita"
          onPress={subscribe}
          loading={purchasing}
          style={{ marginTop: 12 }}
        />

        <View style={styles.footerLinks}>
          <Text style={styles.footerLink} onPress={restore}>
            Ripristina
          </Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerLink}>Termini</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerLink}>Privacy</Text>
        </View>

        {!dismissible ? (
          <Text style={styles.skip} onPress={() => navigation.replace("Tabs")}>
            Continua con il piano gratuito
          </Text>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  close: { alignSelf: "flex-end" },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 8,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 16,
  },
  subtitle: {
    color: theme.mutedText,
    fontSize: font.body,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  benefits: { marginTop: spacing(3), gap: 14 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(74,214,200,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { color: theme.text, fontSize: font.body, fontWeight: "500" },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: theme.border,
    padding: 16,
  },
  planActive: { borderColor: theme.accent },
  planTitle: { color: theme.text, fontSize: font.body, fontWeight: "700" },
  planDesc: { color: theme.mutedText, fontSize: font.small, marginTop: 2 },
  planPrice: { color: "#fff", fontSize: font.h3, fontWeight: "800" },
  trial: {
    color: theme.faintText,
    fontSize: font.tiny,
    textAlign: "center",
    marginTop: 20,
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  footerLink: { color: theme.mutedText, fontSize: font.small },
  footerDot: { color: theme.faintText },
  skip: {
    color: theme.mutedText,
    fontSize: font.body,
    textAlign: "center",
    marginTop: 18,
    fontWeight: "600",
  },
});
