import { Button } from "../components/Button";
import { ProjectGlyph } from "../components/ProjectGlyph";
import { Skeleton } from "../components/Skeleton";
import { useSiteData } from "../helpers/useSiteData";
import { useScrollReveal } from "../helpers/useScrollReveal";
import styles from "./work.module.css";

export default function WorkPage() {
  const { data, isLoading } = useSiteData();
  const listRef = useScrollReveal();
  const projects = data?.projects ?? [];

  return (
    <>

      <section className={styles.intro}>
        <span className={styles.label}>(01) Work</span>
        <h1 className={styles.headline}>
          Selected <em>work</em>
        </h1>
        <p className={styles.lede}>
          Things I've built. Open a live demo or read the code.
        </p>
      </section>

      {isLoading && (
        <div className={styles.list}>
          <Skeleton className={styles.loadingBlock} />
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <p className={styles.empty}>No projects yet. Add some from the admin page.</p>
      )}

      <ol className={styles.list} ref={listRef}>
        {projects.map((project, i) => (
          <li key={project.id} className={`${styles.project} ${styles.reveal}`}>
            <div className={styles.meta}>
              <span className={styles.index}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            <div className={styles.body}>
              <h2 className={styles.title}>{project.title}</h2>
              {project.featured && <span className={styles.badge}>Signature</span>}

              {project.details && <p className={styles.desc}>{project.details}</p>}

              {project.tools && (
                <ul className={styles.tags}>
                  {project.tools
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tool) => (
                      <li key={tool}>{tool}</li>
                    ))}
                </ul>
              )}

              {(project.demoUrl || project.repoUrl) && (
                <div className={styles.links}>
                  {project.demoUrl && (
                    <Button asChild shape="pill" size="md">
                      <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                        Live demo ↗
                      </a>
                    </Button>
                  )}
                  {project.repoUrl && (
                    <Button asChild shape="pill" size="md" variant="outline">
                      <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                        Code ↗
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className={styles.side}>
              <div className={styles.thumb}>
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={`${project.title} thumbnail`}
                    className={styles.thumbImage}
                    loading="lazy"
                  />
                ) : (
                  <ProjectGlyph variant={i} className={styles.glyph} />
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
