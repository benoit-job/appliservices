import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ActiviteRef, ChartFilters } from "../types/charts";
import { TYPES_GRAPHIQUES } from "../types/charts";

type Props = {
  filters: ChartFilters;
  activites: ActiviteRef[];
  onChange: (next: ChartFilters) => void;
  onApply: () => void;
};

export function ChartFiltersBar({ filters, activites, onChange, onApply }: Props) {
  const selectedTypes = filters.types_graphiques ?? [];

  function toggleType(id: string) {
    const next = selectedTypes.includes(id)
      ? selectedTypes.filter((t) => t !== id)
      : [...selectedTypes, id];
    onChange({ ...filters, types_graphiques: next });
  }

  function isTypeActive(id: string) {
    return selectedTypes.length === 0 || selectedTypes.includes(id);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Filtres</Text>

      {/* Dates */}
      <Field label="Période">
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.inputDate]}
            value={filters.debut}
            onChangeText={(debut) => onChange({ ...filters, debut })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#b0bed0"
          />
          <Text style={styles.dateArrow}>→</Text>
          <TextInput
            style={[styles.input, styles.inputDate]}
            value={filters.fin}
            onChangeText={(fin) => onChange({ ...filters, fin })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#b0bed0"
          />
        </View>
      </Field>

      {/* Granularite */}
      <Field label="Granularité">
        <View style={styles.chips}>
          {(["jour", "semaine", "mois"] as const).map((value) => (
            <Chip
              key={value}
              label={value === "jour" ? "Jour" : value === "semaine" ? "Semaine" : "Mois"}
              active={filters.granularite === value}
              onPress={() => onChange({ ...filters, granularite: value })}
            />
          ))}
        </View>
      </Field>

      {/* Activite */}
      <Field label="Activité">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            <Chip label="Toutes" active={!filters.activite_id} onPress={() => onChange({ ...filters, activite_id: "" })} />
            {activites.map((activite) => (
              <Chip
                key={activite.id}
                label={activite.nom}
                active={filters.activite_id === String(activite.id)}
                onPress={() => onChange({ ...filters, activite_id: String(activite.id) })}
              />
            ))}
          </View>
        </ScrollView>
      </Field>

      {/* Type transaction */}
      <Field label="Type de transaction">
        <View style={styles.chips}>
          {([["", "Tous"], ["revenu", "Revenus"], ["decaissement", "Dépenses"]] as const).map(([value, label]) => (
            <Chip
              key={value || "all"}
              label={label}
              active={filters.type_transaction === value}
              onPress={() => onChange({ ...filters, type_transaction: value })}
            />
          ))}
        </View>
      </Field>

      {/* Types de graphiques */}
      <Field
        label="Graphiques affichés"
        action={
          selectedTypes.length > 0 ? (
            <Pressable onPress={() => onChange({ ...filters, types_graphiques: [] })}>
              <Text style={styles.resetText}>Tout afficher</Text>
            </Pressable>
          ) : null
        }
      >
        <View style={styles.chipsWrap}>
          {TYPES_GRAPHIQUES.map((t) => (
            <Chip
              key={t.id}
              label={`${t.icon} ${t.label}`}
              active={isTypeActive(t.id)}
              onPress={() => toggleType(t.id)}
            />
          ))}
        </View>
      </Field>

      <Pressable style={styles.apply} onPress={onApply}>
        <Text style={styles.applyText}>Appliquer les filtres</Text>
      </Pressable>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>{label}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dde5ef",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heading: { fontSize: 16, fontWeight: "800", color: "#162033", letterSpacing: -0.3 },
  field: { gap: 7 },
  fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: "#708094", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  resetText: { color: "#0757a6", fontSize: 11, fontWeight: "700", textDecorationLine: "underline" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateArrow: { color: "#708094", fontSize: 14 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#dde5ef",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f5f7fb",
    color: "#162033",
    fontSize: 13,
  },
  inputDate: { flex: 1 },
  chips: { flexDirection: "row", gap: 7 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f5f7fb",
    borderWidth: 1.5,
    borderColor: "#dde5ef",
  },
  chipActive: { backgroundColor: "#0757a6", borderColor: "#0757a6" },
  chipText: { color: "#708094", fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#fff" },
  apply: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0757a6",
    shadowColor: "#0757a6",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  applyText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
