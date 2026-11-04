import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../constants/colors";

interface GaugeChartProps {
  percent: number; // 0-100
  size?: number;
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (deg: number) => ((deg - 180) * Math.PI) / 180;
  const start = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
  const end = { x: cx + r * Math.cos(toRad(endDeg)), y: cy + r * Math.sin(toRad(endDeg)) };
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function GaugeChart({ percent, size = 180 }: GaugeChartProps) {
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = (percent / 100) * 180;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size / 2 + 20}>
        <Path d={describeArc(cx, cy, r, 0, 180)} stroke={colors.backgroundAlt} strokeWidth={14} fill="none" strokeLinecap="round" />
        {sweep > 0 ? (
          <Path
            d={describeArc(cx, cy, r, 0, sweep)}
            stroke={colors.primaryDeep}
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", top: "40%", alignItems: "center" },
  percent: { fontSize: 24, fontWeight: "700", color: colors.text },
});
