import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, font, radii, spacing } from "../theme";
import { useStore } from "../store";
import { verifyPhoto, aiReady } from "../ai";
import { PrimaryButton, SecondaryButton } from "../components/ui";
import { OBJECT_EMOJI } from "../constants";

type Phase = "shooting" | "checking" | "wrong" | "success";

interface Props {
  // dall'overlay App.tsx
  onDismiss?: (attempts: number) => void;
  onBack?: () => void;
  // dalla navigazione stack (legacy)
  navigation?: any;
}

export default function ChallengeScreen({ onDismiss, onBack, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { ringing, dismissRinging, cancelRinging } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("shooting");
  const [photo, setPhoto] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [attempts, setAttempts] = useState(0);
  const hasKey = aiReady();

  // animazione successo
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === "success") {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      successScale.setValue(0);
      successOpacity.setValue(0);
    }
  }, [phase]);

  // Se la sveglia viene annullata altrove
  useEffect(() => {
    if (!ringing) {
      if (navigation) navigation.popToTop();
    }
  }, [ringing, navigation]);

  if (!ringing) return <View style={styles.container} />;

  const objects = ringing.objects;
  const target = objects[index] ?? objects[0];
  const total = objects.length;
  const emoji = OBJECT_EMOJI[target] ?? "📷";

  async function handleResult(dataUrl: string) {
    setPhase("checking");
    setPhoto(dataUrl);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (!hasKey) {
      setFeedback(
        "Manca la chiave AI. Aggiungi ANTHROPIC_API_KEY (o OPENAI_API_KEY / OPENROUTER_API_KEY) in Environment."
      );
      setPhase("wrong");
      return;
    }

    const result = await verifyPhoto(dataUrl, target);

    if (result.error) {
      setFeedback(result.error);
      setPhase("wrong");
      return;
    }

    if (result.ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setPhase("success");

      // dopo 1.4s passa al prossimo oggetto o chiude
      setTimeout(() => {
        if (index + 1 >= total) {
          // tutti trovati: spegni la sveglia
          if (onDismiss) {
            onDismiss(newAttempts);
          } else {
            dismissRinging(newAttempts);
            if (navigation) navigation.popToTop();
          }
        } else {
          setIndex((i) => i + 1);
          setPhoto(null);
          setFeedback("");
          setPhase("shooting");
        }
      }, 1400);
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      setFeedback(
        result.reason || `Non sembra ${target}. Riprova!`
      );
      setPhase("wrong");
    }
  }

  async function takePhotoNative() {
    try {
      if (!cameraRef.current) return;
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });
      if (pic?.base64) {
        await handleResult(`data:image/jpeg;base64,${pic.base64}`);
      }
    } catch {
      setFeedback("Errore con la fotocamera. Riprova.");
      setPhase("wrong");
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setFeedback("Serve l'accesso alla galleria.");
      setPhase("wrong");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });
    if (!res.canceled && res.assets?.[0]?.base64) {
      await handleResult(`data:image/jpeg;base64,${res.assets[0].base64}`);
    }
  }

  function retry() {
    setPhoto(null);
    setFeedback("");
    setPhase("shooting");
  }

  function goBack() {
    // Torna alla sveglia che suona (non annulla, riprende a suonare)
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────
  const Header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={goBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color="rgba(255,255,255,0.7)" />
      </Pressable>
      {/* Barra progresso */}
      <View style={styles.progressBar}>
        {objects.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i < index && styles.segmentDone,
              i === index && styles.segmentActive,
            ]}
          />
        ))}
      </View>
      <View style={{ width: 26 }} />
    </View>
  );

  // ── Target box ──────────────────────────────────────────────────────────
  const TargetBox = (
    <View style={styles.targetBox}>
      <Text style={styles.targetKicker}>
        OGGETTO {index + 1} DI {total}
      </Text>
      <Text style={styles.targetEmoji}>{emoji}</Text>
      <Text style={styles.targetText}>Fotografa {target}</Text>
    </View>
  );

  // ── Stato: verifica in corso ─────────────────────────────────────────────
  if (phase === "checking") {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.preview} />
          ) : null}
          <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 24 }} />
          <Text style={styles.checkingText}>L'IA sta analizzando la foto…</Text>
        </View>
      </View>
    );
  }

  // ── Stato: successo ──────────────────────────────────────────────────────
  if (phase === "success") {
    const remaining = total - (index + 1);
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.successCircle,
              { transform: [{ scale: successScale }], opacity: successOpacity },
            ]}
          >
            <Ionicons name="checkmark" size={56} color="#fff" />
          </Animated.View>
          <Text style={styles.successTitle}>
            {remaining > 0 ? "Trovato!" : "Sveglia disattivata!"}
          </Text>
          <Text style={styles.successSub}>
            {remaining > 0
              ? `Mancano ancora ${remaining} oggett${remaining > 1 ? "i" : "o"}`
              : "Bravissimo, ti sei alzato dal letto!"}
          </Text>
        </View>
      </View>
    );
  }

  // ── Stato: sbagliato ─────────────────────────────────────────────────────
  if (phase === "wrong") {
    return (
      <View style={styles.container}>
        {Header}
        <ScrollView
          contentContainerStyle={[
            styles.center,
            { paddingBottom: insets.bottom + 40 },
          ]}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.preview} />
          ) : null}
          <View style={styles.wrongIcon}>
            <Ionicons name="close" size={36} color="#fff" />
          </View>
          <Text style={styles.wrongTitle}>Non ci siamo</Text>
          <Text style={styles.wrongText}>{feedback}</Text>
          {TargetBox}
          {!hasKey ? (
            <Text style={styles.keyHint}>
              Aggiungi ANTHROPIC_API_KEY (o OPENAI_API_KEY / OPENROUTER_API_KEY)
              in Environment per attivare la verifica.
            </Text>
          ) : null}
          <PrimaryButton
            label="Riprova"
            onPress={retry}
            icon={<Ionicons name="refresh" size={20} color="#fff" />}
            style={{ width: "100%", marginTop: 20 }}
          />
        </ScrollView>
      </View>
    );
  }

  // ── Stato: scatto ────────────────────────────────────────────────────────
  const isWeb = Platform.OS === "web";

  if (!isWeb && permission && !permission.granted) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.center}>
          <View style={styles.permIcon}>
            <Ionicons name="camera-outline" size={40} color={theme.accent} />
          </View>
          <Text style={styles.wrongTitle}>Accesso fotocamera</Text>
          <Text style={styles.wrongText}>
            Per la sfida anti-snooze serve la fotocamera.
          </Text>
          {permission.canAskAgain ? (
            <PrimaryButton
              label="Consenti fotocamera"
              onPress={requestPermission}
              style={{ width: "100%", marginTop: 20 }}
            />
          ) : (
            <SecondaryButton
              label="Apri Impostazioni"
              onPress={() => Linking.openSettings()}
              style={{ width: "100%", marginTop: 20 }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sfondo fotocamera */}
      {!isWeb && permission?.granted ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webCam]}>
          <Text style={styles.webCamEmoji}>{emoji}</Text>
          <Text style={styles.webCamText}>
            Fotocamera disponibile sul dispositivo
          </Text>
          <Text style={styles.webCamSub}>
            Nell'anteprima puoi caricare un'immagine dalla galleria
          </Text>
        </View>
      )}

      {/* Overlay UI */}
      <View style={styles.overlay} pointerEvents="box-none">
        {Header}
        {TargetBox}

        <View
          style={[
            styles.controls,
            { paddingBottom: insets.bottom + spacing(4) },
          ]}
        >
          {isWeb ? (
            <View style={{ width: "100%", gap: 10 }}>
              <PrimaryButton
                label="Carica una foto"
                onPress={pickFromLibrary}
                icon={<Ionicons name="image" size={20} color="#fff" />}
              />
            </View>
          ) : (
            <View style={styles.shutterRow}>
              <Pressable
                onPress={pickFromLibrary}
                style={styles.sideBtn}
                hitSlop={10}
              >
                <Ionicons name="images-outline" size={24} color="#fff" />
              </Pressable>
              <Pressable onPress={takePhotoNative} style={styles.shutter}>
                <View style={styles.shutterInner} />
              </Pressable>
              <View style={styles.sideBtn} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(2),
    paddingBottom: 10,
  },
  progressBar: { flexDirection: "row", gap: 6, flex: 1, marginHorizontal: 12 },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  segmentActive: { backgroundColor: theme.accent },
  segmentDone: { backgroundColor: theme.success ?? "#34d399" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  webCam: {
    backgroundColor: "#0c0e16",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  webCamEmoji: { fontSize: 72 },
  webCamText: { color: "#fff", fontSize: font.h2, fontWeight: "700" },
  webCamSub: {
    color: theme.faintText,
    fontSize: font.small,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  targetBox: {
    backgroundColor: "rgba(12,14,22,0.88)",
    marginHorizontal: spacing(2),
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(124,108,255,0.3)",
  },
  targetKicker: {
    color: theme.accent2,
    fontSize: font.tiny,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  targetEmoji: { fontSize: 48, marginVertical: 4 },
  targetText: {
    color: "#fff",
    fontSize: font.h2,
    fontWeight: "800",
    textAlign: "center",
  },
  controls: { paddingHorizontal: spacing(2.5) },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
  },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(3),
    gap: 8,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: theme.surface,
  },
  checkingText: {
    color: theme.mutedText,
    fontSize: font.body,
    marginTop: 16,
  },
  wrongIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.danger ?? "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 4,
  },
  wrongTitle: { color: "#fff", fontSize: font.h2, fontWeight: "800" },
  wrongText: {
    color: theme.mutedText,
    fontSize: font.body,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 4,
  },
  keyHint: {
    color: theme.warning ?? "#f59e0b",
    fontSize: font.small,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  permIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.success ?? "#34d399",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: theme.success ?? "#34d399",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  successTitle: {
    color: "#fff",
    fontSize: font.h1,
    fontWeight: "800",
  },
  successSub: {
    color: theme.mutedText,
    fontSize: font.body,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 4,
  },
});
