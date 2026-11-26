import { useState } from "react";
import { TextInput, TextInputProps, StyleSheet, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";

export default function PremiumInput(props: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const isPassword = props.secureTextEntry === true;

  const input = (
    <TextInput
      {...props}
      secureTextEntry={isPassword ? !visible : false}
      placeholderTextColor={colors.muted}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, focused && styles.focused, isPassword && styles.inputWithEye, props.style]}
    />
  );

  if (!isPassword) return input;

  return (
    <View style={[styles.wrapper, focused && styles.wrapperFocused]}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        placeholderTextColor={colors.muted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.inputInner, props.style]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        style={styles.eyeBtn}
      >
        <Ionicons
          name={visible ? "eye-outline" : "eye-off-outline"}
          size={20}
          color={colors.muted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputWithEye: {
    paddingRight: 48,
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  wrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
