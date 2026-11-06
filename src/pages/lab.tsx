import { Skeleton } from "../components/Skeleton";
import { useSiteData } from "../helpers/useSiteData";
import { useScrollReveal } from "../helpers/useScrollReveal";
import styles from "./lab.module.css";

export default function LabPage() {
  const { data, isLoading } = useSiteData();
  const gridRef = useScrollReveal();
  const experiments = data?.experiments ?? [];

  return (
    <>

      <section className={styles.intro}>
        <span className={styles.label}>(02) Lab</span>
        <h1 className={styles.headline}>
          Vibe coding <em>experiments</em>
        </h1>
        <p className={styles.lede}>
          Rapid code sketches, prompts and visual experiments from the corner of
          the workshop.
        </p>
      </section>

      {isLoading && (
        <div className={styles.grid}>
          <Skeleton className={styles.loadingBlock} />
        </div>
      )}

      {!isLoading && experiments.length === 0 && (
        <p className={styles.empty}>
          Nothing here yet. Add experiments from the admin page.
        </p>
      )}

      <div className={styles.grid} ref={gridRef}>
        {experiments.map((item) => (
          <article key={item.id} className={`${styles.card} ${styles.reveal}`}>
            <span className={styles.kind}>{item.kind}</span>
            <h2 className={styles.title}>{item.title}</h2>
            {item.description && <p className={styles.desc}>{item.description}</p>}
            {item.linkUrl && (
              <a
                className={styles.link}
                href={item.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open ↗
              </a>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
