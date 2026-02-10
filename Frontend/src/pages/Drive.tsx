import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api/http";
import type { DocumentDTO, UploadDTO } from "../types";
import { useTranslation } from "react-i18next";

type SortKey =
  | "updatedDesc"
  | "updatedAsc"
  | "createdDesc"
  | "createdAsc"
  | "titleAsc"
  | "titleDesc";

type ViewMode = "drive" | "trash" | "images";

export default function Drive() {
  const { t } = useTranslation();

  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [uploads, setUploads] = useState<UploadDTO[]>([]);

  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [query, setQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedDesc");
  const [view, setView] = useState<ViewMode>("drive");

  const [file, setFile] = useState<File | null>(null);

  async function loadDocs() {
    setError("");
    try {
      const data = view === "trash" ? await api.getTrash() : await api.getDocs();
      setDocs(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load documents";
      setError(message);
    }
  }

  async function loadUploads() {
    setError("");
    try {
      const data = await api.getUploads();
      setUploads(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load images";
      setError(message);
    }
  }

  useEffect(() => {
    if (view === "images") loadUploads();
    else loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

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
    if (!window.confirm(t("drive.confirmDelete"))) return;

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

  async function cloneDoc(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.cloneDoc(id);
      await loadDocs();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to clone document";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const visibleDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = docs;

    if (q) filtered = docs.filter((d) => d.title.toLowerCase().includes(q));

    return [...filtered].sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
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
  }, [docs, query, sortKey]);

  // For image thumbnails
  const backendBase: string = import.meta.env.VITE_API_URL || "http://localhost:5000";

  return (
    <div>
      <Navbar />

      <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
        <h2>
          {view === "drive"
            ? t("drive.yourDocs")
            : view === "trash"
            ? t("drive.recycleBin")
            : t("drive.imagesTab")}
        </h2>

        {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => setView("drive")} disabled={view === "drive"}>
            {t("drive.driveTab")}
          </button>
          <button onClick={() => setView("trash")} disabled={view === "trash"}>
            {t("drive.trashTab")}
          </button>
          <button onClick={() => setView("images")} disabled={view === "images"}>
            {t("drive.imagesTab")}
          </button>

          {view === "trash" && (
            <button
              style={{ marginLeft: "auto" }}
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(t("drive.confirmEmpty"))) return;
                setBusy(true);
                setError("");
                try {
                  await api.emptyTrash();
                  await loadDocs();
                } catch (e: unknown) {
                  const message = e instanceof Error ? e.message : "Failed to empty trash";
                  setError(message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("drive.emptyTrash")}
            </button>
          )}
        </div>

        {/*Drive / Trash view */}
        {view !== "images" && (
          <>
            {/* Create */}
            {view === "drive" && (
              <form onSubmit={createDoc} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  placeholder={t("drive.newTitle")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button disabled={busy} type="submit">
                  {t("drive.create")}
                </button>
              </form>
            )}

            {/* Search + Sort */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                placeholder={t("drive.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ flex: 1, minWidth: 220 }}
              />

              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="updatedDesc">{t("drive.sort.updatedNewest")}</option>
                <option value="updatedAsc">{t("drive.sort.updatedOldest")}</option>
                <option value="createdDesc">{t("drive.sort.createdNewest")}</option>
                <option value="createdAsc">{t("drive.sort.createdOldest")}</option>
                <option value="titleAsc">{t("drive.sort.titleAZ")}</option>
                <option value="titleDesc">{t("drive.sort.titleZA")}</option>
              </select>
            </div>

            {/* Document list */}
            <div style={{ display: "grid", gap: 10 }}>
              {visibleDocs.length === 0 && (
                <div style={{ opacity: 0.7 }}>
                  {docs.length === 0 ? t("drive.noDocs") : t("drive.noMatches")}
                </div>
              )}

              {visibleDocs.map((d) => (
                <div
                  key={d._id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--card)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Created: {new Date(d.createdAt).toLocaleString()} • Updated:{" "}
                      {new Date(d.updatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {view === "drive" ? (
                      <>
                        <Link to={`/docs/${d._id}`}>
                          <button>{t("drive.edit")}</button>
                        </Link>

                        <button disabled={busy} onClick={() => cloneDoc(d._id)}>
                          {t("drive.clone")}
                        </button>

                        <button disabled={busy} onClick={() => deleteDoc(d._id)}>
                          {t("drive.delete")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            setError("");
                            try {
                              await api.restoreDoc(d._id);
                              await loadDocs();
                            } catch (e: unknown) {
                              const message = e instanceof Error ? e.message : "Failed to restore";
                              setError(message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {t("drive.restore")}
                        </button>

                        <button
                          disabled={busy}
                          onClick={async () => {
                            if (!window.confirm(t("drive.confirmForever"))) return;
                            setBusy(true);
                            setError("");
                            try {
                              await api.deleteForever(d._id);
                              await loadDocs();
                            } catch (e: unknown) {
                              const message = e instanceof Error ? e.message : "Failed to delete forever";
                              setError(message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {t("drive.deleteForever")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Imges view */}
        {view === "images" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              <button
                disabled={busy || !file}
                onClick={async () => {
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  try {
                    await api.uploadImage(file);
                    setFile(null);
                    await loadUploads();
                  } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : "Upload failed";
                    setError(message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("drive.upload")}
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {uploads.length === 0 && (
                <div style={{ opacity: 0.7 }}>{t("drive.noImages")}</div>
              )}

              {uploads.map((u) => (
                <div
                  key={u._id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 12,
                    background: "var(--card)",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <img
                      src={`${backendBase}${u.url}`}
                      alt={u.originalName}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    />

                    <div>
                      <div style={{ fontWeight: 700 }}>{u.originalName}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Uploaded: {new Date(u.createdAt).toLocaleString()} •{" "}
                        {(u.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm(t("drive.confirmDeleteImage"))) return;
                      setBusy(true);
                      setError("");
                      try {
                        await api.deleteUpload(u._id);
                        await loadUploads();
                      } catch (e: unknown) {
                        const message = e instanceof Error ? e.message : "Delete failed";
                        setError(message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t("drive.delete")}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
