import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api/http";
import type { DocumentDTO } from "../types";

type SortKey = "updatedDesc" | "updatedAsc" | "createdDesc" | "createdAsc" | "titleAsc" | "titleDesc";

export default function Drive() {
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedDesc");

  async function loadDocs() {
    setError("");
    try {
      const data = await api.getDocs();
      setDocs(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load documents";
      setError(message);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function createDoc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    setBusy(true);
    setError("");
    try {
      await api.createDoc(title.trim());
      setTitle("");
      await loadDocs();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create document";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteDoc(id: string) {
    if (!window.confirm("Delete this document?")) return;

    setBusy(true);
    setError("");
    try {
      await api.deleteDoc(id);
      await loadDocs();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete document";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const visibleDocs = useMemo(() => {
    const q = query.trim().toLowerCase();

    let filtered = docs;
    if (q) {
      filtered = docs.filter((d) => (d.title || "").toLowerCase().includes(q));
    }

    const sorted = [...filtered].sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();

      switch (sortKey) {
        case "titleAsc":
          return aTitle.localeCompare(bTitle);
        case "titleDesc":
          return bTitle.localeCompare(aTitle);

        case "createdAsc":
          return aCreated - bCreated;
        case "createdDesc":
          return bCreated - aCreated;

        case "updatedAsc":
          return aUpdated - bUpdated;
        case "updatedDesc":
        default:
          return bUpdated - aUpdated;
      }
    });

    return sorted;
  }, [docs, query, sortKey]);

  return (
    <div>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
        <h2>Your documents</h2>

        {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

        {}
        <form onSubmit={createDoc} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="New document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: 1 }}
          />
          <button disabled={busy} type="submit">
            Create
          </button>
        </form>

        {}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            placeholder="Search by title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />

          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="updatedDesc">Last updated (newest)</option>
            <option value="updatedAsc">Last updated (oldest)</option>
            <option value="createdDesc">Created (newest)</option>
            <option value="createdAsc">Created (oldest)</option>
            <option value="titleAsc">Title (A → Z)</option>
            <option value="titleDesc">Title (Z → A)</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {visibleDocs.length === 0 && (
            <div style={{ opacity: 0.7 }}>
              {docs.length === 0 ? "No documents yet." : "No matches for your search."}
            </div>
          )}

          {visibleDocs.map((d) => (
            <div
              key={d._id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{d.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Created: {new Date(d.createdAt).toLocaleString()}
                  {" • "}
                  Updated: {new Date(d.updatedAt).toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Link to={`/docs/${d._id}`}>
                  <button>Edit</button>
                </Link>
                <button disabled={busy} onClick={() => deleteDoc(d._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
