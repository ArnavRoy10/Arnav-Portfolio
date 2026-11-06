import styles from "./ProjectGlyph.module.css";

/** Small abstract wireframe glyphs used as project thumbnails. */
export const ProjectGlyph = ({
  variant,
  className,
}: {
  variant: number;
  className?: string;
}) => {
  const v = ((variant % 4) + 4) % 4;
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${styles.glyph} ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
    >
      {v === 0 && (
        <>
          <polygon points="60,12 101.6,36 101.6,84 60,108 18.4,84 18.4,36" />
          <polyline points="18.4,36 60,60 101.6,36" />
          <line x1="60" y1="60" x2="60" y2="108" />
        </>
      )}
      {v === 1 &&
        [84, 64, 44, 24].map((s, i) => (
          <rect
            key={s}
            x={60 - s / 2}
            y={60 - s / 2}
            width={s}
            height={s}
            transform={`rotate(${i * 12} 60 60)`}
          />
        ))}
      {v === 2 && (
        <>
          <polygon points="60,10 110,100 10,100" />
          <polygon points="35,55 85,55 60,100" />
          <polygon points="60,55 72.5,77.5 47.5,77.5" />
        </>
      )}
      {v === 3 && (
        <>
          <circle cx="60" cy="60" r="8" />
          <ellipse cx="60" cy="60" rx="50" ry="18" />
          <ellipse cx="60" cy="60" rx="50" ry="18" transform="rotate(60 60 60)" />
          <ellipse cx="60" cy="60" rx="50" ry="18" transform="rotate(120 60 60)" />
        </>
      )}
    </svg>
  );
};
