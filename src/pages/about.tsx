import { Skeleton } from "../components/Skeleton";
import { useSiteData } from "../helpers/useSiteData";
import { useScrollReveal } from "../helpers/useScrollReveal";
import styles from "./about.module.css";

export default function AboutPage() {
  const { data, isLoading } = useSiteData();
  const detailsRef = useScrollReveal();
  const skillsRef = useScrollReveal();

  const profile = data?.profile ?? null;
  const skills = data?.skills ?? [];

  const groups: { category: string; names: string[] }[] = [];
  for (const skill of skills) {
    const group = groups.find((g) => g.category === skill.category);
    if (group) group.names.push(skill.name);
    else groups.push({ category: skill.category, names: [skill.name] });
  }

  const links = profile
    ? [
        { label: "GitHub", href: profile.githubUrl },
        { label: "LinkedIn", href: profile.linkedinUrl },
        { label: "More", href: profile.otherUrl },
      ].filter((l) => l.href)
    : [];

  return (
    <>

      <section className={styles.intro}>
        <span className={styles.label}>(03) About</span>
        {isLoading || !profile ? (
          <Skeleton className={styles.loadingBlock} />
        ) : (
          <h1 className={styles.statement}>{profile.bio || profile.tagline}</h1>
        )}
      </section>

      {profile && (
        <section className={styles.details} ref={detailsRef}>
          <dl className={`${styles.facts} ${styles.reveal}`}>
            <div className={styles.fact}>
              <dt className={styles.label}>Name</dt>
              <dd className={styles.factValue}>{profile.name}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.label}>Core craft</dt>
              <dd className={styles.factValue}>{profile.craft}</dd>
            </div>
            {profile.availability && (
              <div className={styles.fact}>
                <dt className={styles.label}>Status</dt>
                <dd className={styles.factValue}>{profile.availability}</dd>
              </div>
            )}
          </dl>

          <div className={`${styles.copy} ${styles.reveal}`}>
            <span className={styles.label}>Elsewhere</span>
            {links.length > 0 ? (
              <ul className={styles.toolList}>
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      className={styles.extLink}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {l.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Links are added from the admin page.</p>
            )}
          </div>
        </section>
      )}

      {groups.length > 0 && (
        <section className={styles.block} ref={skillsRef}>
          <div className={`${styles.blockHead} ${styles.reveal}`}>
            <span className={styles.label}>Skills &amp; tools</span>
          </div>
          <div className={`${styles.toolkit} ${styles.reveal}`}>
            {groups.map((group) => (
              <div key={group.category} className={styles.toolGroup}>
                <span className={styles.label}>{group.category}</span>
                <ul className={styles.toolList}>
                  {group.names.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
