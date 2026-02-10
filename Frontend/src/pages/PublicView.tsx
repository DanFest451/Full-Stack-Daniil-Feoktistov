import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/http";
import type { PublicDocDTO } from "../types";
import { useTranslation } from "react-i18next";

export default function PublicView() {
  const { t } = useTranslation();

  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<PublicDocDTO | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setError(t("public.missingToken"));
      return;
    }

    (async () => {
      try {
        const res = await api.getPublicDoc(token);
        setData(res);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load public document";
        setError(message);
      }
    })();
  }, [token, t]);

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/login">{t("public.login")}</Link>
      </div>

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {!data ? (
        <div>{t("public.loading")}</div>
      ) : (
        <>
          <h2>{data.title}</h2>
          <div style={{ whiteSpace: "pre-wrap", border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
            {data.content}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            {t("public.updated")}: {new Date(data.updatedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
