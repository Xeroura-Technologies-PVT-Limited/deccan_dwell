"use client";

import { useEffect, useState } from "react";

type RequestRow = {
  id: string;
  type: string;
  status: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  createdAt: string;
  booking: { id: string; guestName: string; guestEmail: string; checkIn: string; checkOut: string; roomName: string };
};

export function AdminBookingRequests() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/booking-requests")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load requests");
        setRows(data.requests);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load requests"));
  }, []);

  async function review(id: string, status: "approved" | "rejected") {
    const response = await fetch("/api/admin/booking-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not review request");
      return;
    }
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  const pending = rows.filter((row) => row.status === "pending");
  if (error) return <p className="mt-8 text-sm text-red-300">{error}</p>;
  if (pending.length === 0) return null;

  return (
    <section className="mt-14 border-t border-[var(--dd-gold)]/15 pt-8">
      <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-gold)]">Guest requests</p>
      <div className="mt-5 space-y-4">
        {pending.map((row) => (
          <div key={row.id} className="border border-[var(--dd-gold)]/20 p-4 text-sm">
            <p className="font-medium capitalize">{row.type.replace("_", " ")}</p>
            <p className="mt-1 text-[var(--dd-cream)]/65">{row.booking.guestName} · {row.booking.guestEmail}</p>
            <p className="mt-1 text-[var(--dd-cream)]/65">{row.booking.roomName} · {row.booking.checkIn} → {row.booking.checkOut}</p>
            {row.type === "date_change" && <p className="mt-1 text-[var(--dd-gold)]">Requested: {row.requestedCheckIn} → {row.requestedCheckOut}</p>}
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={() => void review(row.id, "approved")} className="border border-[var(--dd-gold)]/60 px-3 py-1 text-[10px] uppercase tracking-[0.14em]">Approve</button>
              <button type="button" onClick={() => void review(row.id, "rejected")} className="border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.14em]">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
