import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const ICON = require("../../../assets/brand/tejovex-icon.webp");
const FULL = require("../../../assets/brand/tejovex-logo-full.webp");

interface TejovexLogoProps {
  /** "icon": standalone mark only, for use inside the authenticated app.
   *  "full": mark + wordmark + tagline, for the auth / sign-up experience. */
  variant: "icon" | "full";
  size?: number;
  style?: object;
}

/**
 * Official Tejovex brand mark. Always renders the supplied asset directly —
 * never redraw, recolor or distort it.
 */
export default function TejovexLogo({ variant, size = 72, style }: TejovexLogoProps) {
  if (variant === "icon") {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image source={ICON} style={StyleSheet.absoluteFill} contentFit="contain" />
      </View>
    );
  }

  const width = size * 2.6;
  const height = size;
  return (
    <View style={[{ width, height }, style]}>
      <Image source={FULL} style={StyleSheet.absoluteFill} contentFit="contain" />
    </View>
  );
}
