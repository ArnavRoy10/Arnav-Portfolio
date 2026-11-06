import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../helpers/api";
import { useSiteData } from "../helpers/useSiteData";
import { AdminProjects } from "../components/AdminProjects";
import { AdminProfile } from "../components/AdminProfile";
import { AdminCollection } from "../components/AdminCollection";
import { AdminMessages } from "../components/AdminMessages";
import { Button } from "../components/Button";
import styles from "./admin.module.css";

const TABS = [
  { id: "projects", label: "Projects" },
  { id: "profile", label: "Profile" },
  { id: "skills", label: "Skills & tools" },
  { id: "experiments", label: "Experiments" },
  { id: "messages", label: "Messages" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const navigate = useNavigate();
  const { data } = useSiteData();
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("projects");

  // Only the logged-in owner may be here; everyone else goes to the login page.
  useEffect(() => {
    api<{ email: string }>("/auth/session")
      .then((s) => setEmail(s.email))
      .catch(() => navigate("/login", { replace: true }));
  }, [navigate]);

  if (email === null) return <section className={styles.wrap} />;

  return (
    <section className={styles.wrap}>
      <div className={styles.top}>
        <div className={styles.titleBlock}>
          <span className={styles.label}>Signed in as {email}</span>
          <h1 className={styles.title}>Edit your site</h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await api("/auth/logout", { method: "POST", body: {} });
            navigate("/");
          }}
        >
          Log out
        </Button>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "projects" && <AdminProjects projects={data?.projects ?? []} />}

      {tab === "profile" && data && (
        <AdminProfile key={data.profile.updatedAt} profile={data.profile} />
      )}

      {tab === "skills" && (
        <AdminCollection
          title="Skills & tools"
          singular="Skill"
          endpoint="skills"
          items={data?.skills ?? []}
          primaryKey="name"
          secondaryKey="category"
          fields={[
            { key: "name", label: "Skill or tool", placeholder: "Blender" },
            { key: "category", label: "Category", placeholder: "Craft, Tools, AI tools..." },
            { key: "sortOrder", label: "Order", kind: "number" },
          ]}
        />
      )}

      {tab === "experiments" && (
        <AdminCollection
          title="Experiments"
          singular="Experiment"
          endpoint="experiments"
          items={data?.experiments ?? []}
          primaryKey="title"
          secondaryKey="kind"
          fields={[
            { key: "title", label: "Title" },
            { key: "kind", label: "Type", placeholder: "Prompt, Visual, Code sketch..." },
            { key: "description", label: "Description or prompt", kind: "textarea" },
            { key: "linkUrl", label: "Link (optional)", placeholder: "https://..." },
            { key: "sortOrder", label: "Order", kind: "number" },
          ]}
        />
      )}

      {tab === "messages" && <AdminMessages />}
    </section>
  );
}
