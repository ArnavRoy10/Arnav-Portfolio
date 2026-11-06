import { useState } from "react";
import { api } from "../helpers/api";
import { refreshSite } from "../helpers/useSiteData";
import { Button } from "./Button";
import styles from "./AdminCollection.module.css";

export type AdminField = {
  key: string;
  label: string;
  kind?: "text" | "textarea" | "number";
  placeholder?: string;
};

type Item = { id: number } & Record<string, unknown>;

/** Add / edit / delete list for skills and experiments. */
export const AdminCollection = ({
  title,
  singular,
  endpoint,
  items,
  fields,
  primaryKey,
  secondaryKey,
}: {
  title: string;
  singular: string;
  endpoint: "skills" | "experiments";
  items: Item[];
  fields: AdminField[];
  primaryKey: string;
  secondaryKey?: string;
}) => {
  const blank = () => {
    const values: Record<string, string> = {};
    for (const f of fields) {
      values[f.key] = f.kind === "number" ? String(items.length + 1) : "";
    }
    return values;
  };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, string>>(blank);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const reset = () => {
    setEditingId(null);
    setValues(blank());
  };

  const startEdit = (item: Item) => {
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = String(item[f.key] ?? "");
    setEditingId(item.id);
    setValues(next);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const data: Record<string, string | number> = {};
    for (const f of fields) {
      data[f.key] = f.kind === "number" ? Number(values[f.key] || 0) : values[f.key] ?? "";
    }
    try {
      await api(`/admin/${endpoint}`, { body: { id: editingId ?? undefined, data } });
      await refreshSite();
      setNotice({ text: editingId ? `${singular} updated.` : `${singular} added.` });
      reset();
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Could not save.", error: true });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setSaving(true);
    try {
      await api(`/admin/${endpoint}/${id}`, { method: "DELETE" });
      await refreshSite();
      setConfirmId(null);
      if (editingId === id) reset();
      setNotice({ text: `${singular} deleted.` });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Could not delete.", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {notice && (
        <p role="status" className={`${styles.notice} ${notice.error ? styles.noticeError : ""}`}>
          {notice.text}
        </p>
      )}

      <form className={styles.panel} onSubmit={submit}>
        <div className={styles.formHead}>
          <p className={styles.eyebrow}>{editingId ? `Edit ${singular}` : `New ${singular}`}</p>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel edit
            </Button>
          )}
        </div>

        {fields.map((f) => (
          <div key={f.key} className={styles.field}>
            <label className={styles.label} htmlFor={`${endpoint}-${f.key}`}>{f.label}</label>
            {f.kind === "textarea" ? (
              <textarea id={`${endpoint}-${f.key}`} className={styles.input} rows={4}
                placeholder={f.placeholder} value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            ) : (
              <input id={`${endpoint}-${f.key}`} className={styles.input}
                type={f.kind === "number" ? "number" : "text"} placeholder={f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            )}
          </div>
        ))}

        <div>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Working…" : editingId ? "Save changes" : `Add ${singular}`}
          </Button>
        </div>
      </form>

      <div>
        <h2 className={styles.sectionTitle}>{title} ({items.length})</h2>
        {items.length === 0 ? (
          <p className={styles.empty}>Nothing here yet.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.order}>{String(item.sortOrder ?? "").padStart(2, "0")}</span>
                <div className={styles.itemText}>
                  <span className={styles.primary}>{String(item[primaryKey] ?? "")}</span>
                  {secondaryKey && <span className={styles.secondary}>{String(item[secondaryKey] ?? "")}</span>}
                </div>
                <div className={styles.actions}>
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>Edit</Button>
                  {confirmId === item.id ? (
                    <>
                      <Button size="sm" variant="destructive" disabled={saving} onClick={() => remove(item.id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(item.id)}>Delete</Button>
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
