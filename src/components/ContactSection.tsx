export function ContactSection() {
  return (
    <section
      id="contact"
      className="border-t border-[var(--dd-gold)]/15 bg-[var(--dd-green-deep)] px-6 py-24 md:px-10 lg:px-14"
    >
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-12 md:flex-row md:items-end">
        <div>
          <p className="font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
            Contact
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--dd-cream)] md:text-5xl">
            Visit Deccan Dwell
          </h2>
          <p className="mt-4 max-w-md font-[family-name:var(--font-body)] text-[var(--dd-cream)]/70">
            Mysuru, Karnataka — at the foothills of Chamundi Hills.
            <br />
            Home away from home.
          </p>
        </div>
        <div className="space-y-3 font-[family-name:var(--font-body)] text-sm text-[var(--dd-cream)]/80">
          <p>
            <a
              href="mailto:stay@deccandwell.com"
              className="transition hover:text-[var(--dd-gold)]"
            >
              stay@deccandwell.com
            </a>
          </p>
          <p>
            <a href="tel:+919999999999" className="transition hover:text-[var(--dd-gold)]">
              +91 99999 99999
            </a>
          </p>
          <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
            Replace with client details
          </p>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="flex flex-col items-start justify-between gap-6 bg-[var(--dd-green)] px-6 py-10 md:flex-row md:items-center md:px-10 lg:px-14">
      <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.25em] text-[var(--dd-cream)]/50">
        © {new Date().getFullYear()} Deccan Dwell · Mysuru
      </p>
      <p className="font-[family-name:var(--font-script)] text-lg text-[var(--dd-gold)]">
        Home away from home
      </p>
    </footer>
  );
}
