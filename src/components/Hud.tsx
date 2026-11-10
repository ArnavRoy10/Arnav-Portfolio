import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { siteContent } from "../helpers/siteContent";
import styles from "./Hud.module.css";

const SCENES = [{ to: "/", label: "Home" }, ...siteContent.nav.map((n) => ({ to: n.to, label: n.label }))];

const pad = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, "0");

/** Slim live status bar at the bottom: scene, pointer position, frame rate and scroll progress. */
export const Hud = () => {
  const { pathname } = useLocation();
  const coordsRef = useRef<HTMLElement>(null);
  const fpsRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLElement>(null);

  const index = Math.max(0, SCENES.findIndex((s) => s.to === pathname));
  const scene = SCENES[index];

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (coordsRef.current) coordsRef.current.textContent = `X ${pad(e.clientX)} Y ${pad(e.clientY)}`;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round(Math.min(1, Math.max(0, window.scrollY / max)) * 100) : 0;
      if (scrollRef.current) scrollRef.current.textContent = `${pct}%`;
    };

    let raf = 0;
    let frames = 0;
    let since = performance.now();
    const loop = (now: number) => {
      frames += 1;
      if (now - since >= 500) {
        if (fpsRef.current) fpsRef.current.textContent = String(Math.round((frames * 1000) / (now - since)));
        frames = 0;
        since = now;
      }
      raf = requestAnimationFrame(loop);
    };

    onScroll();
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, [pathname]);

  return (
    <div className={styles.bar} aria-hidden="true">
      <span className={styles.group}>
        <i className={styles.dot} />
        Status <b>Online</b>
      </span>
      <span className={styles.sep} />
      <span className={styles.group}>
        Scene{" "}
        <b>
          {String(index + 1).padStart(2, "0")}/{String(SCENES.length).padStart(2, "0")}
        </b>{" "}
        {scene.label}
      </span>
      <span className={`${styles.group} ${styles.wide}`}>
        <span className={styles.sep} />
        Coords <b ref={coordsRef}>X 0000 Y 0000</b>
      </span>
      <span className={`${styles.group} ${styles.right}`}>
        <span className={styles.wide}>
          <b ref={fpsRef}>60</b> FPS
          <span className={styles.sep} />
        </span>
        Scroll <b ref={scrollRef}>0%</b>
      </span>
    </div>
  );
};
