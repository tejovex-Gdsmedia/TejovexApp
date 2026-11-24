import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Pattern, Line, Defs } from "react-native-svg";
import { colors } from "../../constants/colors";
import { WeeklyBarPoint } from "../../data/dashboardMock";

interface WeeklyBarChartProps {
  data: WeeklyBarPoint[];
  height?: number;
}

const BAR_WIDTH = 28;
const GAP = 10;

export default function WeeklyBarChart({ data, height = 140 }: WeeklyBarChartProps) {
  const width = data.length * (BAR_WIDTH + GAP);
  const peakIndex = data.reduce(
    (best, point, i) => (point.value !== null && (best === -1 || (point.value ?? 0) > (data[best].value ?? 0)) ? i : best),
    -1
  );

  return (
    <View>
      <Svg width={width} height={height + 24}>
        <Defs>
          <Pattern id="stripes" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={6} stroke={colors.border} strokeWidth={3} />
          </Pattern>
        </Defs>
        {data.map((point, i) => {
          const x = i * (BAR_WIDTH + GAP);
          const hasValue = point.value !== null;
          const barHeight = hasValue ? Math.max((point.value! / 100) * height, 24) : height * 0.75;
          const y = height - barHeight;
          const isPeak = i === peakIndex;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={BAR_WIDTH}
              height={barHeight}
              rx={BAR_WIDTH / 2}
              fill={hasValue ? (isPeak ? colors.primaryDeep : colors.primary) : "url(#stripes)"}
              opacity={hasValue && !isPeak ? 0.55 : 1}
            />
          );
        })}
      </Svg>

      <View style={[styles.labelRow, { width }]}>
        {data.map((point, i) => (
          <Text key={i} style={styles.dayLabel}>
            {point.label}
          </Text>
        ))}
      </View>

      {peakIndex !== -1 ? (
        <View
          style={[
            styles.callout,
            { left: peakIndex * (BAR_WIDTH + GAP) - 6, top: height - ((data[peakIndex].value! / 100) * height) - 34 },
          ]}
        >
          <Text style={styles.calloutText}>{data[peakIndex].value}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  dayLabel: { width: BAR_WIDTH, textAlign: "center", fontSize: 12, color: colors.muted },
  callout: {
    position: "absolute",
    backgroundColor: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calloutText: { color: colors.white, fontSize: 11, fontWeight: "700" },
});
