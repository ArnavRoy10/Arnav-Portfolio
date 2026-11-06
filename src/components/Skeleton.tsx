import type { CSSProperties } from "react";

/** Placeholder block (kept so the pages work the same as in Floot). */
export const Skeleton = ({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => (
  <div
    className={className}
    style={{ background: "var(--muted)", borderRadius: "var(--radius)", ...style }}
  />
);
