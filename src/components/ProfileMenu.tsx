"use client";

import { readJson } from "@/lib/http";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";

export function ProfileMenu({ variant = "default" }: { variant?: "default" | "header" }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then((res) => readJson(res))
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

  if (!user && variant === "header") {
    return (
      <a
        href="/login"
        aria-label="Sign in"
        className="group flex h-10 items-center gap-2.5 text-[var(--dd-cream)]/85 transition-colors duration-500 hover:text-[var(--dd-gold)]"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="12" cy="8.5" r="3.6" />
          <path d="M4.8 19.6c1.3-3.3 4-5 7.2-5s5.9 1.7 7.2 5" strokeLinecap="round" />
        </svg>
        <span className="relative hidden font-[family-name:var(--font-nav)] text-[10.5px] font-medium uppercase tracking-[0.26em] md:block">
          Sign in
          <span className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:origin-left group-hover:scale-x-100" />
        </span>
      </a>
    );
  }

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
