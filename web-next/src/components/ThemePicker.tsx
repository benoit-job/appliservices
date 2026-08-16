"use client";

import { useEffect, useState } from "react";
import { applyTheme, DEFAULT_THEME_ID, getTheme, THEME_STORAGE_KEY, themes, type ThemeId } from "../app/themes";

type Props = {
  t: (key: string) => string;
};

export function ThemePicker({ t }: Props) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    const id = saved && themes.some((theme) => theme.id === saved) ? saved : DEFAULT_THEME_ID;
    setActiveId(id);
    applyTheme(id);
  }, []);

  function selectTheme(id: ThemeId) {
    setActiveId(id);
    applyTheme(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }

  return (
    <>
      <button
        type="button"
        className="theme-picker-toggle"
        onClick={() => setOpen((value) => !value)}
        title={t("themePicker")}
        aria-label={t("themePicker")}
        aria-expanded={open}
      >
        <span className="theme-picker-icon" aria-hidden="true">🎨</span>
      </button>

      <div className={`theme-picker-backdrop ${open ? "visible" : ""}`} onClick={() => setOpen(false)} aria-hidden={!open} />

      <aside className={`theme-picker-panel ${open ? "open" : ""}`} aria-label={t("themePicker")}>
        <div className="theme-picker-head">
          <h3>{t("themePicker")}</h3>
          <p>{t("themePickerDesc")}</p>
          <button type="button" className="theme-picker-close" onClick={() => setOpen(false)} aria-label={t("cancel")}>
            ✕
          </button>
        </div>
        <div className="theme-picker-grid">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`theme-picker-card ${activeId === theme.id ? "active" : ""}`}
              onClick={() => selectTheme(theme.id)}
            >
              <span className="theme-picker-swatches" aria-hidden="true">
                {theme.preview.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </span>
              <span className="theme-picker-label">
                {theme.emoji} {t(theme.nameKey)}
              </span>
              {activeId === theme.id && <span className="theme-picker-check">✓</span>}
            </button>
          ))}
        </div>
        <p className="theme-picker-foot">{t("themeActive")}: {t(getTheme(activeId).nameKey)}</p>
      </aside>
    </>
  );
}
