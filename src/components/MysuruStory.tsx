"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";

type Place = {
  id: string;
  name: string;
  distance: string;
  image: string;
  tilt: number;
  /** Radians from +x, counterclockwise, y-up. */
  angle: number;
  /** Multiplier on the ellipse radii. */
  radius: number;
  /** Settled scale — lower slots read closer. */
  depth: number;
};

const HOTEL = {
  id: "hotel",
  name: "Deccan Dwell",
  distance: "Home",
  image: "/images/building-exterior-hd.jpg",
  tilt: -1,
};

/** Designed ellipse around the hotel — not a scatter, not a globe. */
const PLACES: Place[] = [
  {
    id: "palace",
    name: "Mysore Palace",
    distance: "6 km",
    image: "/images/places/palace.jpg",
    tilt: -5,
    angle: 2.28,
    radius: 1.02,
    depth: 0.48,
  },
  {
    id: "cathedral",
    name: "St. Philomena’s",
    distance: "7 km",
    image: "/images/places/cathedral.jpg",
    tilt: 6,
    angle: 0.76,
    radius: 1.0,
    depth: 0.48,
  },
  {
    id: "zoo",
    name: "Mysore Zoo",
    distance: "4 km",
    image: "/images/places/zoo.jpg",
    tilt: -4,
    angle: 3.18,
    radius: 1.08,
    depth: 0.52,
  },
  {
    id: "jaganmohan",
    name: "Jaganmohan",
    distance: "7 km",
    image: "/images/places/jaganmohan.jpg",
    tilt: 5,
    angle: 0.1,
    radius: 1.06,
    depth: 0.52,
  },
  {
    id: "chamundi",
    name: "Chamundi Hills",
    distance: "8 km",
    image: "/images/places/chamundi.jpg",
    tilt: -7,
    angle: 4.08,
    radius: 0.98,
    depth: 0.56,
  },
  {
    id: "brindavan",
    name: "Brindavan Gardens",
    distance: "21 km",
    image: "/images/places/brindavan.jpg",
    tilt: 4,
    angle: 5.36,
    radius: 1.0,
    depth: 0.56,
  },
];

