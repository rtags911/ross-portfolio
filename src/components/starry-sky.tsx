"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// A Starry Night–style sky: short brushstrokes that follow swirling currents, painted once onto a canvas.
// Positions are fractions of the viewport so the composition holds at any size.

type Vortex = { x: number; y: number; r: number; spin: number };
type HaloStar = { x: number; y: number; r: number };

const VORTICES: Vortex[] = [
  { x: 0.46, y: 0.34, r: 0.2, spin: 1.1 }, // the big central swirl
  { x: 0.64, y: 0.4, r: 0.15, spin: -0.9 }, // its counter-curl
  { x: 0.86, y: 0.16, r: 0.11, spin: 0.7 }, // around the moon
  { x: 0.18, y: 0.18, r: 0.09, spin: 0.6 },
  { x: 0.3, y: 0.7, r: 0.12, spin: -0.5 },
  { x: 0.78, y: 0.72, r: 0.13, spin: 0.6 },
];

const STARS: HaloStar[] = [
  { x: 0.08, y: 0.12, r: 0.022 },
  { x: 0.24, y: 0.07, r: 0.018 },
  { x: 0.31, y: 0.28, r: 0.016 },
  { x: 0.55, y: 0.1, r: 0.02 },
  { x: 0.7, y: 0.24, r: 0.017 },
  { x: 0.12, y: 0.42, r: 0.015 },
  { x: 0.92, y: 0.46, r: 0.018 },
  { x: 0.58, y: 0.62, r: 0.014 },
  { x: 0.08, y: 0.78, r: 0.016 },
  { x: 0.42, y: 0.88, r: 0.014 },
  { x: 0.9, y: 0.88, r: 0.017 },
];
const MOON = { x: 0.86, y: 0.16, r: 0.035 };

const BLUES = ["#16244a", "#1c2e5a", "#22396e", "#2c4a86", "#3a5e9e", "#4f78b8", "#6b93c9"];
const GOLDS = ["#e3a33a", "#f0c46b", "#f6dc8f", "#d98f2b"];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Direction of the "wind" at a point: a gentle rolling drift plus every vortex's spin. */
function flow(x: number, y: number, w: number, h: number) {
  const s = Math.min(w, h);
  let vx = 1;
  let vy = 0.35 * Math.sin((x / w) * Math.PI * 3 + (y / h) * 4);
  for (const v of VORTICES) {
    const dx = (x - v.x * w) / s;
    const dy = (y - v.y * h) / s;
    const d = Math.hypot(dx, dy) || 1e-6;
    const f = v.spin * 3.2 * Math.exp(-((d / v.r) ** 2));
    vx += (-dy / d) * f;
    vy += (dx / d) * f;
  }
  const m = Math.hypot(vx, vy) || 1;
  return [vx / m, vy / m] as const;
}

const LIGHTS = [...STARS, MOON];

/** Distance (in viewport-min units) to the nearest light, used to warm the strokes around stars. */
function nearLight(x: number, y: number, w: number, h: number) {
  const s = Math.min(w, h);
  let best = Infinity;
  for (const l of LIGHTS) {
    const d = Math.hypot(x - l.x * w, y - l.y * h) / s - l.r * 2.2;
    best = Math.min(best, d);
  }
  return best;
}

/**
 * Paints the sky in small time slices (about 6 ms each) so the browser keeps animating in between instead of
 * freezing while 10–16k strokes are drawn. Returns a function that stops an unfinished paint (on resize/unmount).
 */
