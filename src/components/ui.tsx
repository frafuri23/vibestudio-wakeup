import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { theme, radii, font, spacing } from "../theme";

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={styles.primaryLabel}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  tone = "neutral",
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  tone?: "neutral" | "danger";
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        { opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text
          style={[
            styles.secondaryLabel,
            tone === "danger" && { color: theme.danger },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  primary: {
    backgroundColor: theme.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: "#fff", fontSize: font.h3, fontWeight: "700" },
  secondary: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryLabel: { color: theme.text, fontSize: font.body, fontWeight: "600" },
  card: {
    backgroundColor: theme.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing(2),
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  pillText: { color: theme.mutedText, fontSize: font.small, fontWeight: "600" },
  pillTextActive: { color: "#fff" },
});
