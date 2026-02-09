import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getTheme, toggleTheme, type Theme } from "../utils/theme";
import { useState } from "react";

export default function Navbar() {
  const { email, logout } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

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
        My Drive
      </Link>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={onToggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {email && <span style={{ opacity: 0.8 }}>{email}</span>}
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
