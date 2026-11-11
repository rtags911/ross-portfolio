"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

// Set by TransitionLink when it covers the screen to change page; cleared once the new page has been revealed.
// The very first page load never sets it, so the intro (your name) is the first thing anyone sees.
export const pageTransition = { pending: false };
export function startPageTransition() {
  pageTransition.pending = true;
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!pageTransition.pending) return;
      // Cleared on complete, not up front: in dev React runs this twice, and the second run must still play.
      gsap
        .timeline({ onComplete: () => void (pageTransition.pending = false) })
        .set(".page-transition", { visibility: "visible" })
        .to(".page-transition--inner", { yPercent: 0, duration: 0.2 })
        .to(".page-transition--inner", { yPercent: -100, duration: 0.2 })
        .to(".page-transition", { yPercent: -100 })
        .set(".page-transition", { visibility: "hidden" });
    },
    { scope }
  );

  return (
    <div ref={scope}>
      {/* Hidden unless a page-to-page transition is in progress. */}
      <div className="page-transition invisible fixed inset-0 z-[9999999] overflow-hidden bg-black">
        <div className="page-transition--inner bg-primary-dark absolute inset-0 translate-y-full" />
      </div>
      {children}
    </div>
  );
}
