"use client";

import { useState } from "react";
import type { Booking } from "@/lib/types";

type Row = Booking & { roomName?: string };

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

  async function act(id: string, action: "cancel" | "mark_paid") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
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
              </td>
              {admin && (
                <td className="py-4">
                  <div className="flex flex-wrap gap-2">
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
