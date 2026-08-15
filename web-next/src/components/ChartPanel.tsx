"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Graphique } from "../types/charts";
import { formatChartMoney } from "../types/charts";

function shortLabel(label: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(label));
  }
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split("-");
    return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(
      new Date(Number(year), Number(month) - 1, 1)
    );
  }
  if (/^\d{4}-W\d{2}$/.test(label)) return `S${label.slice(-2)}`;
  return label.length > 14 ? `${label.slice(0, 12)}…` : label;
}

function CustomTooltip({
  active,
  payload,
  label,
  devise,
  isCount = false,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  devise: string;
  isCount?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="chart-tooltip-label">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          <span className="chart-tooltip-name">{entry.name}</span>
          <strong className="chart-tooltip-value">
            {isCount ? entry.value : formatChartMoney(entry.value, devise)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function ColorLegend({ graphique }: { graphique: Graphique }) {
  const items =
    graphique.type === "pie" || graphique.type === "doughnut"
      ? graphique.labels.map((label, i) => ({
          label,
          color: graphique.series[0]?.couleurs?.[i] ?? graphique.series[0]?.couleur ?? "#0757a6",
        }))
      : graphique.series.map((s) => ({ label: s.label, color: s.couleur }));

  return (
    <div className="chart-legend">
      {items.slice(0, 6).map((item, i) => (
        <span key={i} className="chart-legend-item">
          <i style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartPanel({ graphique, compact = false }: { graphique: Graphique; compact?: boolean }) {
  const height = compact ? 200 : 300;
  const isCount = graphique.type === "doughnut" && graphique.id === "echeances_statut";
  const data = graphique.labels.map((label, index) => {
    const row: Record<string, string | number> = { label: shortLabel(label), labelComplet: label };
    graphique.series.forEach((serie) => {
      row[serie.id] = serie.donnees[index] ?? 0;
    });
    return row;
  });

  return (
    <section className={`chart-panel ${compact ? "compact" : ""}`}>
      <header className="chart-head">
        <div className="chart-head-info">
          <h4>{graphique.titre}</h4>
          {graphique.description && !compact && <p>{graphique.description}</p>}
        </div>
        {graphique.meta && (
          <div className="chart-meta">
            {Object.entries(graphique.meta)
              .filter(([k]) => k !== "granularite")
              .slice(0, 3)
              .map(([key, value]) => (
                <span key={key} className="chart-meta-item">
                  <small>{key.replaceAll("_", " ")}</small>
                  <strong>
                    {typeof value === "number"
                      ? isCount
                        ? value
                        : formatChartMoney(value, graphique.devise)
                      : value}
                  </strong>
                </span>
              ))}
          </div>
        )}
      </header>

      <div className="chart-body" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {graphique.type === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                {graphique.series.map((s) => (
                  <linearGradient key={s.id} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.couleur} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={s.couleur} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde5ef" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#708094", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#708094", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={48} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip devise={graphique.devise} />} cursor={{ stroke: "#dde5ef", strokeWidth: 1 }} />
              {graphique.series.map((serie) => (
                <Line
                  key={serie.id}
                  type="monotone"
                  dataKey={serie.id}
                  name={serie.label}
                  stroke={serie.couleur}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                />
              ))}
            </LineChart>
          ) : graphique.type === "area" || graphique.id === "evolution_financiere" ? (
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                {graphique.series.map((s) => (
                  <linearGradient key={s.id} id={`area-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.couleur} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={s.couleur} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde5ef" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#708094", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#708094", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={48} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip devise={graphique.devise} />} cursor={{ stroke: "#dde5ef", strokeWidth: 1 }} />
              {graphique.series.map((serie) => (
                <Area
                  key={serie.id}
                  type="monotone"
                  dataKey={serie.id}
                  name={serie.label}
                  stroke={serie.couleur}
                  strokeWidth={2.5}
                  fill={`url(#area-${serie.id})`}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                />
              ))}
            </AreaChart>
          ) : graphique.type === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#dde5ef" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#708094", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={data.length > 6 ? -18 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 52 : 28} />
              <YAxis tick={{ fill: "#708094", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={48} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip devise={graphique.devise} />} cursor={{ fill: "rgba(7,87,166,0.04)" }} />
              {graphique.series.map((serie) => (
                <Bar key={serie.id} dataKey={serie.id} name={serie.label} radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.map((_, index) => (
                    <Cell key={`${serie.id}-${index}`} fill={serie.couleurs?.[index] ?? serie.couleur} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={graphique.labels.map((label, index) => ({
                  name: label,
                  value: graphique.series[0]?.donnees[index] ?? 0,
                  fill: graphique.series[0]?.couleurs?.[index] ?? graphique.series[0]?.couleur ?? "#0757a6",
                }))}
                dataKey="value"
                nameKey="name"
                innerRadius={graphique.type === "doughnut" ? (compact ? 54 : 68) : 0}
                outerRadius={compact ? 76 : 96}
                paddingAngle={3}
                strokeWidth={2}
                stroke="#fff"
              >
                {graphique.labels.map((_, index) => (
                  <Cell
                    key={index}
                    fill={graphique.series[0]?.couleurs?.[index] ?? graphique.series[0]?.couleur ?? "#0757a6"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  isCount ? value : formatChartMoney(Number(value), graphique.devise),
                  name,
                ]}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      <ColorLegend graphique={graphique} />
    </section>
  );
}

export function ChartGrid({ graphiques, compact = false }: { graphiques: Graphique[]; compact?: boolean }) {
  if (!graphiques.length) {
    return (
      <div className="chart-empty">
        <span>📊</span>
        <p>Aucun graphique disponible pour cette période.</p>
      </div>
    );
  }

  return (
    <div className={`chart-grid ${compact ? "compact" : ""}`}>
      {graphiques.map((graphique) => (
        <ChartPanel key={graphique.id} graphique={graphique} compact={compact} />
      ))}
    </div>
  );
}
