import { useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
} from "react-native";
import { colors } from "../../constants/colors";

interface PremiumButtonProps {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger";
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export default function PremiumButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  accessibilityLabel,
  style,
}: PremiumButtonProps) {
  const [scale] = useState(() => new Animated.Value(1));

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          styles.base,
          isOutline && styles.outline,
          isDanger && styles.danger,
          !isOutline && !isDanger && styles.primary,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={isOutline ? colors.primary : colors.white} />
        ) : (
          <Text
            style={[
              styles.label,
              isOutline && styles.outlineLabel,
              isDanger && styles.dangerLabel,
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  outline: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  disabled: { opacity: 0.6 },
  label: { color: colors.white, fontSize: 16, fontWeight: "700" },
  outlineLabel: { color: colors.primary },
  dangerLabel: { color: colors.danger },
});
