import { useEffect, useRef } from "react";
import styles from "./WireframeObject.module.css";

type Vec3 = [number, number, number];
type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const PHI = (1 + Math.sqrt(5)) / 2;
const FOCAL = 3.4; // camera distance for the perspective projection
const EDGE_STEPS = 10; // each edge is subdivided so it can bow toward the cursor
const RING_N = 120;

const normalize = (v: Vec3, r: number): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [(v[0] / l) * r, (v[1] / l) * r, (v[2] / l) * r];
};

const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Outer icosahedron (radius 1)
const ICO_VERTS: Vec3[] = (
  [
    [-1, PHI, 0],
    [1, PHI, 0],
    [-1, -PHI, 0],
    [1, -PHI, 0],
    [0, -1, PHI],
    [0, 1, PHI],
    [0, -1, -PHI],
    [0, 1, -PHI],
    [PHI, 0, -1],
    [PHI, 0, 1],
    [-PHI, 0, -1],
    [-PHI, 0, 1],
  ] as Vec3[]
).map((v) => normalize(v, 1));

const ICO_EDGES: [number, number][] = (() => {
  let min = Infinity;
  for (let i = 0; i < ICO_VERTS.length; i++) {
    for (let j = i + 1; j < ICO_VERTS.length; j++) {
      min = Math.min(min, dist(ICO_VERTS[i], ICO_VERTS[j]));
    }
  }
  const edges: [number, number][] = [];
  for (let i = 0; i < ICO_VERTS.length; i++) {
    for (let j = i + 1; j < ICO_VERTS.length; j++) {
      if (dist(ICO_VERTS[i], ICO_VERTS[j]) < min * 1.01) edges.push([i, j]);
    }
  }
  return edges;
})();

