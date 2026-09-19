import Link from "next/link";

export function AuthFrame({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--dd-hero-base)] px-6 py-16 text-[var(--dd-cream)] md:px-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.28em] text-[var(--dd-gold)]"
        >
          Deccan Dwell
        </Link>
        <p className="mt-10 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
          {kicker}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl">
          {title}
        </h1>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}

export const fieldClass =
  "mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 font-[family-name:var(--font-body)] text-[var(--dd-cream)] outline-none";

export const labelClass =
  "font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]";

export const buttonClass =
  "border border-[var(--dd-gold)] px-6 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] text-[var(--dd-cream)] transition hover:bg-[var(--dd-gold)] hover:text-[var(--dd-green)] disabled:opacity-50";