const N = PLACES.length;
const HEAD = 0.05;
const TAIL = 0.12;
const USABLE = 1 - HEAD - TAIL;
const HOLD = 0.55;
const UP = Math.PI / 2;
const SWEEP = (58 * Math.PI) / 180;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function smooth(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function shortestDelta(from: number, to: number) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function beatAt(p: number) {
  const t = (p - HEAD) / USABLE;
  if (t <= 0) return { t: 0, i: 0, u: 0 };
  if (t >= 1) return { t: 1, i: N - 1, u: 1 };
  const x = t * N;
  const i = Math.min(N - 1, Math.floor(x));
  return { t, i, u: x - i };
}

export function MysuruStory({ progress }: { progress: MotionValue<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const hotelRef = useRef<HTMLDivElement>(null);
  const polaroidRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let width = 0;
    let height = 0;
    let p = progress.get();
    let raf = 0;

    const resize = () => {
      width = root.clientWidth;
      height = root.clientHeight;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);

    const draw = (time: number) => {
      const show = smooth(p / 0.07);
      root.style.opacity = String(show);
      root.style.visibility = show < 0.01 ? "hidden" : "visible";
      if (kickerRef.current) {
        kickerRef.current.style.opacity = String(smooth((p - 0.02) / 0.08) * 0.85);
      }
      if (show < 0.01) return;

      const { t, i: beat, u } = beatAt(p);
      const wide = width >= 768;
      const cx = width / 2;
      const cy = height * 0.5;
      const hotelX = cx;
      const hotelY = height * 0.53;
      const span = Math.min(width, height);
      const rx = Math.min(width * 0.4, span * 0.33);
      const ry = Math.min(height * 0.3, span * 0.255);
      const featuredScale = wide ? 1.06 : 0.98;
      const hotelBase = (wide ? 0.62 : 0.57) * (1 + 0.12 * smooth((p - (1 - TAIL)) / TAIL));
      const settled = t >= 1;
      const holding = t > 0 && t < 1 && u < HOLD;
      const dim = holding ? 0.5 : t > 0 && t < 1 ? 0.5 + 0.5 * smooth((u - HOLD) / 0.4) : 1;
      const idle = settled && !holding ? 1 : 0;

      const slotOf = (place: Place) => {
        const x = hotelX + Math.cos(place.angle) * rx * place.radius;
        const y = hotelY - Math.sin(place.angle) * ry * place.radius;
        return { x, y, scale: place.depth * (wide ? 1 : 0.92) };
      };

      const hotelEl = hotelRef.current;
      if (hotelEl) {
        const hx = hotelX + Math.sin(time * 0.00045) * 1.6 * idle;
        const hy = hotelY + Math.cos(time * 0.0004) * 1.2 * idle;
        hotelEl.style.opacity = String(smooth((p - 0.02) / 0.08) * dim);
        hotelEl.style.zIndex = holding ? "6" : "10";
        hotelEl.style.transform = `translate(${hx}px, ${hy}px) translate(-50%, -50%) scale(${hotelBase}) rotate(${HOTEL.tilt}deg)`;
      }

      PLACES.forEach((place, index) => {
        const el = polaroidRefs.current[index];
        if (!el) return;
        const slot = slotOf(place);
        const local = t * N - index;
        const parked = t >= 1 || local >= 1;
        let opacity = 0;
        let x = slot.x;
        let y = slot.y;
        let sc = slot.scale;
        let rot = place.tilt;
        let z = 8 + Math.round((slot.y / height) * 8);

        if (t <= 0 || local < -0.02) {
          opacity = 0;
        } else if (!parked && local < HOLD) {
          const enter = smooth(local / 0.2);
          opacity = enter;
          x = cx;
          y = cy + (1 - enter) * 48;
          sc = featuredScale * (0.82 + 0.18 * enter);
          rot = place.tilt * (1 - enter * 0.9);
          z = 24;
        } else if (!parked) {
          const dock = smooth((local - HOLD) / 0.42);
          const toSlot = shortestDelta(UP, place.angle);
          const dir = Math.sign(toSlot) || 1;
          const startAngle = place.angle - dir * SWEEP;
          const ang = startAngle + shortestDelta(startAngle, place.angle) * dock;
          const arcX = hotelX + Math.cos(ang) * rx * place.radius * dock;
          const arcY = hotelY - Math.sin(ang) * ry * place.radius * dock;
          const stay = (1 - dock) * (1 - dock);
          x = cx * stay + arcX * (1 - stay);
          y = cy * stay + arcY * (1 - stay);
          sc = featuredScale + (slot.scale - featuredScale) * dock;
          rot = place.tilt * (0.12 + 0.88 * dock);
          opacity = 1;
          z = 16 + Math.round((1 - dock) * 8);
        } else {
          opacity = dim;
          x = slot.x + Math.sin(time * 0.0007 + index * 1.3) * 3 * idle;
          y = slot.y + Math.cos(time * 0.00055 + index * 0.9) * 2.2 * idle;
          z = 8 + Math.round((slot.y / height) * 8);
        }

        el.style.opacity = String(opacity);
        el.style.zIndex = String(z);
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${sc}) rotate(${rot}deg)`;
      });

      if (captionRef.current) {
        const featured = holding ? PLACES[beat] : null;
        const hold = featured ? smooth(u / 0.16) * (1 - smooth((u - 0.44) / 0.12)) : 0;
        captionRef.current.textContent = featured
          ? `${featured.name}  ·  ${featured.distance}`
          : "";
        captionRef.current.style.opacity = String(hold * show);
      }
    };

    const tick = (time: number) => {
      draw(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const unsub = progress.on("change", (v) => {
      p = v;
    });

    return () => {
      cancelAnimationFrame(raf);
      unsub();
      observer.disconnect();
    };
  }, [progress]);

  return (
    <div ref={rootRef} className="dd-places" style={{ opacity: 0, visibility: "hidden" }}>
      <div className="dd-places-wash" aria-hidden />

      <p
        ref={kickerRef}
        className="absolute left-1/2 top-[7%] z-[6] -translate-x-1/2 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.42em] text-[var(--dd-cream)]/80 md:text-[11px]"
        style={{ opacity: 0 }}
      >
        Around Mysuru
      </p>

      <div
        ref={hotelRef}
        className="dd-polaroid dd-polaroid--hotel dd-places-polaroid"
        style={{ opacity: 0 }}
      >
        <div className="dd-polaroid-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HOTEL.image} alt={HOTEL.name} draggable={false} />
        </div>
        <p className="dd-polaroid-caption">{HOTEL.name}</p>
      </div>

      {PLACES.map((place, i) => (
        <div
          key={place.id}
          ref={(el) => {
            polaroidRefs.current[i] = el;
          }}
          className="dd-polaroid dd-places-polaroid"
          style={{ opacity: 0 }}
        >
          <div className="dd-polaroid-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.image} alt={place.name} draggable={false} />
          </div>
          <p className="dd-polaroid-caption">{place.name}</p>
        </div>
      ))}

      <p ref={captionRef} className="dd-places-caption" style={{ opacity: 0 }} />
    </div>
  );
}
