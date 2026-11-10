import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSiteData } from "../helpers/useSiteData";
import styles from "./ScenePhoto.module.css";

const SCENES: Record<string, string> = {
  "/": "home",
  "/work": "work",
  "/lab": "lab",
  "/about": "about",
  "/contact": "contact",
};

/**
 * Your photo as a fixed, full-height figure. Each page ("scene") gives it a
 * different size, position and strength, which animate when you change page.
 * Scrolling adds a slow drift, zoom and fade on top.
 */
export const ScenePhoto = () => {
  const { data } = useSiteData();
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const photoUrl = data?.profile?.photoUrl ?? "";
  const scene = SCENES[pathname] ?? "home";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = 0;
    let current = 0;
    let raf = 0;

    const readTarget = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    // Ease toward the real scroll position so the motion feels smooth.
    const tick = () => {
      current += (target - current) * (reduce ? 1 : 0.08);
      if (Math.abs(target - current) < 0.0004) current = target;
      el.style.setProperty("--p", current.toFixed(4));
      raf = current === target ? 0 : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      readTarget();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    readTarget();
    current = target;
    el.style.setProperty("--p", current.toFixed(4));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The page grows when content loads, which changes the scroll range.
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [photoUrl, pathname]);

  if (!photoUrl) return null;

  return (
    <div className={styles.root} data-scene={scene} aria-hidden="true">
      <div ref={scrollRef} className={styles.scroll}>
        <img className={styles.img} src={photoUrl} alt="" />
      </div>
      <div className={styles.fade} />
    </div>
  );
};
