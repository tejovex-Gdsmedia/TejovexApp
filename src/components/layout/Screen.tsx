import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import TejovexWatermark from "../brand/TejovexWatermark";

interface ScreenProps {
  children: ReactNode;
  /** Apply bottom inset padding. Skip on screens sitting above a tab bar,
   *  which already reserves safe-area space for itself. */
  edges?: ("top" | "bottom")[];
  watermark?: boolean;
  style?: ViewStyle;
}

/**
 * Root-cause fix for top-content clipping: every top-level screen renders
 * inside this, which reads the real device insets once via
 * react-native-safe-area-context instead of guessing a paddingTop number.
 */
export default function Screen({ children, edges = ["top"], watermark = false, style }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: edges.includes("top") ? insets.top : 0,
          paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {watermark ? <TejovexWatermark /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
