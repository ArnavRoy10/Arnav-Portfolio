import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GridOverlay } from "./GridOverlay";
import { TransitionLink } from "./TransitionLink";
import { Button } from "./Button";
import { siteContent } from "../helpers/siteContent";
import { useSiteData } from "../helpers/useSiteData";
import styles from "./SiteShell.module.css";

type Phase = "idle" | "cover" | "reveal";

const STRIPS = 6;
const COVER_MS = 820; // time the curtain needs to fully cover the screen
const REVEAL_MS = 900; // time the curtain needs to fully clear again

const labelFor = (pathname: string) => {
  if (pathname === "/") return "Home";
  const match = siteContent.nav.find((item) => item.to === pathname);
  return match ? match.label : pathname.replace("/", "");
};

/**
 * Shared frame for every page: interactive grid overlay, fixed header,
 * curtain page transitions and a slim footer.
 */
export const SiteShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: site } = useSiteData();
  const name = site?.profile?.name ?? "Arnav Roy";
  const craft = site?.profile?.craft ?? "";
  const [phase, setPhase] = useState<Phase>("cover");
  const [label, setLabel] = useState<string>("Portfolio");

  const pathRef = useRef(location.pathname);
  const busyRef = useRef(true);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  // Intro: the curtain starts closed and lifts after first paint.
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setPhase("idle");
      busyRef.current = false;
      return;
    }
    const a = window.setTimeout(() => setPhase("reveal"), 450);
    const b = window.setTimeout(() => {
      setPhase("idle");
      busyRef.current = false;
    }, 450 + REVEAL_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  // Route changes requested by TransitionLink.
  useEffect(() => {
    const onTransition = (event: Event) => {
      const detail = (
        event as CustomEvent<{ to?: string; label?: string } | undefined>
      ).detail;
      if (!detail || typeof detail.to !== "string") return;

      const url = new URL(detail.to, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const target = url.pathname + url.search + url.hash;

      if (busyRef.current) return;
      if (url.pathname === pathRef.current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) {
        navigate(target);
        window.scrollTo(0, 0);
        return;
      }

      busyRef.current = true;
      setLabel(detail.label ?? labelFor(url.pathname));
      setPhase("cover");

      const t1 = window.setTimeout(() => {
        navigate(target);
        window.scrollTo(0, 0);
        setPhase("reveal");
        const t2 = window.setTimeout(() => {
          setPhase("idle");
          busyRef.current = false;
        }, REVEAL_MS);
        timersRef.current.push(t2);
      }, COVER_MS);
      timersRef.current.push(t1);
    };

    window.addEventListener("site:page-transition", onTransition);
    return () => {
      window.removeEventListener("site:page-transition", onTransition);
    };
  }, [navigate]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <div className={styles.shell}>
      <GridOverlay />

      <header className={styles.header}>
        <TransitionLink
          to="/"
          label="Home"
          className={styles.brand}
          aria-label={`${name}, home`}
        >
          <span className={styles.brandMark} aria-hidden="true" />
          {name}
        </TransitionLink>

        <p className={styles.role}>{craft}</p>

        <nav className={styles.nav} aria-label="Primary">
          {siteContent.nav.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <TransitionLink
                key={item.to}
                to={item.to}
                label={item.label}
                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={styles.navIndex}>{item.index}</span>
                {item.label}
              </TransitionLink>
            );
          })}
        </nav>
      </header>

      <main key={location.pathname} className={styles.page}>
        {children}
      </main>

      <footer className={styles.footer}>
        <span>
          © {siteContent.year} {name}
        </span>
        {site?.lastUpdated && (
          <span className={styles.footerMid}>
            <span className={styles.updatedTitle}>Last updated</span>
            <span className={styles.updatedDate}>
              {new Date(site.lastUpdated).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={styles.toTop}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Back to top ↑
        </Button>
      </footer>

      <div className={styles.curtain} data-phase={phase} aria-hidden="true">
        {Array.from({ length: STRIPS }, (_, i) => (
          <span key={i} className={styles.strip} />
        ))}
        <span className={styles.curtainLabel}>→ {label}</span>
      </div>
    </div>
  );
};
