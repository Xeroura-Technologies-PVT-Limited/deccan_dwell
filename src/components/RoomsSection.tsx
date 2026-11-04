"use client";

import { readJson } from "@/lib/http";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { AvailabilityResult, RoomType } from "@/lib/types";
import { ROOM_TYPES } from "@/lib/inventory-client";
import { CHECK_IN_TIME, CHECK_OUT_TIME, EXTRA_BED_INR } from "@/lib/hotel";
import { Reveal, RevealImage } from "@/components/site/Reveal";

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultOut() {
  return format(addDays(new Date(), 2), "yyyy-MM-dd");
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

type Collection = {
  kind: RoomType["kind"];
  eyebrow: string;
  title: ReactNode;
  body: string;
  details: string[];
  image: string;
  imageAlt: string;
  objectPosition: string;
};

const COLLECTIONS: Collection[] = [
  {
    kind: "room",
    eyebrow: "For two",
    title: (
      <>
        The <em>Rooms</em>
      </>
    ),
    body: "Calm, modern rooms with warm wood, soft light and an ensuite bath. Each sleeps two, with an extra bed for a third guest.",
    details: ["Ensuite bath", "Air-conditioned", "Wi-Fi", `Extra bed ${inr(EXTRA_BED_INR)} / night`],
    image: "/images/story/bedroom.jpg",
    imageAlt: "A Deccan Dwell room with a wooden bed, teal cushions and a garden window",
    objectPosition: "60% 50%",
  },
  {
    kind: "suite",
    eyebrow: "For families & longer stays",
    title: (
      <>
        The <em>Suites</em>
      </>
    ),
    body: "Three bedrooms and a dining area on a single floor — space for the whole family to spread out, and to stay a while.",
    details: ["Three bedrooms", "Dining area", "Sleeps six", "Air-conditioned", "Wi-Fi"],
    image: "/images/story/suite.jpg",
    imageAlt: "A Deccan Dwell suite with a tufted sofa, lamplight and tall green curtains",
    objectPosition: "50% 55%",
  },
];

export function RoomsSection() {
  const [checkIn, setCheckIn] = useState(todayISO);
  const [checkOut, setCheckOut] = useState(defaultOut);
  const [availability, setAvailability] = useState<AvailabilityResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`);
        const data = res.ok ? await readJson(res) : null;
        if (!cancelled) setAvailability(data?.availability ?? null);
      } catch {
        if (!cancelled) setAvailability(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut]);

  const byId = useMemo(() => {
    const map = new Map<string, AvailabilityResult>();
    availability?.forEach((a) => map.set(a.roomTypeId, a));
    return map;
  }, [availability]);

  const nights = Math.max(1, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)));

  return (
    <section id="rooms" className="dd-night dd-section relative overflow-hidden">
      <div className="dd-container">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <Reveal>
              <p className="dd-eyebrow">Stay</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="dd-h2 mt-7">
                Rooms &amp; <em>Suites</em>
              </h2>
            </Reveal>
          </div>
          <Reveal className="md:col-span-5" delay={0.1}>
            <p className="dd-lead max-w-[30rem]">
              Two ways to stay — a room for two, or a three-bedroom suite for the family. Choose
              your dates to see what&rsquo;s open.
            </p>
          </Reveal>
        </div>

        {/* Date bar */}
        <Reveal delay={0.12}>
          <div className="mt-14 grid grid-cols-2 border-y border-[var(--dd-line-dark)] md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="dd-field border-r border-[var(--dd-line-dark)] py-5 pr-6">
              <span className="dd-field-label">Arrive · {CHECK_IN_TIME}</span>
              <input
                type="date"
                value={checkIn}
                min={todayISO()}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  setCheckIn(v);
                  if (v >= checkOut) setCheckOut(format(addDays(parseISO(v), 1), "yyyy-MM-dd"));
                }}
                className="dd-input !border-0 !pb-0 font-[family-name:var(--font-display)] !text-[1.45rem]"
              />
            </label>
            <label className="dd-field py-5 pl-6 md:border-r md:border-[var(--dd-line-dark)] md:pr-6">
              <span className="dd-field-label">Depart · {CHECK_OUT_TIME}</span>
              <input
                type="date"
                value={checkOut}
                min={format(addDays(parseISO(checkIn), 1), "yyyy-MM-dd")}
                onChange={(e) => e.target.value && setCheckOut(e.target.value)}
                className="dd-input !border-0 !pb-0 font-[family-name:var(--font-display)] !text-[1.45rem]"
              />
            </label>
            <div className="col-span-2 flex items-center border-t border-[var(--dd-line-dark)] py-5 md:col-span-1 md:border-t-0 md:pl-6">
              <p className="dd-meta !text-[10.5px] text-[var(--dd-cream)]/70">
                {nights} night{nights === 1 ? "" : "s"}
                <span className="mx-3 text-[var(--dd-gold)]">·</span>
                {loading ? "Checking…" : availability ? "Live availability" : "Rates per night"}
              </p>
            </div>
            <div className="col-span-2 flex items-center pb-5 md:col-span-1 md:py-5 md:pl-6">
              <a href="#book" className="dd-btn dd-btn--sm w-full md:w-auto">
                Reserve
              </a>
            </div>
          </div>
        </Reveal>

        <div className="mt-[clamp(80px,10vw,150px)] space-y-[clamp(96px,12vw,180px)]">
          {COLLECTIONS.map((c, i) => (
            <CollectionBlock
              key={c.kind}
              collection={c}
              flip={i % 2 === 1}
              rooms={ROOM_TYPES.filter((r) => r.kind === c.kind)}
              byId={byId}
              loading={loading}
              checkIn={checkIn}
              checkOut={checkOut}
              nights={nights}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CollectionBlock({
  collection,
  flip,
  rooms,
  byId,
  loading,
  checkIn,
  checkOut,
  nights,
}: {
  collection: Collection;
  flip: boolean;
  rooms: RoomType[];
  byId: Map<string, AvailabilityResult>;
  loading: boolean;
  checkIn: string;
  checkOut: string;
  nights: number;
}) {
  const from = Math.min(...rooms.map((r) => r.basePriceInr));
  return (
    <article className="grid gap-12 md:grid-cols-12 md:gap-10">
      <div className={`md:col-span-6 ${flip ? "md:order-2 md:col-start-7" : ""}`}>
        <RevealImage
          src={collection.image}
          alt={collection.imageAlt}
          sizes="(max-width: 768px) 92vw, 48vw"
          className="aspect-[4/5] w-full"
          objectPosition={collection.objectPosition}
        />
      </div>

      <div
        className={`flex flex-col justify-center md:col-span-5 ${
          flip ? "md:order-1 md:col-start-1" : "md:col-start-8"
        }`}
      >
        <Reveal>
          <p className="dd-eyebrow">{collection.eyebrow}</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h3 className="dd-h2 mt-6">{collection.title}</h3>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="dd-body mt-6 max-w-[30rem]">{collection.body}</p>
        </Reveal>
        <Reveal delay={0.14}>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-[family-name:var(--font-nav)] text-[10.5px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
            {collection.details.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--dd-gold)]/60" aria-hidden />
                {d}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.18}>
          <p className="mt-10 font-[family-name:var(--font-display)] text-lg italic text-[var(--dd-cream)]/70">
            From <span className="not-italic text-[var(--dd-cream)]">{inr(from)}</span> a night
          </p>
          <ul className="mt-5 border-t border-[var(--dd-line-dark)]">
            {rooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                availability={byId.get(room.id)}
                loading={loading}
                href={`#book?room=${room.slug}&in=${checkIn}&out=${checkOut}`}
                nights={nights}
              />
            ))}
          </ul>
        </Reveal>
      </div>
    </article>
  );
}

