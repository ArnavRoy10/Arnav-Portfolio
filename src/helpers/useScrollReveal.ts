import { useCallback, useRef } from "react";

/**
 * Callback ref: when the element scrolls into view, it and everything inside
 * it get data-revealed="true" (the page CSS fades them in).
 */
export function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  return useCallback((el: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;

    const reveal = () => {
      el.setAttribute("data-revealed", "true");
      el.querySelectorAll("*").forEach((child) =>
        child.setAttribute("data-revealed", "true"),
      );
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      reveal();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    observerRef.current = io;
  }, []);
}
