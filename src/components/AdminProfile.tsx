import { useState } from "react";
import { api } from "../helpers/api";
import { refreshSite } from "../helpers/useSiteData";
import { Button } from "./Button";
import type { Profile } from "../types/site";
import styles from "./AdminCollection.module.css";

type Values = Omit<Profile, "updatedAt">;

const FIELDS: { key: keyof Values; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "name", label: "Your name" },
  { key: "tagline", label: "One-line intro", hint: "The big headline on the home page." },
  { key: "craft", label: "Core craft", hint: "e.g. Full-stack developer, mainly 3D designer" },
  { key: "bio", label: "About / background", multiline: true },
  { key: "availability", label: "Availability note", hint: "e.g. Open to new projects. Leave empty to hide." },
  { key: "contactEmail", label: "Public contact email", hint: "Shown on the site. Leave empty to use only the contact form." },
  { key: "githubUrl", label: "GitHub URL" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "otherUrl", label: "Other link (portfolio, X, Instagram...)" },
];

/** Edits the hero text, bio, availability and links. */
export const AdminProfile = ({ profile }: { profile: Profile }) => {
  const [values, setValues] = useState<Values>({
    name: profile.name,
    tagline: profile.tagline,
    craft: profile.craft,
    bio: profile.bio,
    availability: profile.availability,
    contactEmail: profile.contactEmail,
    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    otherUrl: profile.otherUrl,
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await api("/admin/profile", { body: { data: values } });
      await refreshSite();
      setNotice({ text: "Profile saved." });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Could not save.", error: true });
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
        <p className={styles.eyebrow}>Profile &amp; hero</p>
        {FIELDS.map((f) => (
          <div key={f.key} className={styles.field}>
            <label className={styles.label} htmlFor={`profile-${f.key}`}>{f.label}</label>
            {f.multiline ? (
              <textarea id={`profile-${f.key}`} className={styles.input} rows={6}
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            ) : (
              <input id={`profile-${f.key}`} className={styles.input} value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            )}
            {f.hint && <p className={styles.hint}>{f.hint}</p>}
          </div>
        ))}
        <div>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
};
