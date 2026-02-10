import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api/http";
import jsPDF from "jspdf";
import type { DocumentDTO } from "../types";
import { useTranslation } from "react-i18next";

export default function Editor() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocumentDTO | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const renewTimer = useRef<number | null>(null);

  async function loadDoc() {
    const docs = await api.getDocs();
    const found = docs.find((d) => d._id === id);
    if (!found) throw new Error("Document not found in your drive.");
    setDoc(found);
    setTitle(found.title || "");
    setContent(found.content || "");
  }

  async function acquireAndStartRenew() {
    setStatus("Acquiring lock...");
    await api.acquireLock(id!);

    renewTimer.current = window.setInterval(async () => {
      try {
        await api.renewLock(id!);
      } catch {
        if (renewTimer.current) {
          clearInterval(renewTimer.current);
          renewTimer.current = null;
        }
      }
    }, 15000);

    setStatus("Lock acquired");
  }

  async function releaseLockSafe() {
    try {
      await api.releaseLock(id!);
    } catch {
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        await loadDoc();
        await acquireAndStartRenew();
      } catch (e: unknown) {
        if (!alive) return;
        const message = e instanceof Error ? e.message : "Failed to open document";
        setError(message);
      }
    })();

    return () => {
      alive = false;
      if (renewTimer.current) {
        clearInterval(renewTimer.current);
        renewTimer.current = null;
      }
      releaseLockSafe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    setError("");
    setStatus(t("editor.saving"));
    try {
      const updated = await api.updateDoc(id!, { title, content });
      setDoc(updated);
      setStatus(t("editor.saved"));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save document";
      setError(message);
      setStatus("");
    }
  }

  async function enablePublic() {
    setError("");
    try {
      const res = await api.enablePublicLink(id!);
      const fullUrl = `${window.location.origin}${res.publicUrl.replace("/api/public/", "/public/")}`;

      setStatus(`Public link copied`);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        setStatus(`Public link copied`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to enable public link";
      setError(message);
    }
  }

  function downloadPDF() {
    if (!doc) return;

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;

    pdf.setFont("Times", "Normal");
    pdf.setFontSize(16);
    pdf.text(title || "Untitled document", margin, 60);

    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(content || "", pageWidth);
    pdf.text(lines, margin, 100);

    pdf.save(`${title || "document"}.pdf`);
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
          <Link to="/drive">{t("editor.back")}</Link>
          <h2>{t("editor.editDoc")}</h2>
          <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>
          <div style={{ marginTop: 12, opacity: 0.8 }}>{t("editor.lockHint")}</div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: 16 }}>{t("editor.loading")}</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
        <Link to="/drive">{t("editor.back")}</Link>

        <h2 style={{ marginTop: 12 }}>{t("editor.editDoc")}</h2>

        {status && <div style={{ marginBottom: 10, color: "green" }}>{status}</div>}
        {error && <div style={{ marginBottom: 10, color: "crimson" }}>{error}</div>}

        <div style={{ display: "grid", gap: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            style={{ width: "100%" }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={save}>{t("editor.save")}</button>
            <button onClick={downloadPDF}>{t("editor.downloadPdf")}</button>
            <button onClick={enablePublic}>{t("editor.enablePublic")}</button>
            <button onClick={() => navigate("/drive")}>{t("editor.close")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
