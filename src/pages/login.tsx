import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../helpers/api";
import { Button } from "../components/Button";
import styles from "./login.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/auth/login", { body: { email, password } });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.wrap}>
      <span className={styles.label}>Admin</span>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.note}>
        Only the site owner can edit this portfolio. Use the email and password
        from your <code>.env</code> file.
      </p>

      <form className={styles.form} onSubmit={submit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="l-email">Email</label>
          <input id="l-email" className={styles.input} type="email" required autoComplete="email"
            value={email} disabled={loading} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="l-pass">Password</label>
          <input id="l-pass" className={styles.input} type="password" required autoComplete="current-password"
            value={password} disabled={loading} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </section>
  );
}
