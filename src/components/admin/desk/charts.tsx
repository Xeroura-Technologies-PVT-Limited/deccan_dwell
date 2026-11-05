"use client";

import { useState } from "react";
import { cx } from "./ui";

/**
 * Single-series column chart: one hue, thin columns with 4px rounded tops on a
 * recessive baseline, a hover tooltip per column, and the scale stated in text
 * (so identity is never colour-alone).
 */
export function Columns({
  data,
  max,
  format,
  height = 160,
  highlight,
}: {
  data: { key: string; label: string; sub?: string; value: number; note?: string }[];
  max: number;
  format: (v: number) => string;
  height?: number;
  highlight?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(max, 1);
  return (
    <div className="relative">
      <div className="flex items-end gap-[2px]" style={{ height }} role="list">
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / top) * (height - 4));
          return (
            <div
              key={d.key}
              role="listitem"
              aria-label={`${d.label}: ${format(d.value)}`}
              className="group relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={cx(
                  "w-full max-w-[28px] rounded-t-[4px] transition-colors",
                  d.key === highlight ? "bg-[#b48a3c]" : hover === i ? "bg-[#0e4a3f]" : "bg-[#2f6b5c]",
                )}
                style={{ height: h }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0b2a24] px-2.5 py-1.5 text-[12px] text-white shadow-lg">
                  <span className="font-medium">{format(d.value)}</span>
                  <span className="text-white/60"> · {d.label}</span>
                  {d.note && <span className="block text-white/60">{d.note}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[2px] border-t border-[var(--a-line)] pt-2">
        {data.map((d, i) => (
          <div key={d.key} className={cx("flex-1 text-center text-[10.5px] leading-tight", d.key === highlight ? "font-semibold text-[var(--a-ink)]" : "text-[var(--a-muted)]")}>
            {data.length <= 16 || i % Math.ceil(data.length / 12) === 0 ? (
              <>
                <span className="block">{d.label}</span>
                {d.sub && <span className="block opacity-70">{d.sub}</span>}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars for a ranked breakdown, value written in ink beside each bar. */
export function BarList({ rows, format }: { rows: { label: string; value: number; sub?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium">{r.label}</span>
            <span className="tabular-nums text-[var(--a-ink)]">
              {format(r.value)}
              {r.sub && <span className="ml-2 text-[12px] text-[var(--a-muted)]">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#efebe2]">
            <div className="h-2 rounded-full bg-[#2f6b5c]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
