"use client";

import Image from "next/image";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

export type Place = { name: string; distance: string; note: string; image: string; position: string };

const SPRING = { type: "spring", stiffness: 210, damping: 30, mass: 0.9 } as const;
const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Phones & tablets: an endless coverflow. The current place sits centred and
 * full size; its neighbours peek in, smaller and dimmer. Swipe, tap a
 * neighbour or use the arrows. A gentle nudge the first time it comes into
 * view shows that it moves.
 */
export function PlacesCarousel({ places }: { places: Place[] }) {
  const n = places.length;
  const [index, setIndex] = useState(0);
  const [cardW, setCardW] = useState(280);
  const [touched, setTouched] = useState(false);
  const [hint, setHint] = useState(false);
  const drag = useMotionValue(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const touchedRef = useRef(false);
  const panBase = useRef(0);
  /** null until the gesture shows its direction; vertical swipes scroll the page instead. */
  const axis = useRef<"x" | "y" | null>(null);
  const still = useReducedMotion() ?? false;
  const step = cardW * 0.84;

  useEffect(() => {
    const measure = () => setCardW(Math.min(window.innerWidth * 0.66, 300));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /** Move by `by` cards: shift instantly, then let the track spring home. */
  const go = useCallback(
    (by: number) => {
      if (!by) {
        animate(drag, 0, SPRING);
        return;
      }
      setIndex((i) => i + by);
      drag.set(drag.get() + by * step);
      animate(drag, 0, still ? { duration: 0 } : SPRING);
    },
    [drag, step, still],
  );

  // First time it scrolls into view: a soft nudge left and back, twice.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || still) return;
    let done = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done) return;
        done = true;
        io.disconnect();
        setHint(true);
        window.setTimeout(async () => {
          if (touchedRef.current) return;
          for (let i = 0; i < 2; i++) {
            await animate(drag, -step * 0.22, { duration: 0.55, ease: [0.45, 0, 0.2, 1] });
            await animate(drag, 0, { type: "spring", stiffness: 180, damping: 18 });
          }
        }, 700);
        window.setTimeout(() => setHint(false), 5200);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [drag, step, still]);
  const markTouched = () => {
    touchedRef.current = true;
    if (!touched) setTouched(true);
    setHint(false);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Always exactly one place per swipe: far enough or fast enough moves on.
    const d = drag.get();
    const flick = Math.abs(info.velocity.x) > 350 ? -Math.sign(info.velocity.x) : 0;
    const by = Math.abs(d) > step * 0.18 ? -Math.sign(d) : flick;
    if (by) {
      setIndex((i) => i + by);
      drag.set(d + by * step);
    }
    animate(drag, 0, SPRING);
  };

  const active = places[mod(index, n)];
  const slots = [-2, -1, 0, 1, 2].map((o) => index + o);

  return (
    <div ref={rootRef} className="relative select-none" aria-roledescription="carousel" aria-label="Places near Deccan Dwell">
      <motion.div
        initial={still ? false : { opacity: 0, y: 40, scale: 0.94 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto cursor-grab touch-pan-y active:cursor-grabbing"
        style={{ height: (cardW * 4) / 3 + 20 }}
        onPanStart={(_, info) => {
          axis.current = Math.abs(info.offset.x) >= Math.abs(info.offset.y) ? "x" : "y";
          if (axis.current !== "x") return;
          markTouched();
          drag.stop();
          panBase.current = drag.get();
        }}
        onPan={(_, info) => {
          if (axis.current !== "x") return;
          // One card per swipe: the track follows the finger up to one card,
          // then resists like a rubber band.
          const raw = panBase.current + info.offset.x;
          const limit = step;
          const abs = Math.abs(raw);
          drag.set(abs <= limit ? raw : Math.sign(raw) * (limit + (abs - limit) * 0.12));
        }}
        onPanEnd={(e, info) => {
          if (axis.current === "x") onDragEnd(e, info);
          axis.current = null;
        }}
      >
        {slots.map((k) => (
          <Card key={k} place={places[mod(k, n)]} offset={k - index} drag={drag} step={step} width={cardW} onPick={() => { markTouched(); go(k - index); }} />
        ))}

        {/* Swipe hint chip */}
        <AnimatePresence>
          {hint && !touched && (
            <motion.div
              className="pointer-events-none absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[rgba(6,22,19,0.55)] px-4 py-2 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.28em] text-[var(--dd-cream)] backdrop-blur-sm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.6 }}
            >
              <motion.span animate={{ x: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} aria-hidden>
                ←
              </motion.span>
              Swipe
              <motion.span animate={{ x: [0, 6, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} aria-hidden>
                →
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Caption for the centred place only — keeps the screen calm. */}
      <div className="dd-container mt-7">
        <div className="mx-auto max-w-[24rem] text-center">
          <div className="relative h-[7.5rem]">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={active.name}
                className="absolute inset-x-0 top-0"
                initial="in"
                animate="show"
                exit="out"
                variants={{ in: {}, show: { transition: { staggerChildren: 0.07 } }, out: {} }}
                aria-live="polite"
              >
                {[
                  <p key="d" className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.26em] text-[var(--dd-gold)]">{active.distance} from Deccan Dwell</p>,
                  <p key="n" className="mt-2 font-[family-name:var(--font-display)] text-[1.9rem] leading-tight">{active.name}</p>,
                  <p key="t" className="dd-body mt-2 !text-[14px]">{active.note}</p>,
                ].map((el) => (
                  <motion.div
                    key={el.key}
                    variants={{
                      in: { opacity: 0, y: 12, filter: "blur(6px)" },
                      show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                      out: { opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.25 } },
                    }}
                  >
                    {el}
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pager */}
          <div className="mt-3 flex items-center justify-center gap-5">
            <button type="button" aria-label="Previous place" onClick={() => { markTouched(); go(-1); }} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--dd-cream)]/25 text-[var(--dd-cream)]/80 transition active:scale-95">
              ←
            </button>
            <div className="flex items-center gap-1.5" aria-hidden>
              {places.map((p, i) => (
                <span key={p.name} className={`h-[2px] rounded-full transition-all duration-500 ${i === mod(index, n) ? "w-6 bg-[var(--dd-gold)]" : "w-2.5 bg-[var(--dd-cream)]/25"}`} />
              ))}
            </div>
            <button type="button" aria-label="Next place" onClick={() => { markTouched(); go(1); }} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--dd-cream)]/25 text-[var(--dd-cream)]/80 transition active:scale-95">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ place, offset, drag, step, width, onPick }: { place: Place; offset: number; drag: MotionValue<number>; step: number; width: number; onPick: () => void }) {
  // Everything derives from the live position, so scale and light follow the finger.
  const x = useTransform(drag, (d) => offset * step + d);
  const dist = useTransform(x, (v) => Math.min(Math.abs(v) / step, 2));
  const scale = useTransform(dist, (d) => 1 - 0.14 * Math.min(d, 1) - 0.06 * Math.max(0, d - 1));
  const opacity = useTransform(dist, (d) => (d <= 1 ? 1 - 0.5 * d : Math.max(0, 0.5 - 0.5 * (d - 1))));
  const y = useTransform(dist, (d) => 18 * Math.min(d, 1));
  const shade = useTransform(dist, (d) => Math.min(d, 1) * 0.45);
  const z = useTransform(dist, (d) => Math.round(10 - d * 4));
  // The photo drifts against the card's travel — a window onto a deeper scene.
  const imgX = useTransform(x, (v) => -v * 0.16);
  const ring = useTransform(dist, (d) => Math.max(0, 1 - d * 1.6));

  return (
    <motion.figure
      className="absolute left-1/2 top-[10px] m-0"
      style={{ x, y, scale, opacity, zIndex: z, width, marginLeft: -width / 2 }}
      onTap={offset !== 0 ? onPick : undefined}
    >
      <div className="dd-arch relative aspect-[3/4] w-full bg-[var(--dd-night-2)] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
        <motion.div className="absolute inset-y-0 -left-[14%] -right-[14%]" style={{ x: imgX }}>
          <Image src={place.image} alt={place.name} fill sizes="380px" draggable={false} className="pointer-events-none object-cover" style={{ objectPosition: place.position }} />
        </motion.div>
        <motion.div className="pointer-events-none absolute inset-0 bg-[#06161399]" style={{ opacity: shade }} />
      </div>
      {/* Gold hairline that settles around the centred arch */}
      <motion.div className="dd-arch pointer-events-none absolute -inset-[7px] border border-[var(--dd-gold)]/45" style={{ opacity: ring }} />
    </motion.figure>
  );
}
