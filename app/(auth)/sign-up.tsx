import { useEffect, useState } from "react";
import { Animated, Text, Pressable, Alert, ScrollView, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { colors } from "../../src/constants/colors";
import Screen from "../../src/components/layout/Screen";
import TejovexLogo from "../../src/components/brand/TejovexLogo";
import AIHeroRobot from "../../src/components/brand/AIHeroRobot";
import PremiumInput from "../../src/components/ui/PremiumInput";
import PremiumButton from "../../src/components/ui/PremiumButton";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing name", "Please enter your full name.");
      return;
    }
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please re-enter matching passwords.");
      return;
    }

    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp(
        fullName.trim(),
        email.trim(),
        password
      );

      if (needsEmailConfirmation) {
        Alert.alert(
          "Check your email",
          "Check your email to confirm your account.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Sign up failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fade, alignItems: "center" }}>
          <TejovexLogo variant="full" size={40} style={styles.logo} />
          <AIHeroRobot size={110} />
        </Animated.View>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>New accounts start as employees</Text>

        <Text style={styles.label}>Full name</Text>
        <PremiumInput value={fullName} onChangeText={setFullName} placeholder="Jane Doe" />

        <Text style={styles.label}>Email</Text>
        <PremiumInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <PremiumInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
        />

        <Text style={styles.label}>Confirm password</Text>
        <PremiumInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
          secureTextEntry
        />

        <PremiumButton
          label="Sign Up"
          onPress={handleSignUp}
          loading={submitting}
          accessibilityLabel="Sign up"
          style={{ marginTop: 26 }}
        />

        <Link href="/(auth)/sign-in" asChild>
          <Pressable style={styles.linkBtn}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 8, paddingBottom: 40 },
  logo: { marginBottom: 4 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  linkBtn: { marginTop: 22, alignItems: "center", minHeight: 44, justifyContent: "center" },
  linkText: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "600",
  },
});
