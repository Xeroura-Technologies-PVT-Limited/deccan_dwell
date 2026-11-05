"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { STATUS } from "./lib";

const EASE = [0.16, 1, 0.3, 1] as const;

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md";
};

export function Btn({ variant = "secondary", size = "md", className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-10 px-4 text-[13.5px]",
        variant === "primary" && "bg-[#0b3d33] text-white hover:bg-[#0e4a3f]",
        variant === "gold" && "bg-[#b48a3c] text-white hover:bg-[#a07c35]",
        variant === "secondary" && "border border-[var(--a-line)] bg-white text-[var(--a-ink)] hover:border-[#0b3d33]/40 hover:bg-[#fbfaf6]",
        variant === "ghost" && "text-[var(--a-muted)] hover:bg-black/[0.04] hover:text-[var(--a-ink)]",
        variant === "danger" && "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
        className,
      )}
    />
  );
}

/** Two-step button for destructive or final actions — no browser dialogs. */
export function ConfirmBtn({ label, confirmLabel = "Confirm?", onConfirm, ...rest }: Omit<BtnProps, "onClick"> & { label: ReactNode; confirmLabel?: ReactNode; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <Btn
      {...rest}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </Btn>
  );
}

export function StatusPill({ status }: { status: string }) {
  const meta = STATUS[status] ?? { label: status, tone: "bg-stone-100 text-stone-600 ring-stone-200" };
  return (
    <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-medium ring-1 ring-inset", meta.tone)}>
      {meta.label}
    </span>
  );
}

export function PaidPill({ paid, due }: { paid: boolean; due: number }) {
  if (paid) return <span className="inline-flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-[11.5px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">Paid</span>;
  if (due > 0) return <span className="inline-flex h-6 items-center rounded-full bg-amber-50 px-2.5 text-[11.5px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">Due ₹{due.toLocaleString("en-IN")}</span>;
  return <span className="text-[12px] text-[var(--a-muted)]">—</span>;
}

export function Card({ title, action, children, className, pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx("rounded-2xl border border-[var(--a-line)] bg-white shadow-[0_1px_2px_rgba(16,40,34,0.04)]", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--a-line)] px-5 py-3.5">
          <h3 className="text-[13.5px] font-semibold text-[var(--a-ink)]">{title}</h3>
          {action}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className={cx("rounded-2xl border p-4", accent ? "border-[#0b3d33] bg-[#0b3d33] text-white" : "border-[var(--a-line)] bg-white")}>
      <p className={cx("text-[11.5px] font-medium uppercase tracking-[0.08em]", accent ? "text-white/60" : "text-[var(--a-muted)]")}>{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-[30px] leading-none tracking-tight">{value}</p>
      {hint && <p className={cx("mt-2 text-[12px]", accent ? "text-white/70" : "text-[var(--a-muted)]")}>{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[var(--a-line)] px-4 py-6 text-center text-[13px] text-[var(--a-muted)]">{children}</p>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[var(--a-muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-[var(--a-muted)]">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-[var(--a-line)] bg-white px-3 text-[13.5px] text-[var(--a-ink)] outline-none transition placeholder:text-stone-400 focus:border-[#0b3d33] focus:ring-2 focus:ring-[#0b3d33]/10";

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-[#efebe2] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition",
            value === o.value ? "bg-white text-[var(--a-ink)] shadow-sm" : "text-[var(--a-muted)] hover:text-[var(--a-ink)]",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="rounded-full bg-black/[0.06] px-1.5 text-[11px] tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Right-hand panel. Escape or the backdrop closes it. */
export function Drawer({ open, onClose, children, width = 520 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div className="absolute inset-0 bg-[#0b2a24]/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-[var(--a-bg)] shadow-2xl"
            style={{ maxWidth: width }}
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { duration: 0.45, ease: EASE } }}
            exit={{ x: "100%", transition: { duration: 0.3, ease: EASE } }}
          >
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, title, children, width = 620 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <motion.div className="fixed inset-0 bg-[#0b2a24]/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative my-8 w-full rounded-2xl bg-white shadow-2xl"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
          >
            <header className="flex items-center justify-between border-b border-[var(--a-line)] px-6 py-4">
              <h2 className="font-[family-name:var(--font-display)] text-[24px] text-[var(--a-ink)]">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-[var(--a-muted)] hover:bg-black/5">✕</button>
            </header>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = next.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className={cx(
                "rounded-xl px-4 py-3 text-[13.5px] shadow-xl",
                t.tone === "ok" ? "bg-[#0b2a24] text-white" : "bg-rose-600 text-white",
              )}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
