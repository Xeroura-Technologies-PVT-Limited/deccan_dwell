"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MotionValue } from "framer-motion";

type Place = {
  id: string;
  name: string;
  distance: string;
  image: string;
  x: number;
  y: number;
  webX?: number;
  webY?: number;
  rotate: number;
};

/**
 * One polaroid per landmark, kept off the centre so the hotel can sit there.
 * Distances are driving estimates from Deccan Dwell on Chamundi Hill Road,
 * JC Nagar (No. 24, Nazarbad).
 */
const PLACES: Place[] = [
  {
    id: "cathedral",
    name: "St. Philomena’s",
    distance: "7 km",
    image: "/images/places/cathedral.jpg",
    x: 18,
    y: 18,
    webX: 25,
    webY: 20,
    rotate: -7,
  },
  {
    id: "chamundi",
    name: "Chamundi Hills",
    distance: "8 km",
    image: "/images/places/chamundi.jpg",
    x: 82,
    y: 18,
    webX: 75,
    webY: 20,
    rotate: 6,
  },
  {
    id: "palace",
    name: "Mysore Palace",
    distance: "6 km",
    image: "/images/places/palace.jpg",
    x: 15,
    y: 52,
    webX: 12,
    webY: 50,
    rotate: -5,
  },
  {
    id: "zoo",
    name: "Mysore Zoo",
    distance: "4 km",
    image: "/images/places/zoo.jpg",
    x: 85,
    y: 52,
    webX: 88,
    webY: 50,
    rotate: 7,
  },
  {
    id: "jaganmohan",
    name: "Jaganmohan",
    distance: "7 km",
    image: "/images/places/jaganmohan.jpg",
    x: 17,
    y: 84,
    webX: 24,
    webY: 82,
    rotate: 4,
  },
  {
    id: "brindavan",
    name: "Brindavan Gardens",
    distance: "21 km",
    image: "/images/places/brindavan.jpg",
    x: 83,
    y: 84,
    webX: 76,
    webY: 82,
    rotate: -6,
  },
];

const HOTEL = {
  name: "Deccan Dwell",
  image: "/images/building-exterior-hd.jpg",
  x: 50,
  y: 50,
  rotate: -1.4,
};

const PLACE_GAP = 0.09;
const PLACE_IN = 0.12;
const FIRST_PLACE = 0.05;
const HOTEL_AT = FIRST_PLACE + PLACES.length * PLACE_GAP + 0.02;
const HOTEL_IN = 0.1;
const LINES_AT = HOTEL_AT + HOTEL_IN * 0.55;
const LINES_IN = 0.18;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function smooth(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

type Pt = { x: number; y: number };

function ellipseInset(from: Pt, to: Pt, halfW: number, halfH: number): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const r = (halfW * halfH) / Math.max(0.001, Math.hypot(halfH * ux, halfW * uy));
  return { x: from.x + ux * r, y: from.y + uy * r };
}

