"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";

export function ProfileMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <a
        href="/login"
        className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-cream)]/80 transition hover:text-[var(--dd-gold)]"
      >
        Sign in
      </a>
    );
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Profile"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--dd-gold)] font-[family-name:var(--font-nav)] text-[11px] tracking-[0.08em] text-[var(--dd-gold)] transition hover:bg-[var(--dd-gold)] hover:text-[var(--dd-green)]"
      >
        {initials || "•"}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 min-w-[11rem] border border-[var(--dd-gold)]/30 bg-[var(--dd-hero-base)] px-4 py-3 shadow-xl">
          <p className="mb-3 font-[family-name:var(--font-body)] text-xs text-[var(--dd-cream)]/70">
            {user.name}
          </p>
          {user.role === "admin" ? (
            <a
              href="/admin"
              className="block py-1.5 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-gold)]"
            >
              Bookings desk
            </a>
          ) : (
            <a
              href="/account"
              className="block py-1.5 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-gold)]"
            >
              My stays
            </a>
          )}
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth", { method: "DELETE" });
              window.location.href = "/?intro=0";
            }}
            className="mt-1 block py-1.5 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-cream)]/70"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
