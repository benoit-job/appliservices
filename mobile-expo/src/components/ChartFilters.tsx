import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ThemeColors } from "../../themes";
import type { ActiviteRef, ChartFilters } from "../types/charts";
import { TYPES_GRAPHIQUES } from "../types/charts";

type Props = {
  filters: ChartFilters;
  activites: ActiviteRef[];
  onChange: (next: ChartFilters) => void;
  onApply: () => void;
  colors: ThemeColors;
  t: (key: string) => string;
};

type FilterStyles = ReturnType<typeof createStyles>;

export function ChartFiltersBar({ filters, activites, onChange, onApply, colors, t }: Props) {
  const selectedTypes = filters.types_graphiques ?? [];
  const styles = createStyles(colors);

  function toggleType(id: string) {
    const next = selectedTypes.includes(id)
      ? selectedTypes.filter((type) => type !== id)
      : [...selectedTypes, id];
    onChange({ ...filters, types_graphiques: next });
  }

  function isTypeActive(id: string) {
    return selectedTypes.length === 0 || selectedTypes.includes(id);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t("filters")}</Text>

      <Field label={t("period")} styles={styles}>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.inputDate]}
            value={filters.debut}
            onChangeText={(debut) => onChange({ ...filters, debut })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.dateArrow}>to</Text>
          <TextInput
            style={[styles.input, styles.inputDate]}
            value={filters.fin}
            onChangeText={(fin) => onChange({ ...filters, fin })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
          />
        </View>
      </Field>

      <Field label={t("granularity")} styles={styles}>
        <View style={styles.chips}>
          {(["jour", "semaine", "mois"] as const).map((value) => (
            <Chip
              key={value}
              label={value === "jour" ? t("day") : value === "semaine" ? t("week") : t("month")}
              active={filters.granularite === value}
              onPress={() => onChange({ ...filters, granularite: value })}
              styles={styles}
            />
          ))}
        </View>
      </Field>

      <Field label={t("activity")} styles={styles}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            <Chip label={t("allActivities")} active={!filters.activite_id} onPress={() => onChange({ ...filters, activite_id: "" })} styles={styles} />
            {activites.map((activite) => (
              <Chip
                key={activite.id}
                label={activite.nom}
                active={filters.activite_id === String(activite.id)}
                onPress={() => onChange({ ...filters, activite_id: String(activite.id) })}
                styles={styles}
              />
            ))}
          </View>
        </ScrollView>
      </Field>

      <Field label={t("transactionType")} styles={styles}>
        <View style={styles.chips}>
          {[
            ["", t("all")],
            ["revenu", t("income")],
            ["decaissement", t("decaissements")],
          ].map(([value, label]) => (
            <Chip
              key={value || "all"}
              label={label}
              active={filters.type_transaction === value}
              onPress={() => onChange({ ...filters, type_transaction: value })}
              styles={styles}
            />
          ))}
        </View>
      </Field>

      <Field
        label={t("displayedGraphs")}
        styles={styles}
        action={
          selectedTypes.length > 0 ? (
            <Pressable onPress={() => onChange({ ...filters, types_graphiques: [] })}>
              <Text style={styles.resetText}>{t("showAll")}</Text>
            </Pressable>
          ) : null
        }
      >
        <View style={styles.chipsWrap}>
          {TYPES_GRAPHIQUES.map((type) => (
            <Chip
              key={type.id}
              label={`${type.icon} ${type.label}`}
              active={isTypeActive(type.id)}
              onPress={() => toggleType(type.id)}
              styles={styles}
            />
          ))}
        </View>
      </Field>

      <Pressable style={styles.apply} onPress={onApply}>
        <Text style={styles.applyText}>{t("applyFilters")}</Text>
      </Pressable>
    </View>
  );
}

function Chip({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: FilterStyles }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  children,
  action,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  styles: FilterStyles;
}) {
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

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
      padding: 16,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    heading: { fontSize: 16, fontWeight: "800", color: c.text },
    field: { gap: 7 },
    fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    label: { color: c.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
    resetText: { color: c.blue, fontSize: 11, fontWeight: "700", textDecorationLine: "underline" },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dateArrow: { color: c.muted, fontSize: 12, fontWeight: "800" },
    input: {
      height: 42,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: c.bg,
      color: c.text,
      fontSize: 13,
    },
    inputDate: { flex: 1 },
    chips: { flexDirection: "row", gap: 7 },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: c.bg,
      borderWidth: 1.5,
      borderColor: c.line,
    },
    chipActive: { backgroundColor: c.blue, borderColor: c.blue },
    chipText: { color: c.muted, fontWeight: "700", fontSize: 12 },
    chipTextActive: { color: c.onPrimary },
    apply: {
      minHeight: 48,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.blue,
      shadowColor: c.blue,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    applyText: { color: c.onPrimary, fontWeight: "800", fontSize: 14 },
  });
}
