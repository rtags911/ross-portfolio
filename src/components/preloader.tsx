"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { profile } from "@/src/content/profile";

gsap.registerPlugin(useGSAP);

// Intro, in four beats:
// 1. Your alias rises letter by letter.
// 2. A meteor shower starts: a few shooting stars, then more and more until they blanket the screen.
// 3. One big star cuts across the whole screen. Like a boat on water, it leaves a wake: the sky splits along
//    its trail and V-shaped ripple lines spread out behind its head.
// 4. The wake keeps opening until the night has parted completely onto the page underneath.
const METEORS = 110;
const ANGLE = 24; // fall angle of every meteor and the big star, in degrees below horizontal
// Each wake line: which side of the trail (+1 / -1), how many degrees outside the main V edge, how bright.
const WAKE_LINES = [
  { side: 1, extra: 0, opacity: 1 },
  { side: -1, extra: 0, opacity: 1 },
  { side: 1, extra: 5, opacity: 0.5 },
  { side: -1, extra: 5, opacity: 0.5 },
  { side: 1, extra: 11, opacity: 0.25 },
  { side: -1, extra: 11, opacity: 0.25 },
];

// Wake ripple shape: a gentle sine-like wave along the line (SVG units: 1600 long, 12 tall, centred on y = 6).
const WAVELENGTH = 60;
const WAVE_PATH = `M${-WAVELENGTH} 6 q${WAVELENGTH / 4} -6 ${WAVELENGTH / 2} 0` + ` t${WAVELENGTH / 2} 0`.repeat(60); // ends at 1770: still past 1600 after sliding one wavelength

