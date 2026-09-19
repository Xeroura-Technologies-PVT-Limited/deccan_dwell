"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { BEAT_TAIL, beatHold, beatUnit, smoothstep } from "@/lib/hero-beats";

type Beat = {
  kicker: string;
  title: string;
  copy: string;
};

const BEATS: Beat[] = [
  {
    kicker: "Mysuru",
    title: "You came for the city",
    copy: "Palaces, gardens, and Chamundi on the evening sky — a visit that asks to be unhurried.",
  },
  {
    kicker: "The days",
    title: "Heritage by daylight. Gold at dusk.",
    copy: "Walks through the palace, Brindavan’s lights, the slow road toward the hills.",
  },
  {
    kicker: "After",
    title: "Then, a home to return to",
    copy: "When the city is done with you for the day, Deccan Dwell is waiting at the foothills.",
  },
];

const N = BEATS.length;

export function MysuruVisit({ progress }: { progress: MotionValue<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLParagraphElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const apply = (p: number) => {
      const root = rootRef.current;
      if (root) {
        const inT = smoothstep(p / 0.08);
        const outT = 1 - smoothstep((p - (1 - BEAT_TAIL)) / BEAT_TAIL);
        const o = inT * outT;
        root.style.opacity = String(o);
        root.style.visibility = o < 0.01 ? "hidden" : "visible";
      }

      if (chapterRef.current) {
        chapterRef.current.style.opacity = String(
          smoothstep((p - 0.02) / 0.08) * (1 - smoothstep((p - 0.86) / 0.1)),
        );
      }

      BEATS.forEach((_, i) => {
        const slide = slideRefs.current[i];
        if (!slide) return;
        const u = beatUnit(p, i, N);
        const hold = beatHold(u);
        const arrive = u <= 0.5 ? 1 - hold : 0;
        const recede = u > 0.5 ? 1 - hold : 0;

        const kicker = slide.querySelector(".dd-visit-kicker") as HTMLElement | null;
        const title = slide.querySelector(".dd-visit-title") as HTMLElement | null;
        const body = slide.querySelector(".dd-visit-body") as HTMLElement | null;

        if (kicker) {
          kicker.style.opacity = String(hold);
          kicker.style.transform = `translateY(${arrive * 14 + recede * -16}px)`;
        }
        if (title) {
          title.style.opacity = String(hold);
          title.style.transform = `translateY(${arrive * 28 + recede * -22}px)`;
        }
        if (body) {
          body.style.opacity = String(hold);
          body.style.transform = `translateY(${arrive * 18 + recede * -14}px)`;
        }
      });
    };

    apply(progress.get());
    const unsubscribe = progress.on("change", apply);
    const onScroll = () => apply(progress.get());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      unsubscribe();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [progress]);

  return (
    <div ref={rootRef} className="dd-visit" style={{ opacity: 0, visibility: "hidden" }}>
      <div className="dd-visit-wash" aria-hidden />

      <p
        ref={chapterRef}
        className="absolute left-1/2 top-[6%] z-[4] -translate-x-1/2 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.42em] text-[var(--dd-cream)]/80 md:text-[11px]"
        style={{ opacity: 0 }}
      >
        The visit
      </p>

      <div className="dd-visit-stage">
        {BEATS.map((beat, i) => (
          <div
            key={beat.title}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="dd-visit-slide"
          >
            <p className="dd-visit-kicker">{beat.kicker}</p>
            <h2 className="dd-visit-title">{beat.title}</h2>
            <p className="dd-visit-body">{beat.copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