// Inner octahedron
const OCT_VERTS: Vec3[] = (
  [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as Vec3[]
).map((v) => normalize(v, 0.56));

const OCT_EDGES: [number, number][] = (() => {
  const edges: [number, number][] = [];
  for (let i = 0; i < OCT_VERTS.length; i++) {
    for (let j = i + 1; j < OCT_VERTS.length; j++) {
      const a = OCT_VERTS[i];
      const b = OCT_VERTS[j];
      const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      if (Math.abs(dot) < 1e-6) edges.push([i, j]);
    }
  }
  return edges;
})();

// Thin orbit ring
const RING: Vec3[] = Array.from({ length: RING_N }, (_, i) => {
  const a = (i / RING_N) * Math.PI * 2;
  return [Math.cos(a) * 1.34, 0, Math.sin(a) * 1.34] as Vec3;
});

// Rotation M = Rz * Rx * Ry
const rotationMatrix = (ax: number, ay: number, az: number): Mat3 => {
  const cx = Math.cos(ax);
  const sx = Math.sin(ax);
  const cy = Math.cos(ay);
  const sy = Math.sin(ay);
  const cz = Math.cos(az);
  const sz = Math.sin(az);
  const a00 = cy;
  const a01 = 0;
  const a02 = sy;
  const a10 = sx * sy;
  const a11 = cx;
  const a12 = -sx * cy;
  const a20 = -cx * sy;
  const a21 = sx;
  const a22 = cx * cy;
  return [
    cz * a00 - sz * a10,
    cz * a01 - sz * a11,
    cz * a02 - sz * a12,
    sz * a00 + cz * a10,
    sz * a01 + cz * a11,
    sz * a02 + cz * a12,
    a20,
    a21,
    a22,
  ];
};

type Props = {
  className?: string;
  /** Vertical centre of the object as a fraction of the canvas height. */
  centerY?: number;
  /** Multiplies the object's size. */
  sizeFactor?: number;
};

/**
 * A floating abstract wireframe (icosahedron, octahedron and orbit ring)
 * drawn on a 2D canvas with a tiny custom 3D pipeline. The cursor acts as a
 * magnet: the object leans toward it, rotates gently, and every edge bows
 * toward the pointer.
 */
export const WireframeObject = ({
  className,
  centerY = 0.42,
  sizeFactor = 1,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const motion = reduce ? 0.2 : 1;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let size = 0;
    let raf = 0;
    let visible = true;
    const start = performance.now();
    let last = start;

    const ptr = { x: 0, y: 0, nx: 0, ny: 0, inside: false };
    const st = {
      active: 0,
      mx: 0,
      my: 0,
      rotX: 0,
      rotY: 0,
      offX: 0,
      offY: 0,
      boost: 0,
    };
    const view = { ocx: 0, ocy: 0, scale: 0, inv2: 0 };

    // Scratch buffers for one projected polyline.
    const bx = new Float64Array(RING_N + 2);
    const by = new Float64Array(RING_N + 2);
    const bz = new Float64Array(RING_N + 2);
    const bg = new Float64Array(RING_N + 2);

    const plot = (m: Mat3, x: number, y: number, z: number, i: number) => {
      const rx = m[0] * x + m[1] * y + m[2] * z;
      const ry = m[3] * x + m[4] * y + m[5] * z;
      const rz = m[6] * x + m[7] * y + m[8] * z;
      const s = FOCAL / (FOCAL - rz);
      let sx = view.ocx + rx * s * view.scale;
      let sy = view.ocy + ry * s * view.scale;
      let g = 0;
      if (st.active > 0.001) {
        // Magnet: pull the projected point toward the cursor.
        const dx = st.mx - sx;
        const dy = st.my - sy;
        const g0 = Math.exp(-(dx * dx + dy * dy) * view.inv2);
        sx += dx * g0 * 0.3 * st.active;
        sy += dy * g0 * 0.3 * st.active;
        g = g0 * st.active;
      }
      bx[i] = sx;
      by[i] = sy;
      bz[i] = rz;
      bg[i] = g;
    };

    const strokeRun = (
      count: number,
      baseA: number,
      depthA: number,
      glowA: number,
      intro: number,
    ) => {
      for (let k = 0; k < count - 1; k++) {
        let d = ((bz[k] + bz[k + 1]) * 0.5 + 1.4) / 2.8;
        d = d < 0 ? 0 : d > 1 ? 1 : d;
        const a =
          (baseA + depthA * d * d + glowA * (bg[k] + bg[k + 1]) * 0.5) * intro;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.beginPath();
        ctx.moveTo(bx[k], by[k]);
        ctx.lineTo(bx[k + 1], by[k + 1]);
        ctx.stroke();
      }
    };

    const drawEdges = (
      verts: Vec3[],
      edges: [number, number][],
      m: Mat3,
      baseA: number,
      depthA: number,
      glowA: number,
      intro: number,
    ) => {
      for (let e = 0; e < edges.length; e++) {
        const a = verts[edges[e][0]];
        const b = verts[edges[e][1]];
        for (let k = 0; k <= EDGE_STEPS; k++) {
          const t = k / EDGE_STEPS;
          plot(
            m,
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t,
            k,
          );
        }
        strokeRun(EDGE_STEPS + 1, baseA, depthA, glowA, intro);
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      cx = w * 0.5;
      cy = h * centerY;
      size = Math.min(w * 0.3, h * 0.26) * sizeFactor;
      if (st.mx === 0 && st.my === 0) {
        st.mx = cx;
        st.my = cy;
        ptr.x = cx;
        ptr.y = cy;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || w === 0) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      const ease = (rate: number) => 1 - Math.exp(-rate * dt);

      // --- Pointer / magnet state ---
      const wantActive = ptr.inside && !reduce ? 1 : 0;
      st.active += (wantActive - st.active) * ease(4);
      st.mx += (ptr.x - st.mx) * ease(16);
      st.my += (ptr.y - st.my) * ease(16);
      st.rotY += ((wantActive ? ptr.nx * 0.9 : 0) - st.rotY) * ease(2.5);
      st.rotX += ((wantActive ? ptr.ny * 0.6 : 0) - st.rotX) * ease(2.5);
      const maxOff = size * 0.3;
      const clamp = (v: number) => Math.max(-maxOff, Math.min(maxOff, v));
      st.offX += ((wantActive ? clamp((st.mx - cx) * 0.1) : 0) - st.offX) * ease(2.8);
      st.offY += ((wantActive ? clamp((st.my - cy) * 0.1) : 0) - st.offY) * ease(2.8);
      const pd = Math.hypot(st.mx - cx, st.my - cy);
      const tBoost = wantActive
        ? Math.exp(-(pd * pd) / (2 * size * size * 1.2))
        : 0;
      st.boost += (tBoost - st.boost) * ease(3);

      // --- Intro ---
      const introRaw = Math.max(0, Math.min(1, (now - start - 900) / 1800));
      const intro = 1 - Math.pow(1 - introRaw, 4);

      // --- View ---
      const bob = Math.sin(t * 0.9) * size * 0.035 * motion;
      view.ocx = cx + st.offX;
      view.ocy = cy + st.offY + bob;
      view.scale = size * (0.84 + 0.16 * intro) * (1 + 0.05 * st.boost);
      const sigma = size * 0.62;
      view.inv2 = 1 / (2 * sigma * sigma);

      const icoM = rotationMatrix(
        0.35 + t * 0.11 * motion + st.rotX,
        t * 0.2 * motion + st.rotY,
        0.18,
      );
      const octM = rotationMatrix(
        -t * 0.17 * motion + st.rotX * 1.3,
        -t * 0.26 * motion + st.rotY * 1.3,
        0.6,
      );
      const ringM = rotationMatrix(
        1.15 + Math.sin(t * 0.3) * 0.12 * motion + st.rotX * 0.5,
        -t * 0.1 * motion + st.rotY * 0.4,
        0.35,
      );

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.lineCap = "round";

      // Soft floor glow under the floating object.
      {
        const floorY = cy + size * 1.45;
        const r = size * 0.95 * (1 - bob / (size * 0.9));
        ctx.save();
        ctx.translate(cx + st.offX * 0.5, floorY);
        ctx.scale(1, 0.14);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, `rgba(140, 225, 255, ${(0.14 * intro).toFixed(3)})`);
        grad.addColorStop(1, "rgba(140, 225, 255, 0)");
        ctx.fillStyle = grad;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Inner octahedron (cyan)
      ctx.strokeStyle = "rgb(150, 228, 255)";
      drawEdges(OCT_VERTS, OCT_EDGES, octM, 0.2, 0.55, 0.5, intro);

      // Orbit ring
      ctx.strokeStyle = "#ffffff";
      for (let i = 0; i < RING_N; i++) {
        plot(ringM, RING[i][0], RING[i][1], RING[i][2], i);
      }
      plot(ringM, RING[0][0], RING[0][1], RING[0][2], RING_N);
      strokeRun(RING_N + 1, 0.05, 0.24, 0.5, intro);

      // Outer icosahedron
      drawEdges(ICO_VERTS, ICO_EDGES, icoM, 0.16, 0.72, 0.7, intro);

      // Vertex dots
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < ICO_VERTS.length; i++) {
        const v = ICO_VERTS[i];
        plot(icoM, v[0], v[1], v[2], 0);
        let d = (bz[0] + 1.4) / 2.8;
        d = d < 0 ? 0 : d > 1 ? 1 : d;
        const radius = 1.1 + 1.6 * d + bg[0] * 2.6;
        ctx.globalAlpha = Math.min(1, (0.3 + 0.7 * d + bg[0] * 0.4) * intro);
        ctx.beginPath();
        ctx.arc(bx[0], by[0], radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core
      ctx.globalAlpha = 0.9 * intro;
      ctx.beginPath();
      ctx.arc(view.ocx, view.ocy, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      ptr.x = x;
      ptr.y = y;
      ptr.inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      ptr.nx = Math.max(-1, Math.min(1, (x / Math.max(1, r.width)) * 2 - 1));
      ptr.ny = Math.max(-1, Math.min(1, (y / Math.max(1, r.height)) * 2 - 1));
    };
    const onLeave = () => {
      ptr.inside = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [centerY, sizeFactor]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${className ?? ""}`}
      aria-hidden="true"
    />
  );
};