export default function Preloader() {
  const preloaderRef = useRef<HTMLDivElement>(null);
  const letters = profile.alias.split("");

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      // 1. Name rises.
      tl.to(".name-text span", { y: 0, opacity: 1, stagger: 0.12, duration: 0.5 });

      if (reduce) {
        // No streaks or wake: hold the name, then fade to the page.
        tl.to(preloaderRef.current, { autoAlpha: 0, duration: 0.8, delay: 0.6 });
        return;
      }

      // 2. Meteor shower. Random sizes and lanes are set here, not in render, so server and browser HTML match.
      const meteors = gsap.utils.toArray<HTMLElement>(".meteor");
      meteors.forEach((m, i) => {
        const late = i / meteors.length; // later meteors are longer and thicker, so the shower brightens as it builds
        gsap.set(m, {
          y: `${gsap.utils.random(-55, 55)}vmax`, // which lane across the screen
          x: "-90vmax",
          width: gsap.utils.random(80, 220) * (0.7 + late),
          scaleY: gsap.utils.random(0.6, 1.1) + late * 1.2,
          opacity: 0,
        });
      });
      tl.addLabel("shower", "-=0.3");
      tl.to(
        meteors,
        {
          x: "90vmax",
          duration: () => gsap.utils.random(0.6, 1), // each streak's own speed
          ease: "none",
          keyframes: { opacity: [0, 1, 1, 0] },
          // "power2.out" packs the start times toward the end: a trickle that becomes a blanket.
          stagger: { amount: 2.3, ease: "power2.out" }, // keeps falling while the big star glides across
        },
        "shower"
      );

      // 3–4. The big star and its wake. One state object drives everything:
      //   x     = where the star's head is along its path, in vmax from the screen centre
      //   angle = half-opening of the wake's V, in degrees (0 = a thin cut along the trail, 92 = fully open)
      // The sky's CSS mask is a wedge with its tip at the head (see .preloader in globals.css), and the wake
      // lines are drawn along that wedge's edges, so the glowing lines always ride the edge of the opening.
      const sky = preloaderRef.current!.querySelector<HTMLElement>(".preloader")!;
      const lines = gsap.utils.toArray<HTMLElement>(".wake-line");
      const rad = (ANGLE * Math.PI) / 180;
      const wake = { x: -85, angle: 0 };
      const render = () => {
        const vmax = Math.max(window.innerWidth, window.innerHeight) / 100;
        const along = wake.x * vmax; // px along the path
        gsap.set(".wake-anchor", { x: along });
        sky.style.setProperty("--hx", `${window.innerWidth / 2 + along * Math.cos(rad)}px`);
        sky.style.setProperty("--hy", `${window.innerHeight / 2 + along * Math.sin(rad)}px`);
        sky.style.setProperty("--wake", `${wake.angle}deg`);
        sky.style.setProperty("--back", `${270 + ANGLE}deg`); // direction pointing back along the trail (CSS angles: 0 = up)
        WAKE_LINES.forEach((w, i) => gsap.set(lines[i], { rotation: w.side * (wake.angle + w.extra) }));
      };
      render();

      // Water ripples: each wake line's wave slides back along the line forever (one wavelength per loop, so
      // it's seamless), and the waves grow taller as the wake opens. Stopped once the intro has finished.
      const ripple = gsap.to(".wake-wave", { x: -WAVELENGTH, duration: 0.6, ease: "none", repeat: -1 });

      tl.addLabel("star", "shower+=1");
      tl.fromTo(".wake-anchor", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "none" }, "star");
      // Slow and steady, like a boat gliding. The head crosses the centre halfway through (1 s in).
      tl.to(wake, { x: 85, duration: 2, ease: "none", onUpdate: render }, "star");
      // The V starts as a thin cut and widens gradually behind the star, then opens fully after it has gone.
      tl.to(wake, { angle: 92, duration: 2.4, ease: "power2.in", onUpdate: render }, "star+=0.4");
      tl.fromTo(".wake-wave", { scaleY: 0.6 }, { scaleY: 2.2, duration: 2.4, ease: "power1.in" }, "star+=0.4");
      tl.to(".name-text", { opacity: 0, scale: 1.05, duration: 0.8, ease: "power2.out" }, "star+=0.85");
      tl.to(".wake-anchor", { opacity: 0, duration: 0.7, ease: "none" }, "star+=2.1");
      tl.set(preloaderRef.current, { autoAlpha: 0 }); // fully open: get out of the way of clicks
      tl.call(() => {
        ripple.kill();
      });
    },
    { scope: preloaderRef }
  );

  return (
    <div className="fixed inset-0 z-9999 overflow-hidden" ref={preloaderRef}>
      {/* The night sky. Its CSS mask has a wedge-shaped opening (the wake) that reveals the page underneath. */}
      <div className="preloader absolute inset-0">
        {/* Zero-size pivot at the centre, tilted so every meteor falls the same way (upper-left to lower-right). */}
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2" style={{ rotate: `${ANGLE}deg` }}>
          {Array.from({ length: METEORS }, (_, i) => (
            <span key={i} className="meteor" />
          ))}
        </div>

        <p className="name-text absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 overflow-hidden text-center text-[20vw] leading-none lg:text-[200px]">
          {letters.map((letter, index) => (
            <span key={index} className="inline-block translate-y-full opacity-0">
              {letter}
            </span>
          ))}
        </p>
      </div>

      {/* The big star and its wake lines sit outside the masked sky, so the opening never hides them.
          Same tilted pivot; the anchor is the star's head and moves along the path. */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2" style={{ rotate: `${ANGLE}deg` }}>
        <div className="wake-anchor">
          {WAKE_LINES.map((w, i) => (
            <span key={i} className="wake-line" style={{ opacity: w.opacity }}>
              {/* A wavy line, 1600 units long (stretched to the line's width), with one spare wave each side
                  so sliding it by a wavelength never shows a gap. */}
              <svg viewBox="0 0 1600 12" preserveAspectRatio="none">
                <path className="wake-wave" d={WAVE_PATH} />
              </svg>
            </span>
          ))}
          <span className="big-star" />
        </div>
      </div>
    </div>
  );
}
