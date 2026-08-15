"use client";

import type { ActiviteRef, ChartFilters } from "../types/charts";
import { TYPES_GRAPHIQUES } from "../types/charts";

type Props = {
  filters: ChartFilters;
  activites: ActiviteRef[];
  onChange: (next: ChartFilters) => void;
  onApply: () => void;
};

export function ChartFiltersBar({ filters, activites, onChange, onApply }: Props) {
  function toggleType(id: string) {
    const current = filters.types_graphiques ?? [];
    const next = current.includes(id) ? current.filter((t) => t !== id) : [...current, id];
    onChange({ ...filters, types_graphiques: next });
  }

  const types = filters.types_graphiques ?? [];

  return (
    <div className="chart-filters">
      <div className="chart-filters-row">
        <div className="chart-filter-group">
          <label className="chart-filter-label">Période</label>
          <div className="chart-filter-dates">
            <input
              type="date"
              value={filters.debut}
              onChange={(e) => onChange({ ...filters, debut: e.target.value })}
            />
            <span>→</span>
            <input
              type="date"
              value={filters.fin}
              onChange={(e) => onChange({ ...filters, fin: e.target.value })}
            />
          </div>
        </div>

        <div className="chart-filter-group">
          <label className="chart-filter-label">Granularité</label>
          <div className="chip-row">
            {(["jour", "semaine", "mois"] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`chip ${filters.granularite === g ? "active" : ""}`}
                onClick={() => onChange({ ...filters, granularite: g })}
              >
                {g === "jour" ? "Jour" : g === "semaine" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-filter-group">
          <label className="chart-filter-label">Activité</label>
          <select
            className="chart-filter-select"
            value={filters.activite_id}
            onChange={(e) => onChange({ ...filters, activite_id: e.target.value })}
          >
            <option value="">Toutes les activités</option>
            {activites.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="chart-filter-group">
          <label className="chart-filter-label">Type transaction</label>
          <div className="chip-row">
            {(["", "revenu", "decaissement"] as const).map((t) => (
              <button
                key={t || "all"}
                type="button"
                className={`chip ${filters.type_transaction === t ? "active" : ""}`}
                onClick={() => onChange({ ...filters, type_transaction: t })}
              >
                {t === "" ? "Tous" : t === "revenu" ? "Revenus" : "Dépenses"}
              </button>
            ))}
          </div>
        </div>

        <button className="btn primary chart-filter-apply" type="button" onClick={onApply}>
          Appliquer
        </button>
      </div>

      <div className="chart-filter-group chart-filter-types">
        <label className="chart-filter-label">
          Graphiques affichés
          {types.length > 0 && (
            <button
              type="button"
              className="chart-filter-reset"
              onClick={() => onChange({ ...filters, types_graphiques: [] })}
            >
              Tout afficher
            </button>
          )}
        </label>
        <div className="chip-row flex-wrap">
          {TYPES_GRAPHIQUES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip chip-type ${types.length === 0 || types.includes(t.id) ? "active" : ""}`}
              onClick={() => toggleType(t.id)}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { defaultChartFilters, filtersToQuery } from "../types/charts";
