import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../../src/components/ui/PremiumInput";
import { deleteOffice, fetchOffices, upsertOffice } from "../../../../src/attendance/api";
import { Office } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";
import AppDialog from "../../../../src/components/ui/AppDialog";

export default function OfficesScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("100");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string; message: string;
    confirmText?: string; confirmStyle?: "default" | "destructive";
    onConfirm?: () => void;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setOffices(await fetchOffices());
      setError(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  const openNewForm = () => {
    setEditingId(null);
    setName("");
    setLatitude("");
    setLongitude("");
    setRadius("100");
    setFormOpen(true);
  };

  const openEditForm = (office: Office) => {
    setEditingId(office.id);
    setName(office.name);
    setLatitude(String(office.latitude));
    setLongitude(String(office.longitude));
    setRadius(String(office.radiusMeters));
    setFormOpen(true);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setDialog({ title: "Location needed", message: "Enable location access to use your current position." });
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(String(position.coords.latitude));
      setLongitude(String(position.coords.longitude));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusMeters = parseInt(radius, 10);
    if (!name.trim() || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radiusMeters)) {
      setDialog({ title: "Missing information", message: "Enter a name, valid coordinates, and a radius." });
      return;
    }
    setSaving(true);
    try {
      await upsertOffice({ id: editingId ?? undefined, name: name.trim(), latitude: lat, longitude: lng, radiusMeters });
      setFormOpen(false);
      load();
    } catch (error) {
      setDialog({ title: "Could not save", message: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    setDialog({
      title: "Delete office",
      message: "Are you sure?",
      confirmText: "Delete",
      confirmStyle: "destructive",
      onConfirm: async () => { await deleteOffice(id); load(); },
    });
  };

  if (!allowed) return null;

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message="Could not load offices." onRetry={() => load().catch(() => setError(true))} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={offices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Pressable onPress={formOpen ? () => setFormOpen(false) : openNewForm}>
              <Text style={styles.linkText}>{formOpen ? "Close" : "+ Add office"}</Text>
            </Pressable>
            {formOpen && (
              <View style={styles.form}>
                <PremiumInput value={name} onChangeText={setName} placeholder="Office name" style={styles.input} />
                <View style={styles.coordsRow}>
                  <PremiumInput value={latitude} onChangeText={setLatitude} placeholder="Latitude" keyboardType="numeric" style={[styles.input, styles.half]} />
                  <PremiumInput value={longitude} onChangeText={setLongitude} placeholder="Longitude" keyboardType="numeric" style={[styles.input, styles.half]} />
                </View>
                <PremiumInput value={radius} onChangeText={setRadius} placeholder="Radius (metres)" keyboardType="numeric" style={styles.input} />
                <PremiumButton label="Use current location" variant="outline" onPress={useCurrentLocation} loading={locating} style={styles.input} />
                <PremiumButton label="Save Office" onPress={save} loading={saving} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => openEditForm(item)} style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>Radius {item.radiusMeters}m</Text>
              <Pressable
                onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`)}
              >
                <Text style={styles.mapLink}>View on Google Maps</Text>
              </Pressable>
            </Pressable>
            <Pressable onPress={() => remove(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="business-outline" message="No offices yet." />}
      />

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => setDialog(null)}
        confirmText={dialog?.confirmText}
        confirmStyle={dialog?.confirmStyle}
        onConfirm={dialog?.onConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  headerRow: { marginBottom: 16 },
  linkText: { color: colors.primary, fontWeight: "700" },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 10 },
  input: { marginBottom: 10 },
  coordsRow: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: "700", color: colors.text },
  cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  mapLink: { color: colors.primary, fontSize: 12, marginTop: 6, fontWeight: "600" },
  deleteText: { color: colors.danger, fontWeight: "600" },
});
