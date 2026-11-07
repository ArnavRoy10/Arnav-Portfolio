import { useState } from "react";
import { api } from "../helpers/api";
import { useSiteData } from "../helpers/useSiteData";
import { Button } from "../components/Button";
import styles from "./contact.module.css";

export default function ContactPage() {
  const { data } = useSiteData();
  const profile = data?.profile;

  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api("/contact", { body: form });
      setSent(true);
      setForm({ name: "", email: "", message: "", website: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const links = profile
    ? [
        { label: "GitHub", href: profile.githubUrl },
        { label: "LinkedIn", href: profile.linkedinUrl },
        { label: "More", href: profile.otherUrl },
      ].filter((l) => l.href)
    : [];

  return (
    <section className={styles.wrap}>
      <span className={styles.label}>(04) Contact</span>

      <h1 className={styles.headline}>
        Let's solve something <em>real</em>.
      </h1>

      {profile?.availability && (
        <p className={styles.status}>
          <i className={styles.dot} aria-hidden="true" />
          {profile.availability}
        </p>
      )}

      <div className={styles.columns}>
        <div>
          {sent ? (
            <div className={styles.thanks}>
              <h2 className={styles.thanksTitle}>Message sent.</h2>
              <p>Thanks for reaching out. I'll get back to you soon.</p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={submit}>
              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="c-name">Name</label>
                <input id="c-name" className={styles.input} required maxLength={100}
                  autoComplete="name" placeholder="Your name" disabled={sending}
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="c-email">Email</label>
                <input id="c-email" className={styles.input} type="email" required maxLength={200}
                  autoComplete="email" placeholder="you@email.com" disabled={sending}
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="c-message">Message</label>
                <textarea id="c-message" className={styles.input} required rows={6} minLength={10}
                  maxLength={3000} placeholder="What problem are you trying to solve?" disabled={sending}
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>

              {/* Honeypot: hidden from people, bots fill it in. */}
              <div className={styles.honeypot} aria-hidden="true">
                <label>
                  Website
                  <input type="text" tabIndex={-1} autoComplete="off" value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </label>
              </div>

              <Button type="submit" size="lg" disabled={sending}>
                {sending ? "Sending..." : "Send message"}
              </Button>
            </form>
          )}
        </div>

        <div className={styles.infoCol}>
          {profile?.whatsapp && (
            <a
              className={styles.direct}
              href={`https://wa.me/${profile.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Message me directly on WhatsApp ↗
            </a>
          )}
          {profile?.contactEmail && (
            <a className={styles.mail} href={`mailto:${profile.contactEmail}`}>
              {profile.contactEmail}
            </a>
          )}
          {links.length > 0 && (
            <ul className={styles.socials}>
              {links.map((social) => (
                <li key={social.label}>
                  <a className={styles.social} href={social.href} target="_blank" rel="noopener noreferrer">
                    <span>{social.label}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