function roadCurve(from: Pt, to: Pt, sign: number): { d: string; c1: Pt; c2: Pt } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const bend = Math.min(160, len * 0.42) * sign;
  const c1 = {
    x: from.x + dx * 0.32 + nx * bend,
    y: from.y + dy * 0.32 + ny * bend,
  };
  const c2 = {
    x: from.x + dx * 0.68 - nx * bend * 0.7,
    y: from.y + dy * 0.68 - ny * bend * 0.7,
  };
  return {
    d: `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
    c1,
    c2,
  };
}

function cubicPoint(t: number, p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function placePos(place: Place, wide: boolean) {
  return {
    x: wide ? (place.webX ?? place.x) : place.x,
    y: wide ? (place.webY ?? place.y) : place.y,
  };
}

export function MysuruStory({ progress }: { progress: MotionValue<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const polaroidRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hotelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (p: number) => {
      const root = rootRef.current;
      const w = root?.clientWidth ?? 0;
      const h = root?.clientHeight ?? 0;
      const wide = w >= 768;
      const wash = washRef.current;
      if (wash) wash.style.opacity = String(0.32 * smooth(p / 0.1));

      const kicker = kickerRef.current;
      if (kicker) {
        const inT = smooth((p - 0.02) / 0.08);
        const outT = 1 - smooth((p - HOTEL_AT) / 0.08);
        kicker.style.opacity = String(inT * outT);
      }

      PLACES.forEach((place, i) => {
        const el = polaroidRefs.current[i];
        if (!el) return;
        const start = FIRST_PLACE + i * PLACE_GAP;
        const t = smooth((p - start) / PLACE_IN);
        el.style.opacity = String(t);
        el.style.transform = `translateY(${(1 - t) * 26}px) scale(${0.82 + 0.18 * t}) rotate(${place.rotate}deg)`;
        const pin = el.parentElement;
        if (pin) {
          const pos = placePos(place, wide);
          pin.style.left = `${pos.x}%`;
          pin.style.top = `${pos.y}%`;
        }
      });

      const hotel = hotelRef.current;
      if (hotel) {
        const t = smooth((p - HOTEL_AT) / HOTEL_IN);
        hotel.style.opacity = String(t);
        hotel.style.transform = `translateY(${(1 - t) * 22}px) scale(${0.82 + 0.18 * t}) rotate(${HOTEL.rotate}deg)`;
      }

      if (!root) return;

      const hotelCenter = { x: (HOTEL.x / 100) * w, y: (HOTEL.y / 100) * h };
      const placeHalf = wide ? { w: 108, h: 132 } : { w: 60, h: 74 };
      const hotelHalf = wide ? { w: 132, h: 152 } : { w: 72, h: 86 };
      const lineT = smooth((p - LINES_AT) / LINES_IN);

      root.querySelectorAll("[data-dd-road]").forEach((node, i) => {
        const place = PLACES[i];
        if (!place) return;
        const pos = placePos(place, wide);
        const origin = { x: (pos.x / 100) * w, y: (pos.y / 100) * h };
        const from = ellipseInset(origin, hotelCenter, placeHalf.w, placeHalf.h);
        const hotelPt = ellipseInset(hotelCenter, origin, hotelHalf.w, hotelHalf.h);
        const sign = i % 2 === 0 ? 1 : -1;
        const { d, c1, c2 } = roadCurve(from, hotelPt, sign);
        const group = node as SVGGElement;
        group.style.opacity = String(lineT);
        group.querySelectorAll("path").forEach((path) => {
          path.setAttribute("d", d);
        });
        group.querySelectorAll(".dd-road-bed, .dd-road-top").forEach((node) => {
          const path = node as SVGPathElement;
          if (lineT <= 0) return;
          const len = path.getTotalLength();
          path.style.strokeDasharray = `${len}`;
          path.style.strokeDashoffset = `${len * (1 - lineT)}`;
        });
        const dash = group.querySelector(".dd-road-dash") as SVGPathElement | null;
        if (dash) dash.style.opacity = String(smooth((lineT - 0.4) / 0.6));
        const label = root.querySelector(`[data-dd-km="${place.id}"]`) as HTMLElement | null;
        if (label) {
          const pt = cubicPoint(0.38, from, c1, c2, hotelPt);
          label.style.left = `${(pt.x / w) * 100}%`;
          label.style.top = `${(pt.y / h) * 100}%`;
          label.style.opacity = String(lineT);
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
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[2]">
      <div ref={washRef} className="absolute inset-0 bg-[#04110e]" style={{ opacity: 0 }} aria-hidden />

      <p
        ref={kickerRef}
        className="absolute left-1/2 top-[7%] z-[6] -translate-x-1/2 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.42em] text-[var(--dd-cream)]/80 md:text-[11px]"
        style={{ opacity: 0 }}
      >
        Around Mysuru
      </p>

      <svg className="absolute inset-0 z-[3] h-full w-full overflow-visible" aria-hidden>
        {PLACES.map((place) => (
          <g key={`${place.id}-road`} data-dd-road style={{ opacity: 0 }}>
            <path className="dd-road-bed" />
            <path className="dd-road-top" />
            <path className="dd-road-dash" />
          </g>
        ))}
      </svg>

      {PLACES.map((place, i) => (
        <PolaroidFrame
          key={place.id}
          place={place}
          nodeRef={(el) => {
            polaroidRefs.current[i] = el;
          }}
        />
      ))}

      {PLACES.map((place) => (
        <span
          key={`${place.id}-km`}
          data-dd-km={place.id}
          className="absolute z-[6] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--dd-gold)]/55 bg-[#04110e]/85 px-2.5 py-0.5 font-[family-name:var(--font-nav)] text-[8px] uppercase tracking-[0.18em] text-[var(--dd-gold)] md:text-[10px]"
          style={{
            left: `${place.x * 0.66 + HOTEL.x * 0.34}%`,
            top: `${place.y * 0.66 + HOTEL.y * 0.34}%`,
            opacity: 0,
          }}
        >
          {place.distance}
        </span>
      ))}

      <PolaroidFrame
        place={{
          id: "hotel",
          name: HOTEL.name,
          distance: "",
          image: HOTEL.image,
          x: HOTEL.x,
          y: HOTEL.y,
          rotate: HOTEL.rotate,
        }}
        nodeRef={hotelRef}
        hotel
      />
    </div>
  );
}

function PolaroidFrame({
  place,
  nodeRef,
  hotel = false,
}: {
  place: Place;
  nodeRef: RefObject<HTMLDivElement | null> | ((el: HTMLDivElement | null) => void);
  hotel?: boolean;
}) {
  return (
    <div
      className="absolute z-[5]"
      style={{
        left: `${place.x}%`,
        top: `${place.y}%`,
        translate: "-50% -50%",
      }}
    >
      <div
        ref={nodeRef}
        className={hotel ? "dd-polaroid dd-polaroid--hotel" : "dd-polaroid"}
        style={{ opacity: 0, transform: `rotate(${place.rotate}deg)` }}
      >
        <div className="dd-polaroid-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={place.image} alt={place.name} draggable={false} />
        </div>
        <p className="dd-polaroid-caption">{place.name}</p>
      </div>
    </div>
  );
}
