"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Booking } from "@/lib/types";
import { todayISO } from "@/lib/dates";
import { readJson } from "@/lib/http";
import { BookingsTable, SignOutButton } from "@/components/BookingsTable";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminCalendar } from "@/components/AdminCalendar";
import { AdminRooms } from "@/components/AdminRooms";
import { AdminBookingRequests } from "@/components/AdminBookingRequests";

type Row = Booking & { roomName?: string };
type Tab = "overview" | "bookings" | "calendar" | "rooms" | "requests";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "bookings", label: "Bookings" },
  { id: "calendar", label: "Calendar" },
  { id: "rooms", label: "Rooms & rates" },
  { id: "requests", label: "Requests" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const pretty = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** The hotel desk: one header, five tabs, no endless scroll. */
export function AdminShell({ email, bookings }: { email: string; bookings: Row[] }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    // Restore the tab from the URL hash (deferred a frame so the first render stays SSR-identical).
    const fromHash = window.location.hash.slice(1) as Tab;
    const raf = TABS.some((t) => t.id === fromHash) ? requestAnimationFrame(() => setTab(fromHash)) : 0;
    fetch("/api/admin/booking-requests")
      .then((r) => readJson<{ requests?: { status: string }[] }>(r))
      .then((d) => setPending((d.requests ?? []).filter((r) => r.status === "pending").length))
      .catch(() => setPending(null));
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `#${t}`);
  };

  const today = todayISO();
  const live = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && b.status !== "expired"),
    [bookings],
  );
  const arrivals = useMemo(
    () =>
      live
        .filter((b) => b.checkIn >= today && b.status !== "checked_in" && b.status !== "checked_out")
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
        .slice(0, 6),
    [live, today],
  );
  const inHouse = useMemo(() => live.filter((b) => b.status === "checked_in"), [live]);
  const dueAtHotel = useMemo(
    () => live.filter((b) => b.paymentMethod === "at_hotel" && b.paymentId !== "paid_at_hotel"),
    [live],
  );

  return (
    <div className="dd-night min-h-[100svh]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--dd-line-dark)] bg-[color-mix(in_oklab,var(--dd-night)_90%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-[var(--dd-gutter)] py-4">
          <div className="flex items-center gap-5">
            <Link href="/?intro=0" className="relative block h-[38px] w-[150px]" aria-label="Deccan Dwell site">
              <Image src="/images/logo.png" alt="Deccan Dwell" fill sizes="150px" className="object-contain object-left" />
            </Link>
            <span className="hidden border-l border-[var(--dd-line-dark)] pl-5 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.3em] text-[var(--dd-gold)] sm:block">
              Hotel desk
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden font-[family-name:var(--font-body)] text-[13px] text-[var(--dd-cream)]/55 md:block">
              {email}
            </span>
            <Link href="/?intro=0" className="dd-link !pb-1 !text-[10px] text-[var(--dd-cream)]/75 hover:text-[var(--dd-gold)]">
              View site
            </Link>
            <SignOutButton redirectTo="/admin/login" />
          </div>
        </div>
        <nav aria-label="Desk sections" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-[calc(var(--dd-gutter)-12px)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              className={`relative flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 font-[family-name:var(--font-nav)] text-[10.5px] uppercase tracking-[0.2em] transition-colors ${
                tab === t.id ? "text-[var(--dd-cream)]" : "text-[var(--dd-cream)]/45 hover:text-[var(--dd-cream)]/80"
              }`}
            >
              {t.label}
              {t.id === "requests" && pending ? (
                <span className="rounded-full bg-[var(--dd-gold)] px-1.5 py-px text-[9px] tracking-normal text-[var(--dd-night)]">
                  {pending}
                </span>
              ) : null}
              {tab === t.id && (
                <motion.span layoutId="dd-admin-tab" className="absolute inset-x-3 bottom-0 h-[2px] bg-[var(--dd-gold)]" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-[var(--dd-gutter)] pb-24 pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === "overview" && (
              <div>
                <p className="dd-eyebrow">{greeting()}</p>
                <h1 className="dd-h2 mt-5">
                  Today at <em>Deccan Dwell</em>
                </h1>
                <AdminDashboard />

                <div className="mt-12 grid gap-6 lg:grid-cols-3">
                  <Panel title="Arriving next" action={{ label: "All bookings", onClick: () => go("bookings") }}>
                    {arrivals.length === 0 ? (
                      <Empty>No upcoming arrivals.</Empty>
                    ) : (
                      <ul className="divide-y divide-[var(--dd-line-dark)]">
                        {arrivals.map((b) => (
                          <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-[15px]">{b.guestName}</p>
                              <p className="truncate text-[12px] text-[var(--dd-cream)]/50">
                                {b.roomName ?? b.roomTypeId} · {b.guests} guest{b.guests === 1 ? "" : "s"}
                              </p>
                            </div>
                            <span className={`shrink-0 text-[12px] ${b.checkIn === today ? "text-[var(--dd-gold)]" : "text-[var(--dd-cream)]/65"}`}>
                              {b.checkIn === today ? "Today" : pretty(b.checkIn)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                  <Panel title="In house">
                    {inHouse.length === 0 ? (
                      <Empty>No guests checked in.</Empty>
                    ) : (
                      <ul className="divide-y divide-[var(--dd-line-dark)]">
                        {inHouse.map((b) => (
                          <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                            <p className="truncate text-[15px]">{b.guestName}</p>
                            <span className="text-[12px] text-[var(--dd-cream)]/55">out {pretty(b.checkOut)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                  <Panel title="Needs attention">
                    <button
                      type="button"
                      onClick={() => go("requests")}
                      className="flex w-full items-center justify-between border-b border-[var(--dd-line-dark)] py-3 text-left hover:text-[var(--dd-gold)]"
                    >
                      <span className="text-[15px]">Guest requests</span>
                      <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--dd-gold)]">{pending ?? "–"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => go("bookings")}
                      className="flex w-full items-center justify-between py-3 text-left hover:text-[var(--dd-gold)]"
                    >
                      <span className="text-[15px]">Payments due at hotel</span>
                      <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--dd-gold)]">{dueAtHotel.length}</span>
                    </button>
                  </Panel>
                </div>
              </div>
            )}

            {tab === "bookings" && (
              <div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="dd-eyebrow">Reservations</p>
                    <h1 className="dd-h2 mt-5">Bookings</h1>
                  </div>
                  <a href="/api/admin/bookings/export" className="dd-btn dd-btn--sm">
                    Export CSV
                  </a>
                </div>
                <BookingsTable initial={bookings} admin />
              </div>
            )}

            {tab === "calendar" && (
              <div>
                <p className="dd-eyebrow">Occupancy</p>
                <h1 className="dd-h2 mt-5">Calendar</h1>
                <AdminCalendar />
              </div>
            )}

            {tab === "rooms" && (
              <div>
                <p className="dd-eyebrow">Inventory</p>
                <h1 className="dd-h2 mt-5">Rooms &amp; rates</h1>
                <AdminRooms />
              </div>
            )}

            {tab === "requests" && (
              <div>
                <p className="dd-eyebrow">From guests</p>
                <h1 className="dd-h2 mt-5">Requests</h1>
                <AdminBookingRequests onChange={(n) => setPending(n)} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <section className="border border-[var(--dd-line-dark)] bg-[var(--dd-night-2)]/60 p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.24em] text-[var(--dd-gold)]">{title}</p>
        {action && (
          <button type="button" onClick={action.onClick} className="text-[11px] text-[var(--dd-cream)]/55 hover:text-[var(--dd-gold)]">
            {action.label} →
          </button>
        )}
      </div>
      <div className="font-[family-name:var(--font-body)] text-[var(--dd-cream)]">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-[var(--dd-cream)]/40">{children}</p>;
}
