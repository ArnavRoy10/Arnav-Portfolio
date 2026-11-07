import { useRef, useState } from "react";
import { api } from "../helpers/api";
import { refreshSite } from "../helpers/useSiteData";
import { Button } from "./Button";
import type { Profile } from "../types/site";
import styles from "./AdminCollection.module.css";

type Values = Omit<Profile, "updatedAt">;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

const FIELDS: { key: keyof Values; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "name", label: "Your name" },
  { key: "tagline", label: "One-line intro", hint: "The big headline on the home page." },
  { key: "craft", label: "Core craft", hint: "e.g. Full-stack developer, mainly 3D designer" },
  { key: "bio", label: "About / background", multiline: true },
  { key: "availability", label: "Availability note", hint: "e.g. Open to new projects. Leave empty to hide." },
  { key: "contactEmail", label: "Public contact email", hint: "Shown on the site. Leave empty to use only the contact form." },
  { key: "whatsapp", label: "WhatsApp number", hint: "Country code and number, digits only (e.g. 919876543210). Adds a direct-message button on the Contact page. Leave empty to hide." },
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
    photoUrl: profile.photoUrl,
    whatsapp: profile.whatsapp,
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setNotice({ text: "Use a PNG, JPEG, WebP or GIF image.", error: true });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setNotice({ text: "Image is too large (max 8 MB).", error: true });
      return;
    }
    setUploading(true);
    try {
      const data = await toBase64(file);
      const { url } = await api<{ url: string }>("/admin/upload", {
        body: { contentType: file.type, data },
      });
      setValues((prev) => ({ ...prev, photoUrl: url }));
      setNotice({ text: "Photo uploaded. Press Save profile to publish it." });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : "Upload failed.", error: true });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-photo">Your photo</label>
          {values.photoUrl && (
            <img src={values.photoUrl} alt="Your photo" style={{ width: "8rem", aspectRatio: "4 / 5", objectFit: "cover", border: "1px solid var(--border-strong)" }} />
          )}
          <input id="profile-photo" ref={fileRef} type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading} onChange={(e) => onPickPhoto(e.target.files?.[0])} />
          {uploading && <p className={styles.hint}>Uploading…</p>}
          {values.photoUrl && !uploading && (
            <div>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setValues({ ...values, photoUrl: "" })}>
                Remove photo
              </Button>
            </div>
          )}
          <p className={styles.hint}>A portrait works best (PNG, JPEG, WebP or GIF, up to 8 MB).</p>
        </div>

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
