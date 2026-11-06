"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readJson } from "@/lib/http";
import type { AdminBooking, AdminRequest, AdminRoom } from "./lib";
import { useToast } from "./ui";
import {
  bookingNotice,
  chime,
  loadMuted,
  loadNotices,
  loadSeenAt,
  newWebsiteBookings,
  primeAudio,
  requestNotice,
  saveMuted,
  saveNotices,
  saveSeenAt,
  systemNotify,
  type DeskNotice,
} from "./notify";

export type NewReservationPrefill = { roomTypeId?: string; checkIn?: string; checkOut?: string; block?: boolean };

type Desk = {
  bookings: AdminBooking[];
  rooms: AdminRoom[];
  requests: AdminRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
  patchBooking: (id: string, body: Record<string, unknown>, success?: string) => Promise<boolean>;
  createBooking: (body: Record<string, unknown>) => Promise<AdminBooking | null>;
  reviewRequest: (id: string, status: "approved" | "rejected") => Promise<void>;
  saveRoom: (room: Partial<AdminRoom> & { id: string }) => Promise<boolean>;
  openBooking: (id: string | null) => void;
  openId: string | null;
  newReservation: (prefill?: NewReservationPrefill) => void;
  notices: DeskNotice[];
  unread: number;
  markRead: (id?: string) => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  draft: NewReservationPrefill | null;
  closeDraft: () => void;
};

const Ctx = createContext<Desk | null>(null);
export const useDesk = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDesk outside provider");
  return v;
};

