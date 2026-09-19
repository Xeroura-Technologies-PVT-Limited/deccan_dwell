"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import type { AvailabilityResult, RoomType } from "@/lib/types";
import { ROOM_TYPES } from "@/lib/inventory-client";
import { CHECK_IN_TIME, CHECK_OUT_TIME, OCCUPANCY_WINDOW } from "@/lib/hotel";

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultOut() {
  return format(addDays(new Date(), 2), "yyyy-MM-dd");
}

export function RoomsSection() {
  const [checkIn, setCheckIn] = useState(todayISO);
  const [checkOut, setCheckOut] = useState(defaultOut);
  const [availability, setAvailability] = useState<AvailabilityResult[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load availability");
        if (!cancelled) setAvailability(data.availability);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong");
          setAvailability(null);
        }
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

  return (
    <section
      id="rooms"
      className="relative bg-[var(--dd-green-deep)] px-6 py-24 text-[var(--dd-cream)] md:px-10 lg:px-14"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
          Rooms & Suites
        </p>
        <h2 className="mt-4 max-w-xl font-[family-name:var(--font-display)] text-4xl leading-tight md:text-5xl">
          Spacious stays. Modern comforts.
        </h2>
        <p className="mt-4 max-w-lg font-[family-name:var(--font-body)] text-base text-[var(--dd-cream)]/75">
          Live availability updates as guests book. Pick your dates to see how
          many rooms remain for the stay — or open the booking calendar to see
          remaining rooms on each day.
        </p>

        <div className="mt-10 flex flex-wrap items-end gap-4 border-b border-[var(--dd-gold)]/25 pb-8">
          <label className="flex flex-col gap-2">
            <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
              Check in · {CHECK_IN_TIME}
            </span>
            <input
              type="date"
              value={checkIn}
              min={todayISO()}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (e.target.value >= checkOut) {
                  setCheckOut(
                    format(addDays(new Date(e.target.value), 1), "yyyy-MM-dd"),
                  );
                }
              }}
              className="bg-transparent px-0 py-2 font-[family-name:var(--font-body)] text-sm outline-none ring-0 [color-scheme:dark]"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
              Check out · {CHECK_OUT_TIME}
            </span>
            <input
              type="date"
              value={checkOut}
              min={format(addDays(new Date(checkIn), 1), "yyyy-MM-dd")}
              onChange={(e) => setCheckOut(e.target.value)}
              className="bg-transparent px-0 py-2 font-[family-name:var(--font-body)] text-sm outline-none [color-scheme:dark]"
            />
          </label>
          {loading && (
            <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-cream)]/50">
              Checking…
            </span>
          )}
          {error && (
            <span className="text-sm text-red-300">{error}</span>
          )}
          <p className="w-full font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-cream)]/45">
            {OCCUPANCY_WINDOW}
          </p>
        </div>

        <h3 className="mt-12 font-[family-name:var(--font-display)] text-3xl text-[var(--dd-cream)] md:text-4xl">
          Rooms
        </h3>
        <p className="mt-3 max-w-lg font-[family-name:var(--font-body)] text-sm text-[var(--dd-cream)]/70">
          Executive, Premium, and Premium Deluxe — three of each, double occupancy.
          Extra bed ₹500 / night.
        </p>
        <div className="mt-10 grid gap-14 md:grid-cols-3">
          {ROOM_TYPES.filter((room) => room.kind === "room").map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              availability={byId.get(room.id)}
              checkIn={checkIn}
              checkOut={checkOut}
            />
          ))}
        </div>

        <h3
          id="suites"
          className="mt-20 font-[family-name:var(--font-display)] text-3xl text-[var(--dd-cream)] md:text-4xl"
        >
          Suites
        </h3>
        <p className="mt-3 max-w-lg font-[family-name:var(--font-body)] text-sm text-[var(--dd-cream)]/70">
          Three 3 BHK suites — ground, first, and second floor. Two of each.
        </p>
        <div className="mt-10 grid gap-14 md:grid-cols-3">
          {ROOM_TYPES.filter((room) => room.kind === "suite").map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              availability={byId.get(room.id)}
              checkIn={checkIn}
              checkOut={checkOut}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoomCard({
  room,
  availability,
  checkIn,
  checkOut,
}: {
  room: RoomType;
  availability?: AvailabilityResult;
  checkIn: string;
  checkOut: string;
}) {
  const soldOut = availability?.soldOut ?? false;
  const left = availability?.availableUnits;

  return (
    <article className="group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={room.image}
          alt={room.name}
          fill
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          sizes="(max-width:768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--dd-green-deep)]/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-3xl text-white">
              {room.name}
            </h3>
            <p className="mt-1 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-white/70">
              {room.subtitle}
            </p>
            <p className="mt-1 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-white/70">
              ₹{room.basePriceInr.toLocaleString("en-IN")} / night · {room.occupancy} occupancy
            </p>
          </div>
          <AvailabilityBadge soldOut={soldOut} left={left} total={room.totalUnits} />
        </div>
      </div>
      <p className="mt-5 max-w-md font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--dd-cream)]/70">
        {room.description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {room.amenities.map((a) => (
          <li
            key={a}
            className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.16em] text-[var(--dd-gold)]/90"
          >
            {a}
          </li>
        ))}
      </ul>
      <a
        href={`#book?room=${room.slug}&in=${checkIn}&out=${checkOut}`}
        className={`mt-8 inline-block border px-5 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] transition ${
          soldOut
            ? "pointer-events-none border-white/20 text-white/30"
            : "border-[var(--dd-gold)] text-[var(--dd-cream)] hover:bg-[var(--dd-gold)] hover:text-[var(--dd-green)]"
        }`}
      >
        {soldOut ? "Sold Out" : "Select Dates"}
      </a>
    </article>
  );
}

function AvailabilityBadge({
  soldOut,
  left,
  total,
}: {
  soldOut: boolean;
  left?: number;
  total: number;
}) {
  if (left === undefined) {
    return (
      <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-white/60">
        {total} units
      </span>
    );
  }
  if (soldOut) {
    return (
      <span className="border border-white/40 bg-black/30 px-3 py-1.5 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-white">
        All booked
      </span>
    );
  }
  return (
    <span className="border border-[var(--dd-gold)] bg-black/25 px-3 py-1.5 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-gold)]">
      {left} left
    </span>
  );
}
