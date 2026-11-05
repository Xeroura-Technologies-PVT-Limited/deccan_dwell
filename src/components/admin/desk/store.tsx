"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readJson } from "@/lib/http";
import type { AdminBooking, AdminRequest, AdminRoom } from "./lib";
import { useToast } from "./ui";

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
      const err = b.error || r.error || q.error;
      if (err) toast(err, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    // Keep the desk current while it is left open at reception.
    const i = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
    };
  }, [refresh]);

  const roomName = useCallback((id: string) => rooms.find((r) => r.id === id)?.name ?? id, [rooms]);

  const upsert = useCallback(
    (b: AdminBooking) => {
      const withName = { ...b, roomName: b.roomName ?? roomName(b.roomTypeId) };
      setBookings((list) => {
        const i = list.findIndex((x) => x.id === b.id);
        if (i === -1) return [withName, ...list];
        const next = list.slice();
        next[i] = { ...list[i], ...withName, roomName: b.roomName ?? (b.roomTypeId === list[i].roomTypeId ? list[i].roomName : roomName(b.roomTypeId)) };
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
      draft,
      closeDraft: () => setDraft(null),
    }),
    [bookings, rooms, requests, loading, refresh, patchBooking, createBooking, reviewRequest, saveRoom, openId, draft],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
