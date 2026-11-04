import Image from "next/image";
import Link from "next/link";
import { HOTEL } from "@/lib/hotel";
import { Reveal, RevealImage } from "@/components/site/Reveal";
import { WordmarkRise } from "@/components/site/WordmarkRise";

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${HOTEL.name}, ${HOTEL.address}`,
)}`;

export function ContactSection() {
  return (
    <section id="contact" className="dd-night dd-section relative overflow-hidden border-b border-[var(--dd-line-dark)]">
      <div className="dd-container grid gap-16 md:grid-cols-12 md:items-center md:gap-10">
        <div className="md:col-span-6">
          <Reveal>
            <p className="dd-eyebrow">Find us</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="dd-h2 mt-7">
              Visit <em>Deccan Dwell</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <address className="dd-lead mt-8 max-w-[26rem] not-italic text-[var(--dd-cream)]">
              {HOTEL.address}
            </address>
          </Reveal>
          <Reveal delay={0.14} className="mt-10 flex flex-wrap items-center gap-6">
            <a href={MAPS_URL} target="_blank" rel="noreferrer" data-magnetic className="dd-btn">
              Get directions <span className="dd-arrow" aria-hidden>→</span>
            </a>
            <a href="#book" className="dd-link text-[var(--dd-cream)]">
              Reserve a stay
            </a>
          </Reveal>

          <Reveal delay={0.18}>
            <dl className="mt-14 grid gap-8 border-t border-[var(--dd-line-dark)] pt-8 sm:grid-cols-2">
              <div>
                <dt className="dd-meta !text-[10px] text-[var(--dd-gold)]">Call</dt>
                <dd className="mt-3 space-y-1 font-[family-name:var(--font-display)] text-[1.4rem]">
                  {HOTEL.phones.map((phone) => (
                    <a key={phone.href} href={phone.href} className="block transition-colors hover:text-[var(--dd-gold)]">
                      {phone.label}
                    </a>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="dd-meta !text-[10px] text-[var(--dd-gold)]">Write</dt>
                <dd className="mt-3 font-[family-name:var(--font-display)] text-[1.4rem]">
                  <a href={`mailto:${HOTEL.email}`} className="break-all transition-colors hover:text-[var(--dd-gold)]">
                    {HOTEL.email}
                  </a>
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <div className="md:col-span-5 md:col-start-8">
          <RevealImage
            src="/images/building-exterior-hd.jpg"
            alt="The Deccan Dwell building on Chamundi Hills Road"
            sizes="(max-width: 768px) 92vw, 38vw"
            className="dd-arch aspect-[3/4] w-full"
            objectPosition="40% 50%"
            zoom={{ scale: 1.5, origin: "38% 24%" }}
          />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="dd-night relative overflow-hidden pt-[clamp(80px,10vw,140px)]">
      <div className="dd-container">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="relative h-[72px] w-[280px] md:h-[86px] md:w-[336px]">
              <Image
                src="/images/logo.png"
                alt="Deccan Dwell — Home away from home"
                fill
                sizes="340px"
                className="object-contain object-left"
              />
            </div>
            <p className="dd-body mt-8 max-w-[22rem]">
              Rooms and three-bedroom suites at the foothills of Chamundi Hills, Mysuru.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 md:col-span-6 md:col-start-7 md:grid-cols-3">
            <div>
              <p className="dd-meta !text-[10px] text-[var(--dd-gold)]">Stay</p>
              <ul className="mt-5 space-y-3 font-[family-name:var(--font-body)] text-[15px] font-light text-[var(--dd-cream)]/80">
                <li><a href="#rooms" className="hover:text-[var(--dd-gold)]">Rooms &amp; Suites</a></li>
                <li><a href="#book" className="hover:text-[var(--dd-gold)]">Reserve</a></li>
                <li><Link href="/booking/lookup" className="hover:text-[var(--dd-gold)]">Find a booking</Link></li>
              </ul>
            </div>
            <div>
              <p className="dd-meta !text-[10px] text-[var(--dd-gold)]">Discover</p>
              <ul className="mt-5 space-y-3 font-[family-name:var(--font-body)] text-[15px] font-light text-[var(--dd-cream)]/80">
                <li><a href="#experience" className="hover:text-[var(--dd-gold)]">Experience</a></li>
                <li><a href="#mysuru" className="hover:text-[var(--dd-gold)]">Mysuru</a></li>
                <li><a href="#gallery" className="hover:text-[var(--dd-gold)]">Gallery</a></li>
              </ul>
            </div>
            <div>
              <p className="dd-meta !text-[10px] text-[var(--dd-gold)]">Guests</p>
              <ul className="mt-5 space-y-3 font-[family-name:var(--font-body)] text-[15px] font-light text-[var(--dd-cream)]/80">
                <li><Link href="/login" className="hover:text-[var(--dd-gold)]">Sign in</Link></li>
                <li><Link href="/signup" className="hover:text-[var(--dd-gold)]">Create an account</Link></li>
                <li><a href="#contact" className="hover:text-[var(--dd-gold)]">Contact</a></li>
              </ul>
            </div>
          </nav>
        </div>

        <WordmarkRise
          text="Deccan Dwell"
          className="pointer-events-none mt-[clamp(64px,9vw,128px)] select-none whitespace-nowrap text-center font-[family-name:var(--font-display)] text-[clamp(3.4rem,14vw,13.5rem)] leading-[0.95] tracking-[-0.02em] text-[var(--dd-cream)]/[0.08]"
        />

        <div className="flex flex-col items-center gap-3 border-t border-[var(--dd-line-dark)] py-8 text-center md:flex-row md:justify-between md:text-left">
          <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.26em] text-[var(--dd-cream)]/45">
            © {year} Deccan Dwell · Mysuru
          </p>
          <p className="font-[family-name:var(--font-script)] text-xl text-[var(--dd-gold)]">
            Home away from home
          </p>
        </div>

        <div className="flex justify-center border-t border-[var(--dd-line-dark)] py-6">
          <a
            href="https://www.xeroura.com/"
            target="_blank"
            rel="noopener"
            aria-label="Built by Xeroura Technologies"
            className="group flex items-center gap-3 opacity-50 transition-opacity duration-700 hover:opacity-90"
          >
            <span className="font-[family-name:var(--font-nav)] text-[10.5px] uppercase tracking-[0.32em] text-[var(--dd-cream)]/80">
              Built by
            </span>
            <Image
              src="/images/xeroura-logo.png"
              alt=""
              width={40}
              height={22}
              unoptimized
              className="h-[20px] w-auto saturate-[0.75] transition-[filter] duration-700 group-hover:saturate-100"
            />
            <span className="font-[family-name:var(--font-nav)] text-[10.5px] uppercase tracking-[0.32em] text-[var(--dd-cream)]/80">
              Xeroura
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
