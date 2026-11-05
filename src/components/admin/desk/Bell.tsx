"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useDesk } from "./store";
import { cx } from "./ui";
import { chime, primeAudio } from "./notify";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function Bell() {
  const desk = useDesk();
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const ref = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState(0);
  const lastUnread = useRef(desk.unread);

  useEffect(() => {
    const id = window.setTimeout(() => setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Swing the bell whenever something new arrives.
  useEffect(() => {
    if (desk.unread > lastUnread.current) {
      const id = window.setTimeout(() => setRing((r) => r + 1), 0);
      lastUnread.current = desk.unread;
      return () => window.clearTimeout(id);
    }
    lastUnread.current = desk.unread;
  }, [desk.unread]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Notifications${desk.unread ? `, ${desk.unread} new` : ""}`}
        onClick={() => {
          primeAudio();
          setOpen((v) => !v);
        }}
        className="relative grid h-10 w-10 place-items-center rounded-lg border border-[var(--a-line)] bg-white text-[var(--a-ink)] transition hover:border-[#0b3d33]/40"
      >
        <motion.svg
          key={ring}
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px] origin-top"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={ring ? { rotate: 0 } : false}
          animate={ring ? { rotate: [0, 16, -14, 10, -6, 3, 0] } : undefined}
          transition={{ duration: 1.1, ease: "easeOut" }}
          aria-hidden
        >
          <path d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
          <path d="M10 19a2 2 0 004 0" />
        </motion.svg>
        <AnimatePresence>
          {desk.unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#b48a3c] px-1 text-[11px] font-semibold text-white ring-2 ring-[var(--a-bg)]"
            >
              {desk.unread > 9 ? "9+" : desk.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[var(--a-line)] bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-[var(--a-line)] px-4 py-3">
              <p className="text-[14px] font-semibold">Notifications</p>
              <div className="flex items-center gap-3 text-[12px]">
                <button type="button" className="text-[var(--a-muted)] hover:text-[var(--a-ink)]" onClick={() => desk.setMuted(!desk.muted)}>
                  {desk.muted ? "Sound off" : "Sound on"}
                </button>
                {desk.unread > 0 && (
                  <button type="button" className="font-medium text-[#0b3d33]" onClick={() => desk.markRead()}>
                    Mark all read
                  </button>
                )}
              </div>
            </header>
            <ul className="max-h-[60vh] divide-y divide-[var(--a-line)] overflow-y-auto">
              {desk.notices.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-[var(--a-muted)]">No notifications yet. New website bookings and guest requests will appear here, with a chime.</li>}
              {desk.notices.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      desk.markRead(n.id);
                      if (n.bookingId) desk.openBooking(n.bookingId);
                      setOpen(false);
                    }}
                    className={cx("flex w-full gap-3 px-4 py-3 text-left hover:bg-[#fbfaf6]", !n.read && "bg-[#fbf6ea]")}
                  >
                    <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : n.kind === "request" ? "bg-amber-500" : "bg-[#0b3d33]")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium">{n.title}</span>
                      <span className="block truncate text-[12.5px] text-[var(--a-muted)]">{n.body}</span>
                      <span className="mt-0.5 block text-[11.5px] text-[var(--a-muted)]">{ago(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <footer className="flex items-center justify-between gap-3 border-t border-[var(--a-line)] bg-[#faf8f3] px-4 py-2.5 text-[12px] text-[var(--a-muted)]">
              {perm === "granted" ? (
                <span>Desktop alerts are on.</span>
              ) : perm === "unsupported" ? (
                <span>Keep this tab open to hear new bookings.</span>
              ) : (
                <button
                  type="button"
                  className="font-medium text-[#0b3d33]"
                  onClick={async () => {
                    try {
                      const p = await Notification.requestPermission();
                      setPerm(p);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  Turn on desktop alerts
                </button>
              )}
              <button type="button" className="hover:text-[var(--a-ink)]" onClick={() => chime()}>
                Test sound
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
