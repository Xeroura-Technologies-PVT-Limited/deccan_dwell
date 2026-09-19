"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { BEAT_TAIL, beatHold, beatUnit, smoothstep } from "@/lib/hero-beats";

type Slide = {
  id: string;
  image: string;
  caption: string;
  kicker: string;
  title: string;
  copy: string;
  rotate: number;
};

const SLIDES: Slide[] = [
  {
    id: "hotel",
    image: "/images/building-exterior-hd.jpg",
    caption: "Deccan Dwell",
    kicker: "Chamundi Hills",
    title: "Luxury, quietly kept",
    copy: "A private hotel at the foothills of Chamundi Hills — spacious, modern, and made to feel like home.",
    rotate: -2.4,
  },
  {
    id: "arrival",
    image: "/images/entrance-stairs-hd.jpg",
    caption: "The arrival",
    kicker: "Welcome",
    title: "The door opens to hush",
    copy: "Warm stone, garden light, and a welcome that never hurries you in.",
    rotate: 3.2,
  },
  {
    id: "deluxe",
    image: "/images/story/bedroom.jpg",
    caption: "Premium Deluxe",
    kicker: "Interiors",
    title: "Soft light. Generous rest.",
    copy: "Linen, garden views, and the small comforts that make a Mysuru evening linger.",
    rotate: -3.6,
  },
  {
    id: "suite",
    image: "/images/story/suite.jpg",
    caption: "3 BHK suites",
    kicker: "Suites",
    title: "Room to truly live",
    copy: "A sitting room of one’s own — for longer stays, slow breakfasts, and Chamundi on the horizon.",
    rotate: 2.1,
  },
];

const N = SLIDES.length;

export function HotelTell({ progress }: { progress: MotionValue<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const apply = (p: number) => {
      const root = rootRef.current;
      if (root) {
        const inT = smoothstep(p / 0.07);
        const outT = 1 - smoothstep((p - (1 - BEAT_TAIL)) / BEAT_TAIL);
        root.style.opacity = String(inT * outT);
        root.style.visibility = inT * outT < 0.01 ? "hidden" : "visible";
      }

      if (kickerRef.current) {
        kickerRef.current.style.opacity = String(
          smoothstep((p - 0.02) / 0.08) * (1 - smoothstep((p - 0.88) / 0.08)),
        );
      }

      SLIDES.forEach((slide, i) => {
        const u = beatUnit(p, i, N);
        const hold = beatHold(u);
        const arrive = u <= 0.5 ? 1 - hold : 0;
        const recede = u > 0.5 ? 1 - hold : 0;

        const rot = slide.rotate + arrive * 10 - recede * 12;
        const ty = arrive * 72 + recede * -28;
        const tx = arrive * 18 + recede * -42;
        const sc = 0.86 + 0.14 * hold;

        const card = cardRefs.current[i];
        if (card) {
          card.style.opacity = String(hold);
          card.style.zIndex = String(10 + i);
          card.style.transform = `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rot}deg)`;
        }

        const copy = copyRefs.current[i];
        if (copy) {
          copy.style.opacity = String(hold);
          copy.style.transform = `translateY(${arrive * 22 + recede * -18}px)`;
        }
      });

      if (countRef.current) {
        let idx = 1;
        let best = -1;
        for (let i = 0; i < N; i++) {
          const h = beatHold(beatUnit(p, i, N));
          if (h > best) {
            best = h;
            idx = i + 1;
          }
        }
        countRef.current.textContent = `${String(idx).padStart(2, "0")}  —  ${String(N).padStart(2, "0")}`;
        countRef.current.style.opacity = String(
          smoothstep((p - 0.04) / 0.08) * (1 - smoothstep((p - 0.9) / 0.08)),
        );
      }
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
    <div ref={rootRef} className="dd-tell pointer-events-none absolute inset-0 z-[1]" style={{ opacity: 0 }}>
      <div className="dd-tell-wash" aria-hidden />

      <p
        ref={kickerRef}
        className="absolute left-1/2 top-[6%] z-[4] -translate-x-1/2 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.42em] text-[var(--dd-cream)]/80 md:text-[11px]"
        style={{ opacity: 0 }}
      >
        The stay
      </p>

      <div className="dd-tell-layout">
        <div className="dd-tell-deck">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="dd-tell-polaroid"
              style={{ opacity: 0, transform: `rotate(${slide.rotate}deg)` }}
            >
              <div className="dd-polaroid-photo dd-tell-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.image} alt={slide.caption} draggable={false} />
              </div>
              <p className="dd-polaroid-caption">{slide.caption}</p>
            </div>
          ))}
        </div>

        <div className="dd-tell-copy">
          {SLIDES.map((slide, i) => (
            <div
              key={`${slide.id}-copy`}
              ref={(el) => {
                copyRefs.current[i] = el;
              }}
              className="dd-tell-copy-slide"
              style={{ opacity: 0 }}
            >
              <p className="dd-tell-kicker">{slide.kicker}</p>
              <h3 className="dd-tell-title">{slide.title}</h3>
              <p className="dd-tell-body">{slide.copy}</p>
            </div>
          ))}
        </div>
      </div>

      <p
        ref={countRef}
        className="absolute bottom-[7%] left-1/2 z-[4] -translate-x-1/2 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.32em] text-[var(--dd-gold)]/80 md:text-[10px]"
        style={{ opacity: 0 }}
      >
        01  —  04
      </p>
    </div>
  );
}
