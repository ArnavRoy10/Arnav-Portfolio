import { useEffect, useRef } from "react";
import styles from "./GridOverlay.module.css";

const CELL = 64; // grid cell size in px
const STEP = 16; // sampling step along each line (smooth bending)
const SIGMA = 150; // radius of the cursor's gravity well
const PULSE_MS = 1500;
const PULSE_REACH = 900;
const LINE = "rgba(255, 255, 255, 0.055)";
const GLOW = "rgb(120, 225, 255)";

type Pulse = { x: number; y: number; t0: number };

/**
 * Fixed, full-screen coordinate grid. Lines bend toward the cursor like a
 * gravity well, intersections light up near it, and clicks send a ripple.
 */
export const GridOverlay = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let dirty = true;
    let last = performance.now();

    const m = { x: 0, y: 0, tx: 0, ty: 0, active: 0, target: 0 };
    const pulses: Pulse[] = [];
    const out = { x: 0, y: 0, g: 0 };
    const glowSegs: number[] = [];
    const hotNodes: number[] = [];
    const inv2 = 1 / (2 * SIGMA * SIGMA);
    const pull = reduce ? 0 : 0.3;

    const warp = (x: number, y: number, now: number) => {
      let ox = x;
      let oy = y;
      let g = 0;
      if (m.active > 0.002) {
        const dx = x - m.x;
        const dy = y - m.y;
        const k = Math.exp(-(dx * dx + dy * dy) * inv2) * m.active;
        ox -= dx * k * pull;
        oy -= dy * k * pull;
        g = k;
      }
      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];
        const age = (now - p.t0) / PULSE_MS;
        if (age >= 1) continue;
        const dx = x - p.x;
        const dy = y - p.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        const d = r - age * PULSE_REACH;
        const band = Math.exp(-(d * d) / 5000) * (1 - age);
        if (band > 0.002) {
          if (r > 0.5) {
            ox += (dx / r) * band * 12;
            oy += (dy / r) * band * 12;
          }
          if (band * 0.9 > g) g = band * 0.9;
        }
      }
      out.x = ox;
      out.y = oy;
      out.g = g;
    };

    const pad = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, "0");

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      for (let i = pulses.length - 1; i >= 0; i--) {
        if (now - pulses[i].t0 > PULSE_MS) pulses.splice(i, 1);
      }

      const offX = (w % CELL) / 2;
      const offY = (h % CELL) / 2;
      glowSegs.length = 0;
      hotNodes.length = 0;

      // Grid lines: one batched path, collecting the segments that glow.
      ctx.lineWidth = 1;
      ctx.strokeStyle = LINE;
      ctx.beginPath();

      for (let x = offX; x <= w + 0.5; x += CELL) {
        let px = 0;
        let py = 0;
        let pg = 0;
        for (let y = 0; y <= h + STEP; y += STEP) {
          warp(x, y, now);
          if (y === 0) {
            ctx.moveTo(out.x, out.y);
          } else {
            ctx.lineTo(out.x, out.y);
            const g = (out.g + pg) * 0.5;
            if (g > 0.05) glowSegs.push(px, py, out.x, out.y, g);
          }
          px = out.x;
          py = out.y;
          pg = out.g;
        }
      }

      for (let y = offY; y <= h + 0.5; y += CELL) {
        let px = 0;
        let py = 0;
        let pg = 0;
        for (let x = 0; x <= w + STEP; x += STEP) {
          warp(x, y, now);
          if (x === 0) {
            ctx.moveTo(out.x, out.y);
          } else {
            ctx.lineTo(out.x, out.y);
            const g = (out.g + pg) * 0.5;
            if (g > 0.05) glowSegs.push(px, py, out.x, out.y, g);
          }
          px = out.x;
          py = out.y;
          pg = out.g;
        }
      }
      ctx.stroke();

      // Glowing segments near the cursor / ripple.
      if (glowSegs.length) {
        ctx.strokeStyle = GLOW;
        for (let i = 0; i < glowSegs.length; i += 5) {
          ctx.globalAlpha = Math.min(0.7, glowSegs[i + 4] * 0.85);
          ctx.beginPath();
          ctx.moveTo(glowSegs[i], glowSegs[i + 1]);
          ctx.lineTo(glowSegs[i + 2], glowSegs[i + 3]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Intersection marks (small crosses).
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.beginPath();
      for (let x = offX; x <= w + 0.5; x += CELL) {
        for (let y = offY; y <= h + 0.5; y += CELL) {
          warp(x, y, now);
          if (out.g > 0.05) {
            hotNodes.push(out.x, out.y, out.g);
          } else {
            ctx.rect(out.x - 0.5, out.y - 3, 1, 6);
            ctx.rect(out.x - 3, out.y - 0.5, 6, 1);
          }
        }
      }
      ctx.fill();

      if (hotNodes.length) {
        ctx.fillStyle = GLOW;
        for (let i = 0; i < hotNodes.length; i += 3) {
          const x = hotNodes[i];
          const y = hotNodes[i + 1];
          const g = hotNodes[i + 2];
          const arm = 3 + g * 5;
          ctx.globalAlpha = Math.min(1, 0.3 + g * 0.9);
          ctx.fillRect(x - 0.5, y - arm, 1, arm * 2);
          ctx.fillRect(x - arm, y - 0.5, arm * 2, 1);
        }
        ctx.globalAlpha = 1;
      }

      // Cursor ticks + coordinate readout.
      if (m.active > 0.05) {
        ctx.strokeStyle = GLOW;
        ctx.globalAlpha = 0.8 * m.active;
        ctx.beginPath();
        ctx.moveTo(m.x - 12, m.y);
        ctx.lineTo(m.x - 5, m.y);
        ctx.moveTo(m.x + 5, m.y);
        ctx.lineTo(m.x + 12, m.y);
        ctx.moveTo(m.x, m.y - 12);
        ctx.lineTo(m.x, m.y - 5);
        ctx.moveTo(m.x, m.y + 5);
        ctx.lineTo(m.x, m.y + 12);
        ctx.stroke();

        ctx.globalAlpha = 0.6 * m.active;
        ctx.fillStyle = "#ffffff";
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`X ${pad(m.tx)}  Y ${pad(m.ty)}`, m.x + 18, m.y + 30);
        ctx.globalAlpha = 1;
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      dirty = true;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || w === 0) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const wasActive = m.active > 0.003;
      const follow = 1 - Math.exp(-dt * 14);
      const fade = 1 - Math.exp(-dt * 5);
      m.x += (m.tx - m.x) * follow;
      m.y += (m.ty - m.y) * follow;
      m.active += (m.target - m.active) * fade;
      const isActive = m.active > 0.003 || m.target > 0;
      if (!isActive) m.active = 0;

      if (dirty || isActive || wasActive || pulses.length > 0) {
        draw(now);
        dirty = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (m.target === 0) {
        m.x = e.clientX;
        m.y = e.clientY;
      }
      m.tx = e.clientX;
      m.ty = e.clientY;
      m.target = 1;
    };

    const onDown = (e: PointerEvent) => {
      onMove(e);
      if (reduce) return;
      pulses.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
      if (pulses.length > 4) pulses.shift();
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") m.target = 0;
    };

    const onLeave = () => {
      m.target = 0;
    };

    resize();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${className ?? ""}`}
      aria-hidden="true"
    />
  );
};
