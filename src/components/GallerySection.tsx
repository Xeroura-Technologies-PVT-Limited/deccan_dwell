"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Reveal, RevealImage } from "@/components/site/Reveal";
import { getLenis } from "@/lib/smooth-scroll";

type Shot = {
  src: string;
  alt: string;
  caption: string;
  position: string;
  frame: string;
  span: string;
  zoom?: { scale: number; origin: string };
};

/** Only photographs of the house itself and its surroundings. */
const SHOTS: Shot[] = [
  {
    src: "/images/story/bedroom.jpg",
    alt: "A Deccan Dwell room with warm wood panelling and a garden window",
    caption: "A room, after dark",
    position: "55% 50%",
    frame: "aspect-[16/11]",
    span: "md:col-span-8",
  },
  {
    src: "/images/entrance-stairs-hd.jpg",
    alt: "The front steps and potted plants at the Deccan Dwell entrance",
    caption: "The front steps",
    position: "50% 50%",
    zoom: { scale: 1.75, origin: "50% 96%" },
    frame: "aspect-[4/5]",
    span: "md:col-span-4 md:self-end",
  },
  {
    src: "/images/building-exterior-hd.jpg",
    alt: "The Deccan Dwell building on Chamundi Hills Road",
    caption: "The house on Chamundi Hills Road",
    position: "40% 50%",
    zoom: { scale: 1.45, origin: "40% 22%" },
    frame: "aspect-[4/5]",
    span: "md:col-span-4",
  },
  {
    src: "/images/story/suite.jpg",
    alt: "A Deccan Dwell suite with a tufted sofa and green curtains",
    caption: "A suite, set for a long stay",
    position: "50% 55%",
    frame: "aspect-[16/11]",
    span: "md:col-span-8 md:self-start",
  },
];

export function GallerySection() {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const lenis = getLenis();
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % SHOTS.length));
      if (e.key === "ArrowLeft")
        setOpen((i) => (i === null ? i : (i - 1 + SHOTS.length) % SHOTS.length));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [open]);

  return (
    <section id="gallery" className="dd-paper-2 dd-grain dd-section relative overflow-hidden">
      <div className="dd-container">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="dd-eyebrow">Gallery</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="dd-h2 mt-7">
                Frames from <em>the house</em>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="dd-body max-w-[22rem] md:text-right">
              Tap any frame to see it larger.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 md:mt-20 md:grid-cols-12 md:gap-6">
          {SHOTS.map((s, i) => (
            <figure key={s.src} className={s.span}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                data-cursor="Open"
                className="group block w-full cursor-zoom-in text-left"
                aria-label={`Open: ${s.caption}`}
              >
                <RevealImage
                  src={s.src}
                  alt={s.alt}
                  sizes={s.span.includes("12") ? "92vw" : s.span.includes("8") ? "(max-width: 768px) 92vw, 62vw" : "(max-width: 768px) 92vw, 32vw"}
                  className={`${s.frame} w-full`}
                  objectPosition={s.position}
                  zoom={s.zoom}
                  imgClassName="transition-transform duration-[1.6s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                  parallax={s.span.includes("12") ? 10 : 5}
                  delay={(i % 2) * 0.1}
                />
                <figcaption className="mt-4 flex items-baseline justify-between gap-4">
                  <span className="font-[family-name:var(--font-display)] text-lg italic text-[var(--dd-text-ink)]/80">
                    {s.caption}
                  </span>
                  <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-gold-ink)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </figcaption>
              </button>
            </figure>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 z-[70] flex flex-col bg-[rgba(6,20,17,0.96)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setOpen(null)}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={SHOTS[open].caption}
          >
            <div className="flex items-center justify-between px-[var(--dd-gutter)] py-6">
              <p className="font-[family-name:var(--font-nav)] text-[10.5px] uppercase tracking-[0.28em] text-[var(--dd-cream)]/60">
                {String(open + 1).padStart(2, "0")} / {String(SHOTS.length).padStart(2, "0")}
              </p>
              <button
                type="button"
                className="dd-link text-[var(--dd-cream)]"
                onClick={() => setOpen(null)}
              >
                Close
              </button>
            </div>
            <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={open}
                  className="absolute inset-x-[var(--dd-gutter)] inset-y-0"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src={SHOTS[open].src}
                    alt={SHOTS[open].alt}
                    fill
                    sizes="100vw"
                    quality={90}
                    className="object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <div
              className="flex items-center justify-between gap-6 px-[var(--dd-gutter)] py-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="dd-link text-[var(--dd-cream)]"
                onClick={() => setOpen((open - 1 + SHOTS.length) % SHOTS.length)}
              >
                ← Prev
              </button>
              <p className="text-center font-[family-name:var(--font-display)] text-xl italic text-[var(--dd-cream)]">
                {SHOTS[open].caption}
              </p>
              <button
                type="button"
                className="dd-link text-[var(--dd-cream)]"
                onClick={() => setOpen((open + 1) % SHOTS.length)}
              >
                Next →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
