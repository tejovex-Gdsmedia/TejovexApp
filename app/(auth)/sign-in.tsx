import { useEffect, useState } from "react";
import {
  Animated,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { colors } from "../../src/constants/colors";
import Screen from "../../src/components/layout/Screen";
import TejovexLogo from "../../src/components/brand/TejovexLogo";
import AIHeroRobot from "../../src/components/brand/AIHeroRobot";
import PremiumInput from "../../src/components/ui/PremiumInput";
import PremiumButton from "../../src/components/ui/PremiumButton";
import AppDialog from "../../src/components/ui/AppDialog";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setDialog({ title: "Missing information", message: "Enter your email and password." });
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      setDialog({ title: "Sign in failed", message: error instanceof Error ? error.message : "Please try again." });
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
          <TejovexLogo variant="full" size={44} style={styles.logo} />
          <AIHeroRobot size={130} />
        </Animated.View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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
          placeholder="Your password"
          secureTextEntry
        />

        <PremiumButton
          label="Sign In"
          onPress={handleSignIn}
          loading={submitting}
          accessibilityLabel="Sign in"
          style={{ marginTop: 26 }}
        />

        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={styles.linkBtn}>
            <Text style={styles.linkText}>Don&apos;t have an account? Sign up</Text>
          </Pressable>
        </Link>
      </ScrollView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => setDialog(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 12, flexGrow: 1, justifyContent: "center" },
  logo: { marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 20,
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
