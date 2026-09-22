"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";

type Row = Booking & { roomName?: string };

function GuestBookingActions({ row }: { row: Row }) {
  const [mode, setMode] = useState<"cancellation" | "date_change" | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/bookings/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: row.id,
          type: mode,
          requestedCheckIn: mode === "date_change" ? checkIn : undefined,
          requestedCheckOut: mode === "date_change" ? checkOut : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit request");
      setMessage("Request sent to the hotel.");
      setMode(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit request");
    } finally {
      setBusy(false);
    }
  }

  if (row.status === "cancelled" || row.status === "expired") return null;

  return (
    <div className="mt-3 space-y-2">
      {mode === "date_change" && (
        <div className="flex flex-wrap gap-2">
          <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="border border-[var(--dd-gold)]/30 bg-transparent px-2 py-1 text-xs" />
          <input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="border border-[var(--dd-gold)]/30 bg-transparent px-2 py-1 text-xs" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!mode && (
          <>
            <button type="button" onClick={() => setMode("date_change")} className="text-[10px] uppercase tracking-[0.12em] text-[var(--dd-gold)]">Request date change</button>
            <button type="button" onClick={() => setMode("cancellation")} className="text-[10px] uppercase tracking-[0.12em] text-[var(--dd-cream)]/60">Request cancellation</button>
          </>
        )}
        {mode && (
          <>
            <button type="button" disabled={busy} onClick={() => void submit()} className="border border-[var(--dd-gold)]/50 px-2 py-1 text-[10px] uppercase tracking-[0.12em]">{busy ? "Sending..." : "Send request"}</button>
            <button type="button" disabled={busy} onClick={() => setMode(null)} className="px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--dd-cream)]/50">Back</button>
          </>
        )}
      </div>
      {message && <p className="text-[11px] text-[var(--dd-gold)]">{message}</p>}
    </div>
  );
}

function payLabel(row: Row) {
  if (row.status === "cancelled" || row.status === "expired") return "—";
  if (row.paymentMethod === "online" && row.status === "confirmed") return "Paid online";
  if (row.paymentId === "paid_at_hotel") return "Paid at hotel";
  if (row.paymentMethod === "at_hotel") return "Due at hotel";
  if (row.status === "pending") return "Awaiting payment";
  return row.paymentMethod ?? "—";
}

export function BookingsTable({
  initial,
  admin = false,
}: {
  initial: Row[];
  admin?: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((row) => [row.id, row.adminNote ?? ""])),
  );

  async function act(id: string, action: "cancel" | "mark_paid" | "set_status" | "note", value?: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...(action === "set_status" ? { status: value } : {}), ...(action === "note" ? { note: value } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update");
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, ...data.booking } : row)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-10 font-[family-name:var(--font-body)] text-[var(--dd-cream)]/60">
        No bookings yet.
      </p>
    );
  }

  return (
    <div className="mt-10 overflow-x-auto">
      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
      <table className="w-full min-w-[52rem] text-left text-sm text-[var(--dd-cream)]">
        <thead className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-gold)]">
          <tr>
            <th className="pb-4 pr-4">Stay</th>
            <th className="pb-4 pr-4">Guest</th>
            <th className="pb-4 pr-4">Dates</th>
            <th className="pb-4 pr-4">Amount</th>
            <th className="pb-4 pr-4">Status</th>
            {admin && <th className="pb-4">Manage</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--dd-gold)]/15">
              <td className="py-4 pr-4">
                <p>{row.roomName ?? row.roomTypeId}</p>
                <p className="text-[11px] text-[var(--dd-cream)]/45">{row.id}</p>
              </td>
              <td className="py-4 pr-4">
                <p>{row.guestName}</p>
                <p className="text-[11px] text-[var(--dd-cream)]/45">
                  {row.guestEmail}
                  <br />
                  {row.guestPhone}
                </p>
              </td>
              <td className="py-4 pr-4 whitespace-nowrap">
                {row.checkIn} → {row.checkOut}
                <br />
                <span className="text-[11px] text-[var(--dd-cream)]/45">
                  {row.guests} guests
                </span>
              </td>
              <td className="py-4 pr-4">₹{row.amountInr.toLocaleString("en-IN")}</td>
              <td className="py-4 pr-4">
                {row.status}
                <br />
                <span className="text-[11px] text-[var(--dd-gold)]/80">{payLabel(row)}</span>
                {!admin && <GuestBookingActions row={row} />}
              </td>
              {admin && (
                <td className="py-4">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={row.status}
                      disabled={busy === row.id}
                      onChange={(event) => void act(row.id, "set_status", event.target.value)}
                      className="border border-[var(--dd-gold)]/30 bg-[var(--dd-green)] px-2 py-1 text-xs"
                    >
                      {(["pending", "confirmed", "checked_in", "checked_out", "cancelled", "expired"] as const).map((status) => (
                        <option key={status} value={status}>{status.replace("_", " ")}</option>
                      ))}
                    </select>
                    {row.status !== "cancelled" && row.paymentId !== "paid_at_hotel" && row.paymentMethod === "at_hotel" && (
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => void act(row.id, "mark_paid")}
                        className="border border-[var(--dd-gold)]/50 px-2 py-1 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.14em] hover:border-[var(--dd-gold)]"
                      >
                        Mark paid
                      </button>
                    )}
                    {row.status !== "cancelled" && row.status !== "expired" && (
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => void act(row.id, "cancel")}
                        className="border border-white/20 px-2 py-1 font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.14em] hover:border-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={notes[row.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                      placeholder="Admin note"
                      className="min-w-0 flex-1 border border-[var(--dd-gold)]/20 bg-transparent px-2 py-1 text-xs"
                    />
                    <button type="button" disabled={busy === row.id} onClick={() => void act(row.id, "note", notes[row.id] ?? "")} className="border border-white/20 px-2 py-1 text-[9px] uppercase tracking-[0.12em]">Save</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SignOutButton({ redirectTo = "/?intro=0" }: { redirectTo?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth", { method: "DELETE" });
        window.location.href = redirectTo;
      }}
      className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-cream)]/60 hover:text-[var(--dd-gold)]"
    >
      Sign out
    </button>
  );
}
