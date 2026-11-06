import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { TransitionLink } from "../components/TransitionLink";
import { WireframeObject } from "../components/WireframeObject";
import { useSiteData } from "../helpers/useSiteData";
import { useScrollReveal } from "../helpers/useScrollReveal";
import styles from "./Home.module.css";

export default function HomePage() {
  const { data } = useSiteData();
  const workRef = useScrollReveal();
  const skillsRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  const profile = data?.profile ?? null;
  const projects = data?.projects ?? [];
  const skills = data?.skills ?? [];

  // Group skills by category, keeping the admin's ordering.
  const groups: { category: string; names: string[] }[] = [];
  for (const skill of skills) {
    const group = groups.find((g) => g.category === skill.category);
    if (group) group.names.push(skill.name);
    else groups.push({ category: skill.category, names: [skill.name] });
  }

  return (
    <>

      {/* ---------- Hero ---------- */}
      <section className={styles.hero}>
        <WireframeObject className={styles.heroCanvas} centerY={0.4} />

        <div className={styles.heroTop}>
          {profile?.availability ? (
            <span className={styles.status}>
              <i className={styles.dot} aria-hidden="true" />
              {profile.availability}
            </span>
          ) : (
            <span />
          )}
          <span className={styles.label}>Portfolio</span>
        </div>

        <div className={styles.heroBottom}>
          <div>
            {profile ? (
              <>
                <p className={styles.eyebrow}>{profile.name}</p>
                <h1 className={styles.headline}>{profile.tagline}</h1>
              </>
            ) : (
              <Skeleton className={styles.headlineSkeleton} />
            )}
          </div>
          <div className={styles.heroSide}>
            {profile && (
              <div className={styles.craftBlock}>
                <span className={styles.label}>Core craft</span>
                <p className={styles.craft}>{profile.craft}</p>
              </div>
            )}
            <div className={styles.actions}>
              <Button asChild size="lg" shape="pill">
                <TransitionLink to="/work" label="Work">
                  View selected work
                </TransitionLink>
              </Button>
              <Button asChild size="lg" shape="pill" variant="outline">
                <TransitionLink to="/contact" label="Contact">
                  Get in touch
                </TransitionLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Selected work ---------- */}
      {projects.length > 0 && (
        <section className={styles.section} ref={workRef}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <span className={styles.label}>(01) Selected work</span>
            <span className={styles.label}>{projects.length} projects</span>
          </div>

          <ul className={styles.workList}>
            {projects.map((project, i) => (
              <li key={project.id} className={`${styles.workItem} ${styles.reveal}`}>
                <TransitionLink
                  to="/work"
                  label="Work"
                  className={styles.workRow}
                >
                  <span className={styles.workIndex}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.workTitle}>{project.title}</span>
                  <span className={styles.workCategory}>{project.tools}</span>
                </TransitionLink>
              </li>
            ))}
          </ul>

          <div className={`${styles.moreRow} ${styles.reveal}`}>
            <TransitionLink to="/work" label="Work" className={styles.textLink}>
              All projects →
            </TransitionLink>
          </div>
        </section>
      )}

      {/* ---------- Skills & tools ---------- */}
      {groups.length > 0 && (
        <section className={styles.section} ref={skillsRef}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <span className={styles.label}>(02) Skills &amp; tools</span>
            <span className={styles.label}>What I work with</span>
          </div>

          <div className={styles.capabilities}>
            {groups.map((group) => (
              <article
                key={group.category}
                className={`${styles.capability} ${styles.reveal}`}
              >
                <h2 className={styles.capTitle}>{group.category}</h2>
                <ul className={styles.tags}>
                  {group.names.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Call to action ---------- */}
      <section className={`${styles.section} ${styles.cta}`} ref={ctaRef}>
        <div className={`${styles.sectionHead} ${styles.reveal}`}>
          <span className={styles.label}>(03) Contact</span>
          <span className={styles.label}>{profile?.availability ?? ""}</span>
        </div>

        <h2 className={`${styles.ctaHeadline} ${styles.reveal}`}>
          Got a problem <em>worth solving</em>?
        </h2>

        <div className={`${styles.ctaRow} ${styles.reveal}`}>
          {profile?.contactEmail ? (
            <a className={styles.mail} href={`mailto:${profile.contactEmail}`}>
              {profile.contactEmail}
            </a>
          ) : (
            <span />
          )}
          <Button asChild size="lg" shape="pill">
            <TransitionLink to="/contact" label="Contact">
              Start a conversation
            </TransitionLink>
          </Button>
        </div>
      </section>
    </>
  );
}
