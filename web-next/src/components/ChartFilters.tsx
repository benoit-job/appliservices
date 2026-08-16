"use client";

import type { ActiviteRef, ChartFilters } from "../types/charts";
import { TYPES_GRAPHIQUES } from "../types/charts";

type Props = {
  filters: ChartFilters;
  activites: ActiviteRef[];
  onChange: (next: ChartFilters) => void;
  onApply: () => void;
  t: (key: string) => string;
};

export function ChartFiltersBar({ filters, activites, onChange, onApply, t }: Props) {
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
          <label className="chart-filter-label">{t("period").toUpperCase()}</label>
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
          <label className="chart-filter-label">{t("granularity").toUpperCase()}</label>
          <div className="chip-row">
            {(["jour", "semaine", "mois"] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`chip ${filters.granularite === g ? "active" : ""}`}
                onClick={() => onChange({ ...filters, granularite: g })}
              >
                {t(g)}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-filter-group">
          <label className="chart-filter-label">{t("activity").toUpperCase()}</label>
          <select
            className="chart-filter-select"
            value={filters.activite_id}
            onChange={(e) => onChange({ ...filters, activite_id: e.target.value })}
          >
            <option value="">{t("allActivities")}</option>
            {activites.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="chart-filter-group">
          <label className="chart-filter-label">{t("transactionType").toUpperCase()}</label>
          <div className="chip-row">
            {(["", "revenu", "decaissement"] as const).map((txType) => (
              <button
                key={txType || "all"}
                type="button"
                className={`chip ${filters.type_transaction === txType ? "active" : ""}`}
                onClick={() => onChange({ ...filters, type_transaction: txType })}
              >
                {t(txType === "" ? "all" : txType === "revenu" ? "income" : "expenses")}
              </button>
            ))}
          </div>
        </div>

        <button className="btn primary chart-filter-apply" type="button" onClick={onApply}>
          {t("apply")}
        </button>
      </div>

      <div className="chart-filter-group chart-filter-types">
        <label className="chart-filter-label">
          {t("displayedGraphs").toUpperCase()}
          {types.length > 0 && (
            <button
              type="button"
              className="chart-filter-clear"
              onClick={() => onChange({ ...filters, types_graphiques: undefined })}
            >
              Vider
            </button>
          )}
        </label>
        <div className="chip-row flex-wrap">
          {TYPES_GRAPHIQUES.map((typeObj) => {
            let translated = t(typeObj.id);
            if (translated === typeObj.id) {
              if (typeObj.id === "evolution_financiere") translated = t("financialEvolution");
              if (typeObj.id === "repartition_activites") translated = t("activityDistribution");
              if (typeObj.id === "resultat_activites") translated = t("resultByActivity");
              if (typeObj.id === "repartition_categories") translated = t("categories");
              if (typeObj.id === "echeances_statut") translated = t("deadlines");
              if (typeObj.id === "inventaire_activite") translated = t("inventory");
              if (typeObj.id === "modes_paiement") translated = t("paymentMethods");
              if (typeObj.id === "recouvrement_echeances") translated = t("recovery");
            }
            return (
            <button
              key={typeObj.id}
              type="button"
              className={`chip chip-type ${types.length === 0 || types.includes(typeObj.id) ? "active" : ""}`}
              onClick={() => toggleType(typeObj.id)}
            >
              <span>{typeObj.icon}</span>
              {translated}
            </button>
          )})}
        </div>
      </div>
    </div>
  );
}

export { defaultChartFilters, filtersToQuery } from "../types/charts";
