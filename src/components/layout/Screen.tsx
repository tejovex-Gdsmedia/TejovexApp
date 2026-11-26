import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import TejovexWatermark from "../brand/TejovexWatermark";
import TopBar from "./TopBar";

interface ScreenProps {
  children: ReactNode;
  /** Apply bottom inset padding. Skip on screens sitting above a tab bar,
   *  which already reserves safe-area space for itself. */
  edges?: ("top" | "bottom")[];
  watermark?: boolean;
  style?: ViewStyle;
  /** Set true only on auth/onboarding screens that should not show the TopBar. */
  hideTopBar?: boolean;
}

export default function Screen({
  children,
  edges = ["top"],
  watermark = true,
  style,
  hideTopBar = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  // Always apply top inset when showing the TopBar so it doesn't overlap the status bar.
  const paddingTop = !hideTopBar || edges.includes("top") ? insets.top : 0;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop,
          paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {watermark ? <TejovexWatermark /> : null}
      {!hideTopBar && <TopBar />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
