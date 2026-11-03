import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Rect, Path } from "react-native-svg";
import { colors } from "../../constants/colors";

interface AIHeroRobotProps {
  size?: number;
}

/**
 * Minimal, premium AI-assistant mark for the auth experience only (never
 * reused as the main-app watermark). A soft geometric robot face, not a
 * cartoon character, with a gentle idle float.
 */
export default function AIHeroRobot({ size = 150 }: AIHeroRobotProps) {
  const [float] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <View style={[styles.wrap, { width: size * 1.6, height: size * 1.4 }]}>
      <View style={[styles.glow, { width: size * 1.3, height: size * 1.3, borderRadius: size }]} />
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          {/* antenna */}
          <Path d="M60 10 V24" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" />
          <Circle cx="60" cy="7" r="5" fill={colors.accent} />

          {/* head */}
          <Rect x="20" y="24" width="80" height="62" rx="22" fill={colors.primaryDeep} />
          <Rect x="28" y="32" width="64" height="46" rx="16" fill={colors.card} opacity={0.96} />

          {/* eyes */}
          <Circle cx="48" cy="55" r="7" fill={colors.primary} />
          <Circle cx="72" cy="55" r="7" fill={colors.primary} />

          {/* smile */}
          <Path
            d="M48 68 Q60 76 72 68"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />

          {/* body */}
          <Rect x="34" y="90" width="52" height="24" rx="12" fill={colors.primaryDeep} opacity={0.9} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
});
