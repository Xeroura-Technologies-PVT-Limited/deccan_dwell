"use client";

import { useEffect, useState } from "react";

type Room = { id: string; name: string; description: string; image: string; basePriceInr: number; totalUnits: number };

export function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/rooms").then((response) => response.json()).then((data) => setRooms(data.rooms ?? []));
  }, []);

  function update(id: string, field: keyof Room, value: string) {
    setRooms((current) => current.map((room) => room.id === id ? { ...room, [field]: field === "basePriceInr" || field === "totalUnits" ? Number(value) : value } : room));
  }

  async function save(room: Room) {
    setMessage(null);
    const response = await fetch("/api/admin/rooms", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(room) });
    const data = await response.json();
    setMessage(response.ok ? `${room.name} saved.` : data.error || "Could not save room");
  }

  return (
    <section className="mt-14 border-t border-[var(--dd-gold)]/15 pt-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-gold)]">Room management</p>
        {message && <p className="text-xs text-[var(--dd-gold)]">{message}</p>}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {rooms.map((room) => (
          <div key={room.id} className="border border-[var(--dd-gold)]/20 p-4">
            <p className="mb-3 text-xs text-[var(--dd-cream)]/50">{room.id}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={room.name} onChange={(event) => update(room.id, "name", event.target.value)} className="border-b border-[var(--dd-gold)]/30 bg-transparent py-2" />
              <input type="number" min="1" value={room.totalUnits} onChange={(event) => update(room.id, "totalUnits", event.target.value)} className="border-b border-[var(--dd-gold)]/30 bg-transparent py-2" aria-label="Total units" />
              <input type="number" min="0" value={room.basePriceInr} onChange={(event) => update(room.id, "basePriceInr", event.target.value)} className="border-b border-[var(--dd-gold)]/30 bg-transparent py-2" aria-label="Base price" />
              <input value={room.image} onChange={(event) => update(room.id, "image", event.target.value)} className="border-b border-[var(--dd-gold)]/30 bg-transparent py-2" aria-label="Image path" />
            </div>
            <textarea value={room.description} onChange={(event) => update(room.id, "description", event.target.value)} className="mt-3 min-h-20 w-full border border-[var(--dd-gold)]/20 bg-transparent p-2 text-sm" />
            <button type="button" onClick={() => void save(room)} className="mt-3 border border-[var(--dd-gold)]/60 px-3 py-2 text-[10px] uppercase tracking-[0.14em]">Save room</button>
          </div>
        ))}
      </div>
    </section>
  );
}
