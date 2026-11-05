"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeskProvider, useDesk } from "./store";
import { Btn, ToastProvider, cx, inputCls } from "./ui";
import { fmtDay, type AdminBooking } from "./lib";
import { TodayView } from "./TodayView";
import { CalendarView } from "./CalendarView";
import { ReservationsView } from "./ReservationsView";
import { GuestsView } from "./GuestsView";
import { RoomsView } from "./RoomsView";
import { RequestsView } from "./RequestsView";
import { ReportsView } from "./ReportsView";
import { ReservationDrawer } from "./ReservationDrawer";
import { NewReservationModal } from "./NewReservationModal";

const VIEWS = [
  { id: "today", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { id: "calendar", label: "Calendar", icon: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" },
  { id: "reservations", label: "Reservations", icon: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h4" },
  { id: "guests", label: "Guests", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" },
  { id: "rooms", label: "Rooms & rates", icon: "M3 18v-6a3 3 0 013-3h12a3 3 0 013 3v6M3 18h18M7 9V6h10v3" },
  { id: "requests", label: "Requests", icon: "M4 5h16v11H8l-4 4z" },
  { id: "reports", label: "Reports", icon: "M5 20V10M12 20V4M19 20v-7" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

export function AdminApp({ email, bookings }: { email: string; bookings: AdminBooking[] }) {
  return (
    <ToastProvider>
      <DeskProvider initialBookings={bookings}>
        <Shell email={email} />
      </DeskProvider>
    </ToastProvider>
  );
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={cx("h-[18px] w-[18px]", className)} aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Shell({ email }: { email: string }) {
  const desk = useDesk();
  const [view, setView] = useState<ViewId>("today");

  useEffect(() => {
    const read = () => {
      const id = window.location.hash.replace("#", "") as ViewId;
      if (VIEWS.some((v) => v.id === id)) setView(id);
    };
    const t = window.setTimeout(read, 0);
    window.addEventListener("hashchange", read);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", read);
    };
  }, []);

  const go = (id: ViewId) => {
    setView(id);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  };

  const pendingRequests = desk.requests.filter((r) => r.status === "pending").length;
  const title = VIEWS.find((v) => v.id === view)?.label ?? "";

  return (
    <div className="dda min-h-[100svh] bg-[var(--a-bg)] font-[family-name:var(--font-body)] text-[var(--a-ink)] lg:pl-[248px]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-[#0b2a24] text-white lg:flex">
        <Link href="/?intro=0" className="flex items-center gap-3 px-6 pb-6 pt-7">
          <Image src="/images/logo.png" alt="Deccan Dwell" width={128} height={51} className="h-[44px] w-auto" />
        </Link>
        <p className="px-6 pb-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-white/40">Front desk</p>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => go(v.id)}
              className={cx(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-[13.5px] transition",
                view === v.id ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon d={v.icon} className={view === v.id ? "text-[#d9b46a]" : ""} />
              <span className="flex-1 text-left">{v.label}</span>
              {v.id === "requests" && pendingRequests > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#d9b46a] px-1.5 text-[11px] font-semibold text-[#0b2a24]">{pendingRequests}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 px-6 py-5 text-[12px] text-white/55">
          <p className="truncate">{email}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/?intro=0" className="hover:text-white">View site</Link>
            <button
              type="button"
              className="hover:text-white"
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                window.location.assign("/admin/login");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--a-line)] bg-[var(--a-bg)]/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <h1 className="hidden font-[family-name:var(--font-display)] text-[26px] leading-none sm:block lg:min-w-[180px]">{title}</h1>
          <GlobalSearch />
          <Btn variant="primary" onClick={() => desk.newReservation()} className="shrink-0">
            <span className="text-[16px] leading-none">+</span>
            <span className="hidden sm:inline">New reservation</span>
          </Btn>
        </div>
        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => go(v.id)}
              className={cx(
                "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px]",
                view === v.id ? "bg-[#0b3d33] text-white" : "text-[var(--a-muted)]",
              )}
            >
              {v.label}
              {v.id === "requests" && pendingRequests > 0 && <span className="rounded-full bg-[#d9b46a] px-1.5 text-[11px] text-[#0b2a24]">{pendingRequests}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {view === "today" && <TodayView go={go} />}
        {view === "calendar" && <CalendarView />}
        {view === "reservations" && <ReservationsView />}
        {view === "guests" && <GuestsView />}
        {view === "rooms" && <RoomsView />}
        {view === "requests" && <RequestsView />}
        {view === "reports" && <ReportsView />}
      </main>

      <ReservationDrawer />
      <NewReservationModal />
    </div>
  );
}

/** Find any booking by guest, phone, email or booking number. "/" focuses it. */
function GlobalSearch() {
  const desk = useDesk();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const digits = term.replace(/\D/g, "");
    return desk.bookings
      .filter((b) => b.status !== "blocked")
      .filter(
        (b) =>
          b.guestName.toLowerCase().includes(term) ||
          b.guestEmail.toLowerCase().includes(term) ||
          b.id.toLowerCase().includes(term) ||
          (digits.length >= 3 && b.guestPhone.replace(/\D/g, "").includes(digits)),
      )
      .slice(0, 8);
  }, [q, desk.bookings]);

  return (
    <div className="relative flex-1">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        ref={ref}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Search guest, phone, email or booking no.   /"
        className={cx(inputCls, "pl-9")}
        aria-label="Search reservations"
      />
      {open && results.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-[var(--a-line)] bg-white shadow-xl">
          {results.map((b) => (
            <button
              key={b.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                desk.openBooking(b.id);
                setOpen(false);
                setQ("");
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#f7f4ed]"
            >
              <span>
                <span className="block text-[13.5px] font-medium">{b.guestName}</span>
                <span className="block text-[12px] text-[var(--a-muted)]">
                  {b.roomName} · {fmtDay(b.checkIn)} → {fmtDay(b.checkOut)}
                </span>
              </span>
              <span className="font-mono text-[11px] text-[var(--a-muted)]">{b.id.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
