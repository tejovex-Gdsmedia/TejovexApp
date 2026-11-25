import { ColorValue, Pressable } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <Ionicons name={name} size={22} color={color as string} />;
}

export default function AppTabsLayout() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isManager = profile?.role === "manager";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 10,
          height: 64,
          borderRadius: 24,
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: colors.primaryDeep,
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon name="grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-tasks"
        options={{
          title: "My Tasks",
          tabBarIcon: ({ color }) => <TabIcon name="checkmark-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="delegated"
        options={{
          title: "Delegated",
          href: isManager ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon name="arrow-redo-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          href: isManager ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon name="people-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => <TabIcon name="ellipsis-horizontal-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="home-redirect"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabIcon name="home-outline" color={color} />,
          tabBarButton: (props) => (
            <Pressable
              onPress={() => router.replace("/(app)/home")}
              style={props.style}
              accessibilityRole="button"
              accessibilityLabel="Go to Home"
            >
              {props.children}
            </Pressable>
          ),
        }}
        listeners={{
          tabPress: (e) => e.preventDefault(),
        }}
      />
    </Tabs>
  );
}