function RoomRow({
  room,
  availability,
  loading,
  href,
  nights,
}: {
  room: RoomType;
  availability?: AvailabilityResult;
  loading: boolean;
  href: string;
  nights: number;
}) {
  const soldOut = availability?.soldOut ?? false;
  const left = availability?.availableUnits;
  const note = loading
    ? "Checking…"
    : !availability
      ? null
      : soldOut
        ? "Fully booked"
        : left !== undefined && left <= 1
          ? "Last one"
          : left !== undefined && left <= 2
            ? `Only ${left} left`
            : "Available";

  const subtitle = room.subtitle.replace(/^.*?·\s*/, "").replace(/3 BHK/i, "Three bedrooms");

  return (
    <li className="group border-b border-[var(--dd-line-dark)]">
      <a
        href={soldOut ? undefined : href}
        aria-disabled={soldOut}
        className={`grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 py-5 transition-colors duration-500 sm:grid-cols-[1fr_auto_auto] ${
          soldOut ? "cursor-default opacity-50" : "hover:text-[var(--dd-gold)]"
        }`}
      >
        <span>
          <span className="block font-[family-name:var(--font-display)] text-[1.6rem] leading-tight">
            {room.name}
          </span>
          <span className="mt-1 block font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-cream)]/55">
            {subtitle}
            {note && (
              <>
                <span className="mx-2 text-[var(--dd-cream)]/30">·</span>
                <span className={soldOut ? "text-[var(--dd-cream)]/70" : "text-[var(--dd-gold)]"}>
                  {note}
                </span>
              </>
            )}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--dd-cream)]">
            {inr(room.basePriceInr)}
          </span>
          <span className="block font-[family-name:var(--font-nav)] text-[9.5px] uppercase tracking-[0.18em] text-[var(--dd-cream)]/45">
            {availability && !soldOut ? `${inr(availability.totalPriceInr || room.basePriceInr * nights)} · ${nights}n` : "per night"}
          </span>
        </span>
        <span
          aria-hidden
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--dd-line-dark)] text-[var(--dd-gold)] transition-all duration-500 group-hover:border-[var(--dd-gold)] group-hover:bg-[var(--dd-gold)] group-hover:text-[var(--dd-night)] sm:flex"
        >
          →
        </span>
      </a>
    </li>
  );
}
