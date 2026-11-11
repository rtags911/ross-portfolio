"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useRef } from "react";

import { profile } from "@/src/content/profile";
import { getAge } from "@/src/lib/utils";

import ShinyText from "./shiny-text";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function AboutMe() {
  const container = useRef<HTMLDivElement>(null);
  const age = profile.birthDate ? getAge(profile.birthDate) : null;

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          id: "about-me-in",
          trigger: container.current,
          start: "top 70%",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });

      tl.from(".slide-up-and-fade", {
        y: 150,
        opacity: 0,
        stagger: 0.05,
      });
    },
    { scope: container }
  );

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          id: "about-me-out",
          trigger: container.current,
          start: "bottom 50%",
          end: "bottom 10%",
          scrub: 0.5,
        },
      });

      tl.to(".slide-up-and-fade", {
        y: -150,
        opacity: 0,
        stagger: 0.02,
      });
    },
    { scope: container }
  );

  return (
    <section className="pb-section" id="about-me">
      <div className="container" ref={container}>
        <h2 className="slide-up-and-fade mb-20 text-4xl md:text-6xl">
          <ShinyText
            className="cursor"
            text={profile.aboutStatement}
          />
        </h2>

        <p className="slide-up-and-fade border-b pb-3 text-gray-400">This is me.</p>

        <div className="mt-9 grid items-start gap-8 md:grid-cols-12">
          <div className="cursor space-y-4 md:col-span-5">
            <h2 className="slide-up-and-fade text-4xl leading-tight font-semibold sm:text-5xl">
              I&apos;m {profile.firstName}.
            </h2>
            <p className="slide-up-and-fade max-w-md text-lg text-white/75">
              {profile.aboutLead}
            </p>
          </div>

          <div className="cursor md:col-span-7">
            <div className="max-w-[500px] space-y-3 text-base text-white/80 sm:text-lg">
              {age !== null && (
                <p className="slide-up-and-fade">
                  {age} years old, based in {profile.location}.
                </p>
              )}
              {profile.aboutBody.map((p) => (
                <p className="slide-up-and-fade" key={p}>
                  {p}
                </p>
              ))}
            </div>
          </div>

          <div className="cursor slide-up-and-fade col-span-full mt-8 text-center md:mt-10">
            <p className="text-primary text-xl uppercase lg:text-4xl">
              {profile.aboutTagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
