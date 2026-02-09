import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api/http";
import type { DocumentDTO } from "../types";

export default function Editor() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocumentDTO | null>(null);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const renewTimer = useRef<number | null>(null);

  async function loadDoc(docId: string) {
    const docs = await api.getDocs();
    const found = docs.find((d) => d._id === docId);
    if (!found) throw new Error("Document not found in your drive.");
    setDoc(found);
    setTitle(found.title || "");
    setContent(found.content || "");
  }

  async function acquireAndStartRenew(docId: string) {
    setStatus("Acquiring lock...");
    await api.acquireLock(docId);

    renewTimer.current = window.setInterval(async () => {
      try {
        await api.renewLock(docId);
      } catch {
        if (renewTimer.current !== null) {
          window.clearInterval(renewTimer.current);
          renewTimer.current = null;
        }
      }
    }, 15000);

    setStatus("Lock acquired");
  }

  async function releaseLockSafe(docId: string) {
    try {
      await api.releaseLock(docId);
    } catch {
    }
  }

  useEffect(() => {
    if (!id) {
      setError("Missing document id in URL.");
      return;
    }

    let alive = true;

    (async () => {
      try {
        setError("");
        await loadDoc(id);
        await acquireAndStartRenew(id);
      } catch (e: unknown) {
        if (!alive) return;
        const message = e instanceof Error ? e.message : "Failed to open editor";
        setError(message);
      }
    })();

    return () => {
      alive = false;
      if (renewTimer.current !== null) {
        window.clearInterval(renewTimer.current);
        renewTimer.current = null;
      }
      releaseLockSafe(id);
    };
  }, [id]);

  async function save() {
    if (!id) return;
    setError("");
    setStatus("Saving...");
    try {
      const updated = await api.updateDoc(id, { title, content });
      setDoc(updated);
      setStatus("Saved");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setError(message);
      setStatus("");
    }
  }

  async function enablePublic() {
    if (!id) return;
    setError("");
    try {
      const res = await api.enablePublicLink(id);
      const full = `${window.location.origin}${res.publicUrl.replace("/api/public/", "/public/")}`;

      setStatus(`Public link enabled: ${full}`);

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(full);
        setStatus(`Public link copied ${full}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to enable public link";
      setError(message);
    }
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <Link to="/drive">← Back to Drive</Link>
          </div>

          <h2>Editor</h2>
          <div style={{ color: "crimson" }}>{error}</div>

          <div style={{ marginTop: 12, opacity: 0.8 }}>
            If you see “being edited by another user”, wait ~60 seconds or ask them to close the editor.
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: 16 }}>Loading editor...</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <Link to="/drive">← Back to Drive</Link>
        </div>

        <h2>Edit document</h2>

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
            <button onClick={save}>Save</button>
            <button onClick={enablePublic}>Enable public view link</button>
            <button onClick={() => navigate("/drive")}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
