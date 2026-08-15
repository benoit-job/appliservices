export type ChartSeries = {
  id: string;
  label: string;
  couleur: string;
  donnees: number[];
  couleurs?: string[];
};

export type Graphique = {
  id: string;
  type: "line" | "bar" | "pie" | "doughnut" | "area";
  titre: string;
  description?: string;
  devise: string;
  periode?: { debut: string; fin: string };
  labels: string[];
  series: ChartSeries[];
  meta?: Record<string, number | string>;
  filtres_appliques?: Record<string, string | number | null>;
};

export type ChartFilters = {
  debut: string;
  fin: string;
  granularite: "jour" | "semaine" | "mois";
  activite_id: string;
  type_transaction: string;
  types_graphiques?: string[];
};

export type ActiviteRef = { id: number; nom: string; code?: string };

export const TYPES_GRAPHIQUES: Array<{ id: string; label: string; icon: string }> = [
  { id: "evolution_financiere", label: "Évolution", icon: "📈" },
  { id: "repartition_activites", label: "Activités", icon: "📊" },
  { id: "resultat_activites", label: "Résultat", icon: "💰" },
  { id: "repartition_categories", label: "Catégories", icon: "🍩" },
  { id: "echeances_statut", label: "Échéances", icon: "⏱" },
  { id: "inventaire_activite", label: "Inventaire", icon: "📦" },
  { id: "modes_paiement", label: "Paiement", icon: "💳" },
  { id: "recouvrement_echeances", label: "Recouvrement", icon: "🎯" },
];

export function defaultChartFilters(): ChartFilters {
  const now = new Date();
  const debut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { debut, fin, granularite: "jour", activite_id: "", type_transaction: "", types_graphiques: [] };
}

export function filtersToQuery(filters: ChartFilters): string {
  const params = new URLSearchParams();
  params.set("debut", filters.debut);
  params.set("fin", filters.fin);
  params.set("granularite", filters.granularite);
  if (filters.activite_id) params.set("activite_id", filters.activite_id);
  if (filters.type_transaction) params.set("type_transaction", filters.type_transaction);
  if (filters.types_graphiques?.length) params.set("types", filters.types_graphiques.join(","));
  return params.toString();
}

export function formatChartMoney(value: number, devise = "FCFA"): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} ${devise}`;
}
