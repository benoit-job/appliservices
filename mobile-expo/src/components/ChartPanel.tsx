import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import type { ThemeColors } from "../../themes";
import type { Graphique } from "../types/charts";
import { formatChartMoney } from "../types/charts";

const PALETTE = [
  "#16a34a", "#dc2626", "#0757a6", "#f3b20b",
  "#7c3aed", "#0891b2", "#ea580c", "#db2777",
];

type ChartStyles = ReturnType<typeof createStyles>;

function shortLabel(label: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(label));
  }
  if (/^\d{4}-W\d{2}$/.test(label)) return `S${label.slice(-2)}`;
  return label.length > 10 ? `${label.slice(0, 8)}...` : label;
}

function MetaItem({
  label,
  value,
  devise,
  isCount,
  styles,
}: {
  label: string;
  value: number | string;
  devise: string;
  isCount?: boolean;
  styles: ChartStyles;
}) {
  const display = typeof value === "number" ? (isCount ? String(value) : formatChartMoney(value, devise)) : value;
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label.replaceAll("_", " ")}</Text>
      <Text style={styles.metaValue}>{display}</Text>
    </View>
  );
}

function ChartLegend({ graphique, styles }: { graphique: Graphique; styles: ChartStyles }) {
  const items =
    graphique.type === "pie" || graphique.type === "doughnut"
      ? graphique.labels.map((label, i) => ({
          label,
          color: graphique.series[0]?.couleurs?.[i] ?? PALETTE[i % PALETTE.length],
        }))
      : graphique.series.map((serie) => ({ label: serie.label, color: serie.couleur }));

  return (
    <View style={styles.legend}>
      {items.slice(0, 6).map((item, index) => (
        <View key={index} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendText} numberOfLines={1}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function ChartPanel({ graphique, compact = false, colors }: { graphique: Graphique; compact?: boolean; colors: ThemeColors }) {
  const styles = createStyles(colors);
  const height = compact ? 180 : 220;
  const serie = graphique.series[0];
  const isCount = graphique.id === "echeances_statut";
  const spacing = Math.max(28, 280 / Math.max(graphique.labels.length, 1));
  const fallbackColor = colors.blue;

  const metaEntries = graphique.meta
    ? Object.entries(graphique.meta).filter(([key]) => key !== "granularite").slice(0, 3)
    : [];

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View style={styles.head}>
        <View style={styles.headInfo}>
          <Text style={[styles.title, compact && styles.titleCompact]}>{graphique.titre}</Text>
          {!compact && graphique.description ? <Text style={styles.description}>{graphique.description}</Text> : null}
        </View>
      </View>

      {metaEntries.length > 0 && (
        <View style={styles.metaRow}>
          {metaEntries.map(([key, value]) => (
            <MetaItem key={key} label={key} value={value} devise={graphique.devise} isCount={isCount} styles={styles} />
          ))}
        </View>
      )}

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
          rulesColor={colors.line}
          yAxisColor="transparent"
          xAxisColor={colors.line}
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
              data={graphique.labels.map((label, index) => {
                const color = serie?.couleurs?.[index] ?? serie?.couleur ?? fallbackColor;
                return {
                  value: serie?.donnees[index] ?? 0,
                  label: shortLabel(label),
                  frontColor: color,
                  gradientColor: color + "55",
                };
              })}
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
            textColor={colors.text}
            textSize={9}
            isAnimated
          />
        </View>
      )}

      <ChartLegend graphique={graphique} styles={styles} />
    </View>
  );
}

export function ChartGrid({
  graphiques,
  compact = false,
  colors,
  emptyText,
}: {
  graphiques: Graphique[];
  compact?: boolean;
  colors: ThemeColors;
  emptyText: string;
}) {
  const styles = createStyles(colors);

  if (!graphiques.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>...</Text>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {graphiques.map((graphique) => (
        <ChartPanel key={graphique.id} graphique={graphique} compact={compact} colors={colors} />
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    grid: { gap: 14 },
    panel: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.line,
      gap: 12,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    panelCompact: { padding: 12, gap: 8, borderRadius: 10 },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
    headInfo: { flex: 1, gap: 3 },
    title: { fontSize: 16, fontWeight: "800", color: c.text },
    titleCompact: { fontSize: 14 },
    description: { color: c.muted, fontSize: 12, lineHeight: 18 },
    metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    metaItem: {
      flex: 1,
      minWidth: 80,
      backgroundColor: c.bg,
      borderRadius: 8,
      padding: 8,
      borderWidth: 1,
      borderColor: c.line,
      gap: 2,
    },
    metaLabel: {
      color: c.muted,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    metaValue: { color: c.text, fontSize: 12, fontWeight: "900" },
    pieWrap: { alignItems: "center" },
    axis: { color: c.muted, fontSize: 10 },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 3 },
    legendText: { color: c.muted, fontSize: 11, fontWeight: "600" },
    empty: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 24,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: c.line,
    },
    emptyIcon: { fontSize: 18, opacity: 0.5, color: c.muted },
    emptyText: { color: c.muted, fontSize: 13 },
  });
}
