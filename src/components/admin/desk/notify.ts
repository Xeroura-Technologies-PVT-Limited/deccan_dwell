"use client";

import type { AdminBooking, AdminRequest } from "./lib";
import { fmtDay, rupees, sourceOf } from "./lib";

export type DeskNotice = {
  id: string;
  kind: "booking" | "request" | "payment" | "cancelled";
  title: string;
  body: string;
  bookingId?: string;
  at: string;
  read: boolean;
};

const KEY = "dd-desk-notices";
const SEEN = "dd-desk-seen-at";
const MUTE = "dd-desk-muted";

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const loadNotices = (): DeskNotice[] => safe(() => JSON.parse(localStorage.getItem(KEY) || "[]"), []);
export const saveNotices = (list: DeskNotice[]) => safe(() => localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60))), undefined);
export const loadSeenAt = () => safe(() => localStorage.getItem(SEEN) || "", "");
export const saveSeenAt = (iso: string) => safe(() => localStorage.setItem(SEEN, iso), undefined);
export const loadMuted = () => safe(() => localStorage.getItem(MUTE) === "1", false);
export const saveMuted = (m: boolean) => safe(() => localStorage.setItem(MUTE, m ? "1" : "0"), undefined);

/** Bookings that came from outside the desk (the website) since `since`. */
export function newWebsiteBookings(bookings: AdminBooking[], since: string) {
  return bookings.filter((b) => b.createdAt > since && b.status !== "blocked" && b.status !== "expired" && sourceOf(b) === "Website");
}

export function bookingNotice(b: AdminBooking): DeskNotice {
  return {
    id: `bk:${b.id}:${b.status === "pending" ? "hold" : "new"}`,
    kind: "booking",
    title: b.status === "pending" ? `${b.guestName} is paying online` : `New booking · ${b.guestName}`,
    body: `${b.roomName} · ${fmtDay(b.checkIn)} → ${fmtDay(b.checkOut)} · ${rupees(b.amountInr)}`,
    bookingId: b.id,
    at: b.createdAt,
    read: false,
  };
}

export function requestNotice(r: AdminRequest): DeskNotice {
  return {
    id: `rq:${r.id}`,
    kind: "request",
    title: r.type === "cancellation" ? `${r.booking.guestName} wants to cancel` : `${r.booking.guestName} wants new dates`,
    body: `${r.booking.roomName} · ${fmtDay(r.booking.checkIn)} → ${fmtDay(r.booking.checkOut)}`,
    bookingId: r.booking.id,
    at: r.createdAt,
    read: false,
  };
}

let ctx: AudioContext | null = null;

/**
 * A soft two-note chime, synthesised (no audio file): a warm bell at E6 then
 * B6, each with a fast attack and a long, gentle decay.
 */
export function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    [
      { f: 1318.5, t: 0 },
      { f: 1975.5, t: 0.14 },
    ].forEach(({ f, t }) => {
      for (const [mult, level] of [[1, 1], [2.01, 0.25], [3.02, 0.08]] as const) {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        o.type = "sine";
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(level, now + t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 1.4);
        o.connect(g).connect(master);
        o.start(now + t);
        o.stop(now + t + 1.5);
      }
    });
  } catch {
    /* audio unavailable */
  }
}

/** Browsers only allow sound after the page has been clicked once; warm it up then. */
export function primeAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* ignore */
  }
}

export function systemNotify(n: DeskNotice) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible" && document.hasFocus()) return;
    const sys = new Notification(n.title, { body: n.body, icon: "/icon.png", tag: n.id });
    sys.onclick = () => {
      window.focus();
      sys.close();
    };
  } catch {
    /* ignore */
  }
}
