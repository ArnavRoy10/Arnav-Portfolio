import { useEffect, useRef, useState } from "react";
import { useSiteData } from "../helpers/useSiteData";
import styles from "./LoadingScreen.module.css";

const MIN_MS = 1500; // always show the screen at least this long
const MAX_MS = 7000; // never get stuck, even if the server is slow or down
const EXIT_MS = 900;

const statusFor = (p: number) =>
  p < 35 ? "Booting portfolio…" : p < 75 ? "Loading content…" : p < 99.5 ? "Rendering scene…" : "Ready";

/**
 * Full-screen intro: your name, a progress bar and a status line. The bar
 * tracks real loading (site data and your photo) and then the screen slides
 * away. Calls onReady the moment it starts leaving.
 */
export const LoadingScreen = ({ onReady }: { onReady: () => void }) => {
  const { data } = useSiteData();
  const name = (data?.profile?.name ?? "Arnav Roy").toUpperCase();
  const photoUrl = data?.profile?.photoUrl ?? "";

  const [photoReady, setPhotoReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);

  const readyRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  readyRef.current = Boolean(data) && photoReady;

  // Preload the photo so the scene looks right the moment the screen lifts.
  useEffect(() => {
    if (!data) return;
    if (!photoUrl) {
      setPhotoReady(true);
      return;
    }
    let cancelled = false;
    const done = () => {
      if (!cancelled) setPhotoReady(true);
    };
    const img = new Image();
    img.onload = done;
    img.onerror = done;
    img.src = photoUrl;
    return () => {
      cancelled = true;
    };
  }, [data, photoUrl]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const timers: number[] = [];
    let raf = 0;
    let shown = 0;
    let last = start;
    let finished = false;

    const tick = (now: number) => {
      const elapsed = now - start;
      const ready = readyRef.current || elapsed > MAX_MS;
      const target = ready ? 100 : 88;
      const cap = Math.min(100, (elapsed / (reduce ? 300 : MIN_MS)) * 100);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      shown += (target - shown) * (1 - Math.exp(-dt * 3.2));
      const value = Math.min(shown, cap);

      if (ready && value >= 99.4) {
        setProgress(100);
        if (!finished) {
          finished = true;
          timers.push(
            window.setTimeout(() => {
              setExiting(true);
              onReadyRef.current();
              timers.push(window.setTimeout(() => setGone(true), EXIT_MS));
            }, 280),
          );
        }
        return;
      }
      setProgress(value);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`${styles.root} ${exiting ? styles.exit : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.center}>
        <h1 className={styles.name}>
          {name}
          <span className={styles.dot}>.</span>
        </h1>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.fill} style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <p className={styles.meta}>
          <span>{statusFor(progress)}</span>
          <span>{String(Math.round(progress)).padStart(3, "0")}%</span>
        </p>
      </div>
    </div>
  );
};
