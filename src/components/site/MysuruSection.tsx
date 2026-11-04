"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Reveal } from "./Reveal";

const PLACES = [
  {
    name: "Mysore Palace",
    distance: "6 km",
    note: "The Wodeyars’ seat, lit by thousands of bulbs on Sunday evenings.",
    image: "/images/places/palace.jpg",
    position: "50% 45%",
  },
  {
    name: "Chamundi Hills",
    distance: "8 km",
    note: "The Chamundeshwari temple, a thousand steps above the city.",
    image: "/images/places/chamundi.jpg",
    position: "50% 35%",
  },
  {
    name: "St. Philomena’s",
    distance: "7 km",
    note: "Neo-Gothic spires that rise over the north of the city.",
    image: "/images/places/cathedral.jpg",
    position: "50% 30%",
  },
  {
    name: "Jaganmohan Palace",
    distance: "7 km",
    note: "A royal residence turned gallery, with Raja Ravi Varma originals.",
    image: "/images/places/jaganmohan.jpg",
    position: "50% 50%",
  },
  {
    name: "Mysuru Zoo",
    distance: "4 km",
    note: "One of India’s oldest zoos, founded in 1892.",
    image: "/images/places/zoo.jpg",
    position: "50% 50%",
  },
  {
    name: "Brindavan Gardens",
    distance: "21 km",
    note: "Terraced gardens and evening fountains below the KRS dam.",
    image: "/images/places/brindavan.jpg",
    position: "50% 50%",
  },
];

/**
 * An index of the city — hover (or tap) a name and its picture takes the
 * frame. On phones it becomes a swipeable row of cards.
 */
export function MysuruSection() {
  const [active, setActive] = useState(0);
  const place = PLACES[active];

  return (
    <section id="mysuru" className="dd-night dd-section relative overflow-hidden">
      <div className="dd-container">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <Reveal>
              <p className="dd-eyebrow">The neighbourhood</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="dd-h2 mt-7">
                Mysuru, <em>at your door</em>.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="dd-lead mt-7 max-w-[30rem]">
                Palaces, temples and gardens — the best of the city is a short drive from Chamundi
                Hills Road.
              </p>
            </Reveal>

            {/* Desktop index */}
            <ol className="mt-14 hidden border-t border-[var(--dd-line-dark)] lg:block">
              {PLACES.map((p, i) => (
                <li key={p.name}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className="group grid w-full grid-cols-[3rem_1fr_auto] items-baseline border-b border-[var(--dd-line-dark)] py-5 text-left"
                  >
                    <span
                      className={`font-[family-name:var(--font-display)] text-lg italic transition-colors duration-500 ${
                        active === i ? "text-[var(--dd-gold)]" : "text-[var(--dd-cream)]/35"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`font-[family-name:var(--font-display)] text-[1.9rem] leading-tight transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        active === i
                          ? "translate-x-2 text-[var(--dd-cream)]"
                          : "text-[var(--dd-cream)]/45 group-hover:text-[var(--dd-cream)]/80"
                      }`}
                    >
                      {p.name}
                    </span>
                    <span
                      className={`font-[family-name:var(--font-nav)] text-[10.5px] uppercase tracking-[0.22em] transition-colors duration-500 ${
                        active === i ? "text-[var(--dd-gold)]" : "text-[var(--dd-cream)]/40"
                      }`}
                    >
                      {p.distance}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* Desktop picture */}
          <div className="hidden lg:col-span-5 lg:col-start-8 lg:block">
            <div className="sticky top-28">
              <Reveal>
                <div className="dd-arch relative aspect-[3/4] w-full bg-[var(--dd-night-2)]">
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={place.image}
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 1.08 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Image
                        src={place.image}
                        alt={place.name}
                        fill
                        sizes="40vw"
                        quality={90}
                        className="object-cover"
                        style={{ objectPosition: place.position }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </Reveal>
              {/* Fixed-height caption slot: captions cross-fade on top of each
                  other, so the picture above never moves when a longer or
                  shorter note comes in. */}
              <div className="relative mt-6 h-[4.5rem] max-w-[26rem]">
                <AnimatePresence initial={false}>
                  <motion.p
                    key={place.name}
                    className="dd-body absolute inset-x-0 top-0"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-[var(--dd-gold)]">{place.name}.</span> {place.note}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phones & tablets: swipeable cards */}
      <div className="dd-scroller mt-12 flex gap-4 overflow-x-auto px-[var(--dd-gutter)] pb-2 lg:hidden">
        {PLACES.map((p) => (
          <figure key={p.name} className="w-[72vw] max-w-[320px] shrink-0">
            <div className="dd-arch relative aspect-[3/4] w-full bg-[var(--dd-night-2)]">
              <Image
                src={p.image}
                alt={p.name}
                fill
                sizes="72vw"
                className="object-cover"
                style={{ objectPosition: p.position }}
              />
            </div>
            <figcaption className="mt-4">
              <span className="flex items-baseline justify-between gap-4">
                <span className="font-[family-name:var(--font-display)] text-2xl">{p.name}</span>
                <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-gold)]">
                  {p.distance}
                </span>
              </span>
              <span className="dd-body mt-2 block !text-[14px]">{p.note}</span>
            </figcaption>
          </figure>
        ))}
        <span className="w-px shrink-0" aria-hidden />
      </div>
    </section>
  );
}
