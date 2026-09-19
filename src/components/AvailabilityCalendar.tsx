"use client";

import { useMemo } from "react";
import type { CalendarDay } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthLabel(month: string) {
  const [year, monthNum] = month.split("-");
  return `${MONTHS[Number(monthNum) - 1]} ${year}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNum - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function leadingBlanks(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, monthNum - 1, 1)).getUTCDay();
  return (weekday + 6) % 7;
}

function inStay(date: string, checkIn: string, checkOut: string) {
  return Boolean(checkIn && checkOut && date >= checkIn && date < checkOut);
}

export function AvailabilityCalendar({
  month,
  today,
  days,
  checkIn,
  checkOut,
  loading,
  onMonthChange,
  onPick,
}: {
  month: string;
  today: string;
  days: CalendarDay[] | null;
  checkIn: string;
  checkOut: string;
  loading: boolean;
  onMonthChange: (month: string) => void;
  onPick: (date: string) => void;
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    days?.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const blanks = leadingBlanks(month);
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const currentMonth = today.slice(0, 7);
  const canGoPrev = prevMonth >= currentMonth;

  return (
    <div className="border border-[var(--dd-gold)]/25 p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => onMonthChange(prevMonth)}
          className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)] disabled:opacity-30"
        >
          Prev
        </button>
        <p className="font-[family-name:var(--font-display)] text-xl text-[var(--dd-cream)]">
          {monthLabel(month)}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(nextMonth)}
          className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="pb-2 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.16em] text-[var(--dd-gold)]/70"
          >
            {d}
          </span>
        ))}
        {Array.from({ length: blanks }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {(days ?? []).map((day) => {
          const past = day.date < today;
          const selectedStart = day.date === checkIn;
          const selectedEnd = checkOut ? day.date === checkOut : false;
          const stay = inStay(day.date, checkIn, checkOut);
          const disabled = past || (day.soldOut && !selectedEnd);
          return (
            <button
              key={day.date}
              type="button"
              disabled={disabled || loading}
              onClick={() => onPick(day.date)}
              className={`flex min-h-[3.4rem] flex-col items-center justify-center rounded-sm px-0.5 py-1 transition ${
                selectedStart || selectedEnd
                  ? "bg-[var(--dd-gold)] text-[var(--dd-green)]"
                  : stay
                    ? "bg-[var(--dd-gold)]/20"
                    : "hover:bg-white/5"
              } ${past ? "pointer-events-none opacity-25" : ""} ${
                disabled && !past ? "cursor-not-allowed opacity-35" : ""
              }`}
            >
              <span className="font-[family-name:var(--font-display)] text-base leading-none">
                {Number(day.date.slice(8))}
              </span>
              {!past && (
                <span
                  className={`mt-1 font-[family-name:var(--font-nav)] text-[8px] uppercase tracking-[0.08em] ${
                    selectedStart || selectedEnd
                      ? "text-[var(--dd-green)]"
                      : day.soldOut
                        ? "text-red-300/80"
                        : "text-[var(--dd-gold)]"
                  }`}
                >
                  {day.soldOut ? "Full" : `${day.remaining} left`}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!days && (
        <p className="mt-3 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-cream)]/40">
          {loading ? "Loading calendar…" : "Pick a room to see remaining nights"}
        </p>
      )}
    </div>
  );
}

export { shiftMonth };
