import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getTheme, toggleTheme, type Theme } from "../utils/theme";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";

export default function Navbar() {
  const { email, logout } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  const { t, i18n } = useTranslation();

  function onToggleTheme() {
    const next = toggleTheme();
    setThemeState(next);
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: 12,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <Link to="/drive" style={{ fontWeight: 700, color: "var(--text)" }}>
        {t("nav.drive")}
      </Link>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onToggleTheme}>
          {theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ opacity: 0.8 }}>{t("nav.language")}:</span>
          <select
            value={i18n.language}
            onChange={(e) => setLanguage(e.target.value as "en" | "fi" | "es" | "ru")}
          >
            <option value="en">EN</option>
            <option value="fi">FI</option>
            <option value="es">ES</option>
            <option value="ru">RU</option>
          </select>
        </label>

        {email && <span style={{ opacity: 0.8 }}>{email}</span>}
        <button onClick={logout}>{t("nav.logout")}</button>
      </div>
    </div>
  );
}
