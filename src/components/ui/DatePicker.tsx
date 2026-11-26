import React from "react";
import { Platform, ViewStyle } from "react-native";
import DateTimePickerNative from "@react-native-community/datetimepicker";

interface Props {
  value: Date;
  mode: "date" | "time";
  onChange: (event: unknown, date?: Date) => void;
  display?: string;
  style?: ViewStyle | ViewStyle[];
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toTimeString(d: Date) {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// On web: a real HTML <input type="date|time"> so the browser shows its
//   native calendar / time picker on click — no manual typing needed.
// On mobile: the native DateTimePicker from @react-native-community.
export default function DatePicker({ value, mode, onChange, display }: Props) {
  const safeValue = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();

  if (Platform.OS === "web") {
    // React.createElement with a lowercase string creates a real DOM element
    // in React Native Web, giving us the browser's built-in calendar popup.
    return React.createElement("input", {
      type: mode === "date" ? "date" : "time",
      value: mode === "date" ? toDateString(safeValue) : toTimeString(safeValue),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        if (!text) return;
        const next = new Date(safeValue);
        if (mode === "date") {
          const [y, mo, d] = text.split("-").map(Number);
          if (!isNaN(y) && !isNaN(mo) && !isNaN(d)) {
            next.setFullYear(y, mo - 1, d);
            onChange({}, next);
          }
        } else {
          const [h, min] = text.split(":").map(Number);
          if (!isNaN(h) && !isNaN(min)) {
            next.setHours(h, min, 0, 0);
            onChange({}, next);
          }
        }
      },
      style: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        border: "1px solid #E6EBF4",
        padding: 12,
        minHeight: 44,
        fontSize: 15,
        color: "#1E293B",
        cursor: "pointer",
        fontFamily: "inherit",
        outline: "none",
        boxSizing: "border-box",
        width: "100%",
      },
    });
  }

  return (
    <DateTimePickerNative
      value={safeValue}
      mode={mode}
      display={(display as never) ?? (Platform.OS === "ios" ? "spinner" : "default")}
      onChange={onChange}
    />
  );
}
