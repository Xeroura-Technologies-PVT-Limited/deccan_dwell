"use client";

import Image from "next/image";
import { useState } from "react";
import { useDesk } from "./store";
import { Btn, Card, ConfirmBtn, Empty, Field, inputCls, useToast } from "./ui";
import { addCalendarDays, fmtDay, isLive, rupees, todayISO, type AdminRoom } from "./lib";

export function RoomsView() {
  const desk = useDesk();
  const today = todayISO();
  const blocks = desk.bookings
    .filter((b) => b.status === "blocked" && b.checkOut > today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        {desk.rooms.length === 0 && <Empty>Loading rooms…</Empty>}
        {desk.rooms.map((r) => <RoomCard key={r.id} room={r} />)}
      </div>
      <div className="space-y-4">
        <BlockForm />
        <Card title="Blocked rooms" pad={false}>
          {blocks.length === 0 ? (
            <div className="p-5"><Empty>No rooms are blocked.</Empty></div>
          ) : (
            <ul className="divide-y divide-[var(--a-line)]">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                  <span>
                    <span className="block font-medium">{b.roomName} · {b.guestName}</span>
                    <span className="block text-[12px] text-[var(--a-muted)]">{fmtDay(b.checkIn)} → {fmtDay(b.checkOut)}</span>
                  </span>
                  <ConfirmBtn size="sm" label="Release" confirmLabel="Release?" onConfirm={() => desk.patchBooking(b.id, { action: "cancel" }, "Room released")} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: AdminRoom }) {
  const desk = useDesk();
  const [form, setForm] = useState({ name: room.name, basePriceInr: String(room.basePriceInr), totalUnits: String(room.totalUnits), description: room.description });
  const [saving, setSaving] = useState(false);
  const dirty =
    form.name !== room.name ||
    Number(form.basePriceInr) !== room.basePriceInr ||
    Number(form.totalUnits) !== room.totalUnits ||
    form.description !== room.description;
  const today = todayISO();
  const tonight = desk.bookings.filter((b) => b.roomTypeId === room.id && isLive(b) && b.checkIn <= today && b.checkOut > today).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--a-line)] bg-white">
      <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
        <div className="relative h-40 sm:h-full">
          <Image src={room.image} alt={room.name} fill sizes="180px" className="object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-medium">
            {Math.max(0, room.totalUnits - tonight)} of {room.totalUnits} free tonight
          </span>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
            <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Rate per night (₹)"><input className={inputCls} type="number" min={0} value={form.basePriceInr} onChange={(e) => setForm({ ...form, basePriceInr: e.target.value })} /></Field>
            <Field label="Rooms of this type"><input className={inputCls} type="number" min={1} value={form.totalUnits} onChange={(e) => setForm({ ...form, totalUnits: e.target.value })} /></Field>
          </div>
          <Field label="Description">
            <textarea className={`${inputCls} h-auto min-h-[64px] py-2`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-[var(--a-muted)]">New bookings use this rate. Existing bookings keep their price.</p>
            <Btn
              variant="primary"
              size="sm"
              disabled={!dirty || saving}
              onClick={async () => {
                setSaving(true);
                await desk.saveRoom({ id: room.id, name: form.name.trim(), basePriceInr: Number(form.basePriceInr), totalUnits: Number(form.totalUnits), description: form.description.trim() });
                setSaving(false);
              }}
            >
              {saving ? "Saving…" : dirty ? `Save · ${rupees(Number(form.basePriceInr) || 0)}` : "Saved"}
            </Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlockForm() {
  const desk = useDesk();
  const toast = useToast();
  const today = todayISO();
  const [f, setF] = useState({ roomTypeId: "", checkIn: today, checkOut: addCalendarDays(today, 1), units: "1", reason: "Maintenance" });
  const [busy, setBusy] = useState(false);
  const roomId = f.roomTypeId || desk.rooms[0]?.id || "";
  return (
    <Card title="Block rooms">
      <p className="mb-4 text-[12.5px] text-[var(--a-muted)]">Take rooms off sale for maintenance, owner use or private events. Blocked nights can&apos;t be booked online.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Room type">
          <select className={inputCls} value={roomId} onChange={(e) => setF({ ...f, roomTypeId: e.target.value })}>
            {desk.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Rooms"><input className={inputCls} type="number" min={1} value={f.units} onChange={(e) => setF({ ...f, units: e.target.value })} /></Field>
        <Field label="From"><input className={inputCls} type="date" value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></Field>
        <Field label="Until (morning of)"><input className={inputCls} type="date" value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Field label="Reason"><input className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        </div>
      </div>
      <Btn
        variant="primary"
        className="mt-4 w-full"
        disabled={busy || !roomId || f.checkOut <= f.checkIn}
        onClick={async () => {
          setBusy(true);
          const ok = await desk.createBooking({ kind: "block", roomTypeId: roomId, checkIn: f.checkIn, checkOut: f.checkOut, units: Number(f.units) || 1, reason: f.reason.trim() || "Out of order" });
          setBusy(false);
          if (ok) toast(`Blocked ${Number(f.units) || 1} room${Number(f.units) > 1 ? "s" : ""}`);
        }}
      >
        {busy ? "Blocking…" : "Block these nights"}
      </Btn>
    </Card>
  );
}
