export type ThemeId = "ocean" | "forest" | "sunset" | "lavender" | "midnight" | "rose" | "earth";

export type ThemeColors = {
  blue: string;
  navy: string;
  gold: string;
  green: string;
  red: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  primaryLight: string;
  primaryBorder: string;
  accentBg: string;
  onPrimary: string;
  loginBg: string;
};

export type ThemeDefinition = {
  id: ThemeId;
  emoji: string;
  nameKey: string;
  preview: [string, string, string];
  colors: ThemeColors;
};

export const DEFAULT_THEME_ID: ThemeId = "ocean";
export const THEME_STORAGE_KEY = "koue_theme";

export const themes: ThemeDefinition[] = [
  {
    id: "ocean",
    emoji: "🌊",
    nameKey: "themeOcean",
    preview: ["#0757a6", "#0b2144", "#f3b20b"],
    colors: {
      blue: "#0757a6",
      navy: "#0b2144",
      gold: "#f3b20b",
      green: "#16a34a",
      red: "#dc2626",
      bg: "#f5f7fb",
      surface: "#ffffff",
      text: "#162033",
      muted: "#708094",
      line: "#dde5ef",
      primaryLight: "#eaf3ff",
      primaryBorder: "#cfe4ff",
      accentBg: "#edf2f7",
      onPrimary: "#ffffff",
      loginBg: "#061a37",
    },
  },
  {
    id: "forest",
    emoji: "🌿",
    nameKey: "themeForest",
    preview: ["#15803d", "#14532d", "#eab308"],
    colors: {
      blue: "#15803d",
      navy: "#14532d",
      gold: "#eab308",
      green: "#22c55e",
      red: "#dc2626",
      bg: "#f0fdf4",
      surface: "#ffffff",
      text: "#14532d",
      muted: "#4d7c5c",
      line: "#bbf7d0",
      primaryLight: "#dcfce7",
      primaryBorder: "#86efac",
      accentBg: "#ecfdf5",
      onPrimary: "#ffffff",
      loginBg: "#052e16",
    },
  },
  {
    id: "sunset",
    emoji: "🌅",
    nameKey: "themeSunset",
    preview: ["#ea580c", "#7c2d12", "#fbbf24"],
    colors: {
      blue: "#ea580c",
      navy: "#7c2d12",
      gold: "#fbbf24",
      green: "#16a34a",
      red: "#dc2626",
      bg: "#fff7ed",
      surface: "#ffffff",
      text: "#431407",
      muted: "#9a3412",
      line: "#fed7aa",
      primaryLight: "#ffedd5",
      primaryBorder: "#fdba74",
      accentBg: "#fff1e6",
      onPrimary: "#ffffff",
      loginBg: "#431407",
    },
  },
  {
    id: "lavender",
    emoji: "💜",
    nameKey: "themeLavender",
    preview: ["#7c3aed", "#4c1d95", "#c4b5fd"],
    colors: {
      blue: "#7c3aed",
      navy: "#4c1d95",
      gold: "#c4b5fd",
      green: "#16a34a",
      red: "#dc2626",
      bg: "#faf5ff",
      surface: "#ffffff",
      text: "#3b0764",
      muted: "#7e22ce",
      line: "#e9d5ff",
      primaryLight: "#f3e8ff",
      primaryBorder: "#d8b4fe",
      accentBg: "#f5f3ff",
      onPrimary: "#ffffff",
      loginBg: "#2e1065",
    },
  },
  {
    id: "midnight",
    emoji: "🌙",
    nameKey: "themeMidnight",
    preview: ["#38bdf8", "#0f172a", "#fbbf24"],
    colors: {
      blue: "#38bdf8",
      navy: "#0f172a",
      gold: "#fbbf24",
      green: "#4ade80",
      red: "#f87171",
      bg: "#1e293b",
      surface: "#334155",
      text: "#f1f5f9",
      muted: "#94a3b8",
      line: "#475569",
      primaryLight: "#334155",
      primaryBorder: "#64748b",
      accentBg: "#1e293b",
      onPrimary: "#0f172a",
      loginBg: "#020617",
    },
  },
  {
    id: "rose",
    emoji: "🌸",
    nameKey: "themeRose",
    preview: ["#e11d48", "#881337", "#fda4af"],
    colors: {
      blue: "#e11d48",
      navy: "#881337",
      gold: "#fda4af",
      green: "#16a34a",
      red: "#dc2626",
      bg: "#fff1f2",
      surface: "#ffffff",
      text: "#4c0519",
      muted: "#9f1239",
      line: "#fecdd3",
      primaryLight: "#ffe4e6",
      primaryBorder: "#fda4af",
      accentBg: "#fff1f2",
      onPrimary: "#ffffff",
      loginBg: "#4c0519",
    },
  },
  {
    id: "earth",
    emoji: "🏜️",
    nameKey: "themeEarth",
    preview: ["#b45309", "#78350f", "#d97706"],
    colors: {
      blue: "#b45309",
      navy: "#78350f",
      gold: "#d97706",
      green: "#16a34a",
      red: "#dc2626",
      bg: "#fffbeb",
      surface: "#ffffff",
      text: "#451a03",
      muted: "#92400e",
      line: "#fde68a",
      primaryLight: "#fef3c7",
      primaryBorder: "#fcd34d",
      accentBg: "#fffbeb",
      onPrimary: "#ffffff",
      loginBg: "#451a03",
    },
  },
];

export function getTheme(id: string): ThemeDefinition {
  return themes.find((theme) => theme.id === id) ?? themes[0];
}

export function applyTheme(themeId: ThemeId) {
  if (typeof document === "undefined") return;
  const theme = getTheme(themeId);
  const root = document.documentElement;
  root.dataset.theme = themeId;
  const { colors } = theme;
  root.style.setProperty("--blue", colors.blue);
  root.style.setProperty("--navy", colors.navy);
  root.style.setProperty("--gold", colors.gold);
  root.style.setProperty("--green", colors.green);
  root.style.setProperty("--red", colors.red);
  root.style.setProperty("--bg", colors.bg);
  root.style.setProperty("--surface", colors.surface);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--line", colors.line);
  root.style.setProperty("--primary-light", colors.primaryLight);
  root.style.setProperty("--primary-border", colors.primaryBorder);
  root.style.setProperty("--accent-bg", colors.accentBg);
  root.style.setProperty("--on-primary", colors.onPrimary);
  root.style.setProperty("--login-bg", colors.loginBg);
}
