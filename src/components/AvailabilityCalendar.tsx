"use client";

import type { CalendarDay } from "@/lib/types";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
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

function daysIn(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
}

/**
 * One month of the booking calendar, in the style of a hotel reservation
 * engine: a continuous band for the stay, filled discs for arrival and
 * departure, a gold dot for nights that are nearly gone, struck-through
 * dates for nights that are full.
 */
export function AvailabilityCalendar({
  month,
  today,
  days,
  checkIn,
  checkOut,
  loading,
  onPick,
  onPrev,
  onNext,
}: {
  month: string;
  today: string;
  days: CalendarDay[] | null;
  checkIn: string;
  checkOut: string;
  loading: boolean;
  onPick: (date: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));
  const blanks = leadingBlanks(month);
  const count = daysIn(month);

  return (
    <div>
      <div className="mb-3 flex h-10 items-center justify-between">
        {onPrev ? (
          <button
            type="button"
            aria-label="Previous month"
            onClick={onPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dd-line-light)] text-[var(--dd-text-ink)] transition hover:border-[var(--dd-text-ink)] disabled:opacity-25"
          >
            ←
          </button>
        ) : (
          <span className="w-10" />
        )}
        <p className="font-[family-name:var(--font-display)] text-[1.45rem] text-[var(--dd-text-ink)]">
          {monthLabel(month)}
        </p>
        {onNext ? (
          <button
            type="button"
            aria-label="Next month"
            onClick={onNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dd-line-light)] text-[var(--dd-text-ink)] transition hover:border-[var(--dd-text-ink)]"
          >
            →
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="pb-2 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.16em] text-[var(--dd-text-ink)]/45"
          >
            {d}
          </span>
        ))}
        {Array.from({ length: blanks }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: count }).map((_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const day = byDate.get(date);
          const past = date < today;
          const isStart = date === checkIn;
          const isEnd = !!checkOut && date === checkOut;
          const inRange = !!checkIn && !!checkOut && date > checkIn && date < checkOut;
          const full = day?.soldOut ?? false;
          const few = !!day && !full && day.remaining <= 2;
          const disabled = past || loading || (full && !(checkIn && !checkOut && date > checkIn));
          const band =
            (isStart && checkOut) || isEnd || inRange
              ? `bg-[var(--dd-text-ink)]/[0.07] ${isStart ? "rounded-l-full" : ""} ${isEnd ? "rounded-r-full" : ""}`
              : "";
          return (
            <div key={date} className={`py-0.5 ${band}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(date)}
                aria-pressed={isStart || isEnd}
                aria-label={`${date}${full ? ", fully booked" : few ? `, ${day?.remaining} left` : ""}`}
                className={`relative mx-auto flex aspect-square w-full max-w-[2.6rem] flex-col items-center justify-center rounded-full font-[family-name:var(--font-display)] text-[1rem] transition-colors duration-300 ${
                  isStart || isEnd
                    ? "dd-pop bg-[var(--dd-text-ink)] text-[var(--dd-paper)]"
                    : past
                      ? "text-[var(--dd-text-ink)]/20"
                      : full
                        ? "text-[var(--dd-text-ink)]/30 line-through decoration-[var(--dd-text-ink)]/30"
                        : "text-[var(--dd-text-ink)] hover:bg-[var(--dd-text-ink)]/[0.08]"
                } disabled:cursor-not-allowed`}
              >
                {i + 1}
                {few && !isStart && !isEnd && (
                  <span className="absolute bottom-[18%] h-1 w-1 rounded-full bg-[var(--dd-gold-ink)]" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { shiftMonth };
