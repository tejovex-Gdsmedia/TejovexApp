import { StyleSheet, View } from "react-native";
import TejovexLogo from "./TejovexLogo";

interface TejovexWatermarkProps {
  size?: number;
  opacity?: number;
}

/**
 * Centered, subtle, non-interactive Tejovex icon watermark for authenticated
 * screens. Sits behind foreground content and never intercepts touches.
 */
export default function TejovexWatermark({ size = 240, opacity = 0.06 }: TejovexWatermarkProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.center}>
        <TejovexLogo variant="icon" size={size} style={{ opacity }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