export function DeskProvider({ initialBookings, children }: { initialBookings: AdminBooking[]; children: ReactNode }) {
  const toast = useToast();
  const [bookings, setBookings] = useState(initialBookings);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewReservationPrefill | null>(null);
  const [notices, setNotices] = useState<DeskNotice[]>([]);
  const [muted, setMutedState] = useState(false);
  const mutedRef = useRef(false);
  const noticed = useRef<Set<string> | null>(null);
  /** Newest createdAt in the last full download; the ping asks "anything after this?". */
  const cursor = useRef<string | null>(null);
  const syncing = useRef(false);

  /** Turn fresh data into notifications: new website bookings and guest requests. */
  const collect = useCallback((list: AdminBooking[], reqs: AdminRequest[]) => {
    if (!noticed.current) {
      const stored = loadNotices();
      noticed.current = new Set(stored.map((n) => n.id));
      setNotices(stored);
      const m = loadMuted();
      mutedRef.current = m;
      setMutedState(m);
    }
    let seenAt = loadSeenAt();
    if (!seenAt) {
      // First time this device opens the desk: start from now, no backlog.
      seenAt = new Date().toISOString();
      saveSeenAt(seenAt);
    }
    const fresh: DeskNotice[] = [];
    for (const b of newWebsiteBookings(list, seenAt)) {
      const n = bookingNotice(b);
      if (!noticed.current.has(n.id)) fresh.push(n);
    }
    for (const r of reqs) {
      if (r.status !== "pending" || r.createdAt <= seenAt) continue;
      const n = requestNotice(r);
      if (!noticed.current.has(n.id)) fresh.push(n);
    }
    const newest = [...list.map((b) => b.createdAt), ...reqs.map((r) => r.createdAt)].sort().pop();
    if (newest && newest > seenAt) saveSeenAt(newest);
    if (!fresh.length) return;
    fresh.sort((a, b) => b.at.localeCompare(a.at));
    for (const n of fresh) noticed.current.add(n.id);
    setNotices((cur) => {
      const next = [...fresh, ...cur].slice(0, 60);
      saveNotices(next);
      return next;
    });
    if (!mutedRef.current) chime();
    fresh.slice(0, 2).forEach((n) => toast(n.title));
    fresh.slice(0, 3).forEach(systemNotify);
  }, [toast]);

  const refresh = useCallback(async () => {
    try {
      const [b, r, q] = await Promise.all([
        fetch("/api/admin/bookings", { cache: "no-store" }).then((x) => readJson<{ bookings: AdminBooking[] }>(x)),
        fetch("/api/admin/rooms", { cache: "no-store" }).then((x) => readJson<{ rooms: AdminRoom[] }>(x)),
        fetch("/api/admin/booking-requests", { cache: "no-store" }).then((x) => readJson<{ requests: AdminRequest[] }>(x)),
      ]);
      if (b.bookings) setBookings(b.bookings);
      if (r.rooms) setRooms(r.rooms);
      if (q.requests) setRequests(q.requests);
      if (b.bookings && q.requests) {
        collect(b.bookings, q.requests);
        // Only advance the cursor after a complete download, so a failed
        // load is retried on the next ping instead of being skipped.
        const newest = [...b.bookings.map((x) => x.createdAt), ...q.requests.map((x) => x.createdAt)].sort().pop();
        cursor.current = newest ?? "1970-01-01T00:00:00.000Z";
      }
      const err = b.error || r.error || q.error;
      if (err) toast(err, "error");
    } finally {
      setLoading(false);
    }
  }, [toast, collect]);

  /**
   * The 20-second check while the desk sits open at reception. It asks the
   * server a tiny question ("any new website bookings or guest requests since
   * my newest one?") and only downloads the full lists — then chimes — when
   * the answer is yes. Saves database egress as the booking history grows.
   */
  const poll = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      if (!cursor.current) {
        await refresh();
        return;
      }
      const res = await fetch(`/api/admin/desk/ping?since=${encodeURIComponent(cursor.current)}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.assign("/admin/login");
        return;
      }
      if (!res.ok) return; // try again on the next tick
      const ping = await readJson<{ hasNew?: boolean }>(res);
      if (ping.hasNew) await refresh();
    } catch {
      /* offline for a moment — next tick retries */
    } finally {
      syncing.current = false;
    }
  }, [refresh]);

  useEffect(() => {
    const t = window.setTimeout(() => void poll(), 0);
    // Check for new bookings every 20 seconds (background tabs slow this to about once a minute).
    const i = window.setInterval(() => void poll(), 20_000);
    const unlock = () => primeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [poll]);

  const unread = notices.filter((n) => !n.read).length;
  useEffect(() => {
    document.title = unread ? `(${unread}) Front desk · Deccan Dwell` : "Front desk · Deccan Dwell";
  }, [unread]);

  const markRead = useCallback((id?: string) => {
    setNotices((cur) => {
      const next = cur.map((n) => (!id || n.id === id ? { ...n, read: true } : n));
      saveNotices(next);
      return next;
    });
  }, []);
  const setMuted = useCallback((m: boolean) => {
    mutedRef.current = m;
    setMutedState(m);
    saveMuted(m);
    if (!m) chime();
  }, []);

  const roomName = useCallback((id: string) => rooms.find((r) => r.id === id)?.name ?? id, [rooms]);

  const upsert = useCallback(
    (b: AdminBooking) => {
      const withName = { ...b, roomName: b.roomName ?? roomName(b.roomTypeId) };
      setBookings((list) => {
        const i = list.findIndex((x) => x.id === b.id);
        if (i === -1) return [withName, ...list];
        const next = list.slice();
        next[i] = { ...list[i], ...withName, payments: b.payments ?? list[i].payments, roomName: b.roomName ?? (b.roomTypeId === list[i].roomTypeId ? list[i].roomName : roomName(b.roomTypeId)) };
        return next;
      });
    },
    [roomName],
  );

  const patchBooking = useCallback(
    async (id: string, body: Record<string, unknown>, success?: string) => {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await readJson<{ booking?: AdminBooking }>(res);
      if (!res.ok || !data.booking) {
        toast(data.error || "Could not save", "error");
        return false;
      }
      upsert(data.booking);
      if (success) toast(success);
      return true;
    },
    [toast, upsert],
  );

  const createBooking = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJson<{ booking?: AdminBooking; bookings?: AdminBooking[] }>(res);
      for (const b of data.bookings ?? []) upsert(b);
      if (!res.ok) {
        toast(data.error || "Could not save", "error");
        return null;
      }
      if (data.booking) upsert(data.booking);
      return data.booking ?? data.bookings?.[0] ?? null;
    },
    [toast, upsert],
  );

  const reviewRequest = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      const res = await fetch("/api/admin/booking-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        toast(data.error || "Could not update the request", "error");
        return;
      }
      toast(status === "approved" ? "Request approved" : "Request declined");
      await refresh();
    },
    [refresh, toast],
  );

  const saveRoom = useCallback(
    async (room: Partial<AdminRoom> & { id: string }) => {
      const res = await fetch("/api/admin/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room),
      });
      const data = await readJson<{ room?: AdminRoom }>(res);
      if (!res.ok || !data.room) {
        toast(data.error || "Could not save the room", "error");
        return false;
      }
      setRooms((list) => list.map((r) => (r.id === room.id ? { ...r, ...data.room } : r)));
      setBookings((list) => list.map((b) => (b.roomTypeId === room.id ? { ...b, roomName: data.room!.name } : b)));
      toast(`${data.room.name} saved`);
      return true;
    },
    [toast],
  );

  const value = useMemo<Desk>(
    () => ({
      bookings,
      rooms,
      requests,
      loading,
      refresh,
      patchBooking,
      createBooking,
      reviewRequest,
      saveRoom,
      openBooking: setOpenId,
      openId,
      newReservation: (prefill) => setDraft(prefill ?? {}),
      notices,
      unread,
      markRead,
      muted,
      setMuted,
      draft,
      closeDraft: () => setDraft(null),
    }),
    [bookings, rooms, requests, loading, refresh, patchBooking, createBooking, reviewRequest, saveRoom, openId, draft, notices, unread, markRead, muted, setMuted],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