function paint(canvas: HTMLCanvasElement): () => void {
  let cancelled = false;
  let timer = 0;
  // 1x resolution: the soft brushwork doesn't need extra sharpness, and it's up to 2.25x fewer pixels to draw.
  const dpr = 1;
  const w = window.innerWidth;
  const h = Math.max(window.innerHeight, screen.height * 0.9); // mobile URL bar: paint tall once
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  (canvas.parentElement as HTMLElement).style.height = `${h}px`; // glows share this box
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = mulberry32(1889);
  const s = Math.min(w, h);

  // Ground wash: deep night blue melting into the page colour at the bottom.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0e1a3c");
  g.addColorStop(0.55, "#0c1530");
  g.addColorStop(1, "#0d1014");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Brushstrokes along the currents, a slice at a time.
  ctx.lineCap = "round";
  const count = Math.min(16000, Math.round((w * h) / 110));
  let i = 0;
  const strokesSlice = () => {
    if (cancelled) return;
    const until = performance.now() + 6;
    for (; i < count && performance.now() < until; i++) stroke();
    if (i < count) timer = window.setTimeout(strokesSlice, 0);
    else finish();
  };

  const stroke = () => {
    let x = rnd() * w;
    let y = rnd() * h;
    const warm = nearLight(x, y, w, h);
    const gold = warm < 0.03 && rnd() < 0.7 - warm * 10;
    const pal = gold ? GOLDS : BLUES;
    // Lighter blues higher up and near the swirls, darker toward the ground.
    const lift = Math.max(0, 1 - y / h - 0.15) + (rnd() - 0.5) * 0.5;
    ctx.strokeStyle =
      pal[Math.min(pal.length - 1, Math.max(0, Math.floor((gold ? rnd() : lift) * pal.length)))];
    ctx.globalAlpha = gold ? 0.55 + rnd() * 0.35 : 0.28 + rnd() * 0.4;
    ctx.lineWidth = 1.4 + rnd() * 2.6; // a touch wider, so fewer strokes still cover the sky
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = gold ? 3 + Math.floor(rnd() * 4) : 5 + Math.floor(rnd() * 9);
    for (let k = 0; k < steps; k++) {
      const [dx, dy] = flow(x, y, w, h);
      x += dx * 2.2;
      y += dy * 2.2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // Stars, moon and veil go on top once all strokes are down.
  const finish = () => {
    // Halo stars: rings of short gold and pale-blue dashes around a bright core.
    const halo = (cx: number, cy: number, r: number, rings: number) => {
      for (let ring = rings; ring >= 1; ring--) {
        const rr = r * (0.6 + ring * 0.55);
        const dashes = Math.round(rr * 1.4);
        for (let d = 0; d < dashes; d++) {
          const a0 = (d / dashes) * Math.PI * 2 + rnd() * 0.2;
          ctx.strokeStyle = ring % 2 ? GOLDS[Math.floor(rnd() * 3)] : "#cfe0f2";
          ctx.globalAlpha = 0.25 + 0.5 / ring;
          ctx.lineWidth = 1.4 + rnd() * 1.6;
          ctx.beginPath();
          ctx.arc(cx, cy, rr + (rnd() - 0.5) * 2, a0, a0 + 0.12 + rnd() * 0.12);
          ctx.stroke();
        }
      }
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
      core.addColorStop(0, "#fff6d6");
      core.addColorStop(0.45, "#f6dc8f");
      core.addColorStop(1, "rgba(227,163,58,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const st of STARS) halo(st.x * w, st.y * h, st.r * s, 4);

    // Crescent moon: a halo, a gold disc, and a sky-coloured disc biting into it.
    const mx = MOON.x * w;
    const my = MOON.y * h;
    const mr = MOON.r * s;
    halo(mx, my, mr, 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f0c46b";
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#16244a";
    ctx.beginPath();
    ctx.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Keep text readable: a soft night veil, a little heavier on the left where the hero copy sits.
    ctx.globalAlpha = 1;
    const veil = ctx.createLinearGradient(0, 0, w, 0);
    veil.addColorStop(0, "rgba(13,16,20,0.62)");
    veil.addColorStop(0.5, "rgba(13,16,20,0.42)");
    veil.addColorStop(1, "rgba(13,16,20,0.3)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);
  };

  strokesSlice();
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

export default function StarrySky({ subtle = false }: { subtle?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let width = 0;
      let stopPaint = () => {};
      const draw = () => {
        if (window.innerWidth === width) return; // height-only changes (mobile URL bar) don't need a repaint
        width = window.innerWidth;
        stopPaint(); // a resize mid-paint starts over at the new size
        stopPaint = paint(canvas);
      };
      // Paint after first render so it never blocks the preloader.
      const first = window.setTimeout(draw, 0);
      let timer = 0;
      const onResize = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(draw, 200);
      };
      window.addEventListener("resize", onResize);

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Slow drift with scroll, transform only.
        gsap.to(canvas.parentElement, {
          y: -60,
          ease: "none",
          scrollTrigger: { trigger: document.documentElement, start: 0, end: "max", scrub: 1 },
        });
        const banner = document.querySelector<HTMLElement>("#banner");
        if (banner && !subtle) {
          gsap.to(wrapRef.current, {
            opacity: 0.55,
            ease: "none",
            scrollTrigger: { trigger: banner, start: "bottom 90%", end: "bottom 45%", scrub: 0.8 },
          });
        }
      }

      return () => {
        window.clearTimeout(first);
        stopPaint();
        window.clearTimeout(timer);
        window.removeEventListener("resize", onResize);
      };
    },
    { scope: wrapRef }
  );

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="starry-sky pointer-events-none fixed inset-0 -z-20 overflow-hidden"
      style={subtle ? { opacity: 0.45 } : undefined}
    >
      <div className="absolute inset-x-0 top-0 h-full">
        <canvas ref={canvasRef} className="block h-full w-full" />
        {STARS.map((st, i) => (
          <span
            key={i}
            className="star-glow"
            style={
              {
                left: `${st.x * 100}%`,
                top: `${st.y * 100}%`,
                "--r": `${st.r * 9}vmin`,
                animationDelay: `${(i * 0.73) % 5}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
