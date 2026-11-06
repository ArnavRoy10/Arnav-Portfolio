import { useRef, useState } from "react";
import { api } from "../helpers/api";
import { refreshSite } from "../helpers/useSiteData";
import { Button } from "./Button";
import type { Project } from "../types/site";
import styles from "./AdminProjects.module.css";

type FormState = {
  title: string;
  details: string;
  tools: string;
  demoUrl: string;
  repoUrl: string;
  thumbnailUrl: string;
  featured: boolean;
  sortOrder: string;
};

const blank = (order: number): FormState => ({
  title: "",
  details: "",
  tools: "",
  demoUrl: "",
  repoUrl: "",
  thumbnailUrl: "",
  featured: false,
  sortOrder: String(order),
});

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Reads a file as base64 (without the "data:...;base64," prefix). */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

/** One-page project manager: publish form on top, published list below. */
export const AdminProjects = ({ projects }: { projects: Project[] }) => {
  const nextOrder = projects.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => blank(nextOrder));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setEditingId(null);
    setForm(blank(nextOrder));
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      details: p.details,
      tools: p.tools,
      demoUrl: p.demoUrl,
      repoUrl: p.repoUrl,
      thumbnailUrl: p.thumbnailUrl,
      featured: p.featured,
      sortOrder: String(p.sortOrder),
    });
    setNotice(null);
    if (fileRef.current) fileRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setNotice({ text: "Use a PNG, JPEG, WebP or GIF image.", error: true });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setNotice({ text: "Image is too large (max 8 MB).", error: true });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const data = await toBase64(file);
      const { url } = await api<{ url: string }>("/admin/upload", {
        body: { contentType: file.type, data },
      });
      set("thumbnailUrl", url);
      setNotice({ text: "Cover image uploaded." });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Upload failed.", error: true });
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      await api("/admin/projects", {
        body: {
          id: editingId ?? undefined,
          data: {
            title: form.title,
            details: form.details,
            tools: form.tools,
            demoUrl: form.demoUrl,
            repoUrl: form.repoUrl,
            thumbnailUrl: form.thumbnailUrl,
            featured: form.featured,
            sortOrder: Number(form.sortOrder) || 0,
          },
        },
      });
      await refreshSite();
      setNotice({ text: editingId ? "Project updated." : "Project published." });
      reset();
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Could not save.", error: true });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setSaving(true);
    setNotice(null);
    try {
      await api(`/admin/projects/${id}`, { method: "DELETE" });
      await refreshSite();
      setConfirmId(null);
      if (editingId === id) reset();
      setNotice({ text: "Project deleted." });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Could not delete.", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {notice && (
        <p
          role="status"
          className={`${styles.notice} ${notice.error ? styles.noticeError : ""}`}
        >
          {notice.text}
        </p>
      )}

      <form ref={formRef} className={styles.panel} onSubmit={submit}>
        <div className={styles.formHead}>
          <p className={styles.eyebrow}>{editingId ? "Edit project" : "New project"}</p>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel edit
            </Button>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="pj-title">Title</label>
          <input id="pj-title" className={styles.input} required maxLength={120}
            value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="pj-details">Details</label>
          <textarea id="pj-details" className={styles.input} rows={5} maxLength={3000}
            placeholder="What this project is and anything worth knowing about it"
            value={form.details} onChange={(e) => set("details", e.target.value)} />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="pj-tools">Tools (comma separated)</label>
            <input id="pj-tools" className={styles.input} maxLength={300}
              placeholder="React, Three.js, Claude Code"
              value={form.tools} onChange={(e) => set("tools", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="pj-order">Order</label>
            <input id="pj-order" className={styles.input} type="number" min={0}
              value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="pj-demo">Live demo link</label>
            <input id="pj-demo" className={styles.input} type="url" maxLength={500}
              placeholder="https://your-live-site.com"
              value={form.demoUrl} onChange={(e) => set("demoUrl", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="pj-repo">Code repository link</label>
            <input id="pj-repo" className={styles.input} type="url" maxLength={500}
              placeholder="https://github.com/..."
              value={form.repoUrl} onChange={(e) => set("repoUrl", e.target.value)} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="pj-cover">Cover image</label>
          <div className={styles.cover}>
            {form.thumbnailUrl && (
              <div className={styles.coverPreview}>
                <img src={form.thumbnailUrl} alt="Cover preview" />
              </div>
            )}
            <div className={styles.coverActions}>
              <input id="pj-cover" ref={fileRef} type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploading} onChange={(e) => onPickFile(e.target.files?.[0])} />
              {uploading && <p className={styles.hint}>Uploading…</p>}
              {form.thumbnailUrl && !uploading && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("thumbnailUrl", "")}>
                  Remove cover
                </Button>
              )}
            </div>
          </div>
          <p className={styles.hint}>PNG, JPEG, WebP or GIF, up to 8 MB. Leave empty to use a wireframe graphic.</p>
        </div>

        <label className={styles.check}>
          <input type="checkbox" checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)} />
          Mark as signature project (shown first)
        </label>

        <div className={styles.submitRow}>
          <Button type="submit" size="lg" disabled={saving || uploading}>
            {saving ? "Working…" : editingId ? "Save changes" : "Publish project"}
          </Button>
        </div>
      </form>

      <div>
        <h2 className={styles.sectionTitle}>Published ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className={styles.empty}>No projects published yet.</p>
        ) : (
          <ul className={styles.list}>
            {projects.map((p) => (
              <li key={p.id} className={styles.item}>
                <div className={styles.thumb}>
                  {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" />}
                </div>
                <div className={styles.itemText}>
                  <span className={styles.itemTitle}>
                    <span>{p.title}</span>
                    {p.featured && <span className={styles.badge}>Signature</span>}
                  </span>
                  <span className={styles.itemSub}>{p.tools || "No tools listed"}</span>
                </div>
                <div className={styles.actions}>
                  <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                  {confirmId === p.id ? (
                    <>
                      <Button size="sm" variant="destructive" disabled={saving} onClick={() => remove(p.id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(p.id)}>Delete</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
