import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import type { Graphique } from "../types/charts";
import { formatChartMoney } from "../types/charts";

const PALETTE = [
  "#16a34a", "#dc2626", "#0757a6", "#f3b20b",
  "#7c3aed", "#0891b2", "#ea580c", "#db2777",
];

function shortLabel(label: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(label));
  }
  if (/^\d{4}-W\d{2}$/.test(label)) return `S${label.slice(-2)}`;
  return label.length > 10 ? `${label.slice(0, 8)}…` : label;
}

function MetaItem({ label, value, devise, isCount }: { label: string; value: number | string; devise: string; isCount?: boolean }) {
  const display = typeof value === "number"
    ? isCount ? String(value) : formatChartMoney(value, devise)
    : value;
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label.replaceAll("_", " ")}</Text>
      <Text style={styles.metaValue}>{display}</Text>
    </View>
  );
}

function ChartLegend({ graphique }: { graphique: Graphique }) {
  const items =
    graphique.type === "pie" || graphique.type === "doughnut"
      ? graphique.labels.map((label, i) => ({
          label,
          color: graphique.series[0]?.couleurs?.[i] ?? PALETTE[i % PALETTE.length],
        }))
      : graphique.series.map((s) => ({ label: s.label, color: s.couleur }));

  return (
    <View style={styles.legend}>
      {items.slice(0, 6).map((item, i) => (
        <View key={i} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendText} numberOfLines={1}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function ChartPanel({ graphique, compact = false }: { graphique: Graphique; compact?: boolean }) {
  const height = compact ? 180 : 220;
  const serie = graphique.series[0];
  const isCount = graphique.id === "echeances_statut";
  const spacing = Math.max(28, 280 / Math.max(graphique.labels.length, 1));

  const metaEntries = graphique.meta
    ? Object.entries(graphique.meta).filter(([k]) => k !== "granularite").slice(0, 3)
    : [];

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      {/* Header */}
      <View style={styles.head}>
        <View style={styles.headInfo}>
          <Text style={[styles.title, compact && styles.titleCompact]}>{graphique.titre}</Text>
          {!compact && graphique.description ? (
            <Text style={styles.description}>{graphique.description}</Text>
          ) : null}
        </View>
      </View>

      {/* Meta KPIs */}
      {metaEntries.length > 0 && (
        <View style={styles.metaRow}>
          {metaEntries.map(([key, value]) => (
            <MetaItem key={key} label={key} value={value} devise={graphique.devise} isCount={isCount} />
          ))}
        </View>
      )}

      {/* Chart */}
      {graphique.type === "line" || graphique.type === "area" ? (
        <LineChart
          dataSet={graphique.series.map((item) => ({
            data: graphique.labels.map((label, index) => ({
              value: item.donnees[index] ?? 0,
              label: shortLabel(label),
            })),
            color: item.couleur,
            startFillColor: item.couleur + "33",
            endFillColor: item.couleur + "00",
          }))}
          height={height}
          spacing={spacing}
          thickness={2.5}
          hideRules={false}
          rulesColor="#dde5ef"
          yAxisColor="transparent"
          xAxisColor="#dde5ef"
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axis}
          noOfSections={4}
          curved
          areaChart={graphique.type === "area" || graphique.id === "evolution_financiere"}
          isAnimated
          animationDuration={600}
        />
      ) : graphique.type === "bar" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {graphique.series.length > 1 ? (
            <BarChart
              stackData={graphique.labels.map((label, index) => ({
                label: shortLabel(label),
                stacks: graphique.series.map((item) => ({
                  value: item.donnees[index] ?? 0,
                  color: item.couleur,
                  marginBottom: 2,
                })),
              }))}
              barWidth={28}
              spacing={18}
              height={height}
              yAxisTextStyle={styles.axis}
              xAxisLabelTextStyle={styles.axis}
              noOfSections={4}
              isAnimated
            />
          ) : (
            <BarChart
              data={graphique.labels.map((label, index) => ({
                value: serie?.donnees[index] ?? 0,
                label: shortLabel(label),
                frontColor: serie?.couleurs?.[index] ?? serie?.couleur ?? "#0757a6",
                gradientColor: (serie?.couleurs?.[index] ?? serie?.couleur ?? "#0757a6") + "55",
              }))}
              barWidth={28}
              spacing={18}
              height={height}
              yAxisTextStyle={styles.axis}
              xAxisLabelTextStyle={styles.axis}
              noOfSections={4}
              roundedTop
              showGradient
              isAnimated
            />
          )}
        </ScrollView>
      ) : (
        <View style={styles.pieWrap}>
          <PieChart
            data={graphique.labels.map((label, index) => ({
              value: serie?.donnees[index] ?? 0,
              text: shortLabel(label),
              color: serie?.couleurs?.[index] ?? PALETTE[index % PALETTE.length],
            }))}
            donut={graphique.type === "doughnut"}
            radius={compact ? 72 : 90}
            innerRadius={graphique.type === "doughnut" ? (compact ? 44 : 56) : 0}
            showText
            textColor="#162033"
            textSize={9}
            isAnimated
          />
        </View>
      )}

      {/* Legend */}
      <ChartLegend graphique={graphique} />
    </View>
  );
}

export function ChartGrid({ graphiques, compact = false }: { graphiques: Graphique[]; compact?: boolean }) {
  if (!graphiques.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>Aucun graphique disponible pour cette periode.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {graphiques.map((graphique) => (
        <ChartPanel key={graphique.id} graphique={graphique} compact={compact} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 14 },
  panel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dde5ef",
    gap: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  panelCompact: { padding: 12, gap: 8, borderRadius: 10 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  headInfo: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: "800", color: "#162033", letterSpacing: -0.3 },
  titleCompact: { fontSize: 14 },
  description: { color: "#708094", fontSize: 12, lineHeight: 18 },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metaItem: {
    flex: 1,
    minWidth: 80,
    backgroundColor: "#f5f7fb",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#dde5ef",
    gap: 2,
  },
  metaLabel: {
    color: "#708094",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    color: "#162033",
    fontSize: 12,
    fontWeight: "900",
  },
  pieWrap: { alignItems: "center" },
  axis: { color: "#708094", fontSize: 10 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: "#708094", fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 24, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#dde5ef" },
  emptyIcon: { fontSize: 28, opacity: 0.5 },
  emptyText: { color: "#708094", fontSize: 13 },
});
