"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { readJson } from "@/lib/http";

type Room = { id: string; name: string; description: string; image: string; basePriceInr: number; totalUnits: number };

export function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/rooms")
      .then(async (response) => {
        const data = await readJson<{ rooms: Room[] }>(response);
        if (!response.ok) throw new Error(data.error || "Could not load rooms");
        setRooms(data.rooms ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load rooms"));
  }, []);

  function update(id: string, field: keyof Room, value: string) {
    setSaved((s) => ({ ...s, [id]: "" }));
    setRooms((current) =>
      current.map((room) =>
        room.id === id
          ? { ...room, [field]: field === "basePriceInr" || field === "totalUnits" ? Number(value) : value }
          : room,
      ),
    );
  }

  async function save(room: Room) {
    setBusy(room.id);
    const response = await fetch("/api/admin/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(room),
    });
    const data = await readJson(response);
    setSaved((s) => ({ ...s, [room.id]: response.ok ? "Saved" : data.error || "Could not save" }));
    setBusy(null);
  }

  const thumb = (r: Room) => (r.id.includes("suite") ? "/images/story/suite.jpg" : "/images/story/bedroom.jpg");

  return (
    <section className="mt-10">
      {error && <p role="alert" className="mb-6 border-l-2 border-[#f0a493] pl-3 text-sm text-[#f0a493]">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        {rooms.map((room) => (
          <article key={room.id} className="grid grid-cols-[6rem_1fr] gap-5 border border-[var(--dd-line-dark)] bg-[var(--dd-night-2)]/60 p-5">
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image src={thumb(room)} alt="" fill sizes="96px" className="object-cover" />
            </div>
            <div className="space-y-4">
              <label className="dd-field">
                <span className="dd-field-label">Name</span>
                <input value={room.name} onChange={(e) => update(room.id, "name", e.target.value)} className="dd-input !mt-1 !py-2 font-[family-name:var(--font-display)] !text-xl" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="dd-field">
                  <span className="dd-field-label">Rate / night (₹)</span>
                  <input type="number" min="0" value={room.basePriceInr} onChange={(e) => update(room.id, "basePriceInr", e.target.value)} className="dd-input !mt-1 !py-2" />
                </label>
                <label className="dd-field">
                  <span className="dd-field-label">Rooms of this type</span>
                  <input type="number" min="1" value={room.totalUnits} onChange={(e) => update(room.id, "totalUnits", e.target.value)} className="dd-input !mt-1 !py-2" />
                </label>
              </div>
              <label className="dd-field">
                <span className="dd-field-label">Description</span>
                <textarea value={room.description} onChange={(e) => update(room.id, "description", e.target.value)} rows={2} className="dd-input !mt-1 resize-none !py-2 !text-sm" />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[12px] ${saved[room.id] === "Saved" ? "text-[var(--dd-gold)]" : "text-[#f0a493]"}`}>
                  {saved[room.id] === "Saved" ? "✓ Saved" : saved[room.id]}
                </span>
                <button type="button" disabled={busy === room.id} onClick={() => void save(room)} className="dd-btn dd-btn--sm">
                  {busy === room.id ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
