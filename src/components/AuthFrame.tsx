import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Split-screen frame for sign-in, sign-up and the hotel desk login: the
 * palace gate in an arch on the left, a quiet form on the right.
 */
export function AuthFrame({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="dd-night grid min-h-[100svh] lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/hero-gate-graded-2000.jpg"
          alt=""
          fill
          preload
          sizes="52vw"
          className="object-cover object-[50%_46%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,22,19,0.55)_0%,rgba(6,22,19,0.15)_45%,rgba(6,22,19,0.75)_100%)]" />
        <div className="absolute inset-x-12 bottom-12">
          <p className="dd-eyebrow dd-eyebrow--plain text-[var(--dd-cream)]/80">Chamundi Hills · Mysuru</p>
          <p className="mt-4 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(2.4rem,3.6vw,3.6rem)] leading-[1.05] text-[var(--dd-cream)]">
            A home away <em className="text-[var(--dd-gold)]">from home.</em>
          </p>
        </div>
      </aside>

      <section className="flex flex-col px-[var(--dd-gutter)] py-10">
        <div className="flex items-center justify-between">
          <Link href="/?intro=0" className="relative block h-[46px] w-[180px]" aria-label="Deccan Dwell — home">
            <Image src="/images/logo.png" alt="Deccan Dwell" fill sizes="180px" className="object-contain object-left" />
          </Link>
          <Link href="/?intro=0" className="dd-link text-[var(--dd-cream)]/75 hover:text-[var(--dd-gold)]">
            ← Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
          <p className="dd-eyebrow">{kicker}</p>
          <h1 className="dd-h2 mt-6">{title}</h1>
          {subtitle && <p className="dd-body mt-4">{subtitle}</p>}
          <div className="mt-10">{children}</div>
        </div>

        <p className="text-center font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.24em] text-[var(--dd-cream)]/35">
          © {new Date().getFullYear()} Deccan Dwell · Mysuru
        </p>
      </section>
    </main>
  );
}

export const fieldClass = "dd-input";

export const labelClass = "dd-field-label";

export const buttonClass = "dd-btn dd-btn--solid w-full";
