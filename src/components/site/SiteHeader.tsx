"use client";

import Image from "next/image";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProfileMenu } from "@/components/ProfileMenu";
import { HOTEL } from "@/lib/hotel";
import { getLenis, scrollToTarget } from "@/lib/smooth-scroll";

type NavLink = {
  label: string;
  href: string;
  note: string;
  image: string;
  position: string;
  zoom?: number;
};

export const NAV_LINKS: NavLink[] = [
  {
    label: "Rooms & Suites",
    href: "#rooms",
    note: "Calm rooms for two, three-bedroom suites for families",
    image: "/images/story/bedroom.jpg",
    position: "60% 50%",
  },
  {
    label: "Experience",
    href: "#experience",
    note: "Unhurried days at the foot of Chamundi Hills",
    image: "/images/hero-gate-graded-1200.jpg",
    position: "50% 50%",
  },
  {
    label: "Mysuru",
    href: "#mysuru",
    note: "Palaces, temples and gardens, a short drive away",
    image: "/images/places/palace.jpg",
    position: "50% 45%",
  },
  {
    label: "Gallery",
    href: "#gallery",
    note: "Frames from the house",
    image: "/images/story/suite.jpg",
    position: "50% 55%",
  },
  {
    label: "Contact",
    href: "#contact",
    note: "Chamundi Hills Road, Mysuru",
    image: "/images/building-exterior-hd.jpg",
    position: "40% 30%",
    zoom: 1.45,
  },
];

/**
 * - `top`: at the very top — transparent and generous.
 * - `clear`: scrolled back up while still over the hero — transparent, compact.
 * - `solid`: over the page content — the frosted bar.
 */
type Mode = "top" | "clear" | "solid";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_INOUT = [0.76, 0, 0.24, 1] as const;

/**
 * Minimal luxury header: logo on the left, Reserve + Menu on the right, and
 * nothing in the middle — the arch owns the centre of the hero.
 *
 * Over the hero it is transparent and generous. It slips away while you
 * scroll down and returns as a frosted bar when you scroll up. "Menu" opens a
 * full-screen index of the site with a photograph for each destination.
 */
export function SiteHeader() {
  const [mode, setMode] = useState<Mode>("top");
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  /** How far the bar is tucked up (0 = shown, 1 = fully hidden). Follows the scroll 1:1. */
  const tuck = useMotionValue(0);
  const tuckY = useMotionValue("0%");
  const headerRef = useRef<HTMLElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    const unsub = tuck.on("change", (v) => tuckY.set(`${-v * 100}%`));
    return unsub;
  }, [tuck, tuckY]);

  useEffect(() => {
    let raf = 0;
    let idle = 0;
    let snap: ReturnType<typeof animate> | null = null;
    // The hero stays pinned until the Welcome curtain has fully covered it;
    // until then the header floats over imagery and never needs a bar.
    let heroEnd = Infinity;
    const measure = () => {
      const hero = document.getElementById("home");
      heroEnd = hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight - 8 : 0;
    };
    const settle = () => {
      // When the scroll stops half-way, finish the motion instead of leaving the bar cut off.
      const v = tuck.get();
      if (v > 0 && v < 1) snap = animate(tuck, v > 0.5 ? 1 : 0, { duration: 0.45, ease: [0.16, 1, 0.3, 1] });
    };
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      const h = headerRef.current?.offsetHeight || 76;
      snap?.stop();
      if (openRef.current || y < 12) {
        tuck.set(0);
      } else if (y > 90 || delta < 0) {
        tuck.set(Math.min(1, Math.max(0, tuck.get() + delta / h)));
      }
      setMode(() => {
        if (y < 12) return "top";
        return y > heroEnd ? "solid" : "clear";
      });
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, 140);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      snap?.stop();
    };
  }, [tuck]);

  useEffect(() => {
    openRef.current = open;
    if (open) animate(tuck, 0, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
  }, [open, tuck]);

  const close = useCallback(() => {
    setOpen(false);
    menuButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const lenis = getLenis();
    const root = document.documentElement;
    if (open) {
      lenis?.stop();
      root.style.overflow = "hidden";
    } else {
      lenis?.start();
      root.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const atTop = mode === "top";

  return (
    <>
      <motion.header
        ref={headerRef}
        style={{ y: tuckY }}
        className={`fixed inset-x-0 top-0 z-[60] border-b transition-[background-color,border-color,backdrop-filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mode === "solid" && !open
            ? "border-[var(--dd-line-dark)] bg-[color-mix(in_oklab,var(--dd-night)_86%,transparent)] backdrop-blur-xl"
            : "border-transparent bg-transparent backdrop-blur-0"
        }`}
      >
        <div className="dd-enter dd-enter-down dd-delay-4">
        <div
          className={`flex items-center justify-between gap-6 px-[var(--dd-gutter)] transition-[height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            atTop || open ? "h-[88px] md:h-[108px]" : "h-[68px] md:h-[76px]"
          }`}
        >
          <a
            href="#home"
            aria-label="Deccan Dwell — back to top"
            className={`relative block shrink-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              atTop || open
                ? "h-[46px] w-[180px] md:h-[60px] md:w-[236px]"
                : "h-[38px] w-[148px] md:h-[44px] md:w-[172px]"
            }`}
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              const lenis = getLenis();
              if (lenis) lenis.scrollTo(0, { duration: 1.8 });
              else window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Image
              src="/images/logo.png"
              alt="Deccan Dwell — Home away from home"
              fill
              preload
              className="object-contain object-left"
              sizes="240px"
            />
          </a>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className={`transition-opacity duration-500 ${open ? "pointer-events-none opacity-0" : "opacity-100"}`}>
              <ProfileMenu variant="header" />
            </div>
            <a
              href="#book"
              data-magnetic
              onClick={() => setOpen(false)}
              className={`dd-btn dd-btn--sm !min-h-[40px] !px-4 sm:!px-6 transition-opacity duration-500 ${
                open ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              Reserve
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              data-magnetic
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="dd-menu"
              onClick={() => setOpen((v) => !v)}
              className="group flex h-10 items-center gap-3 pl-1 text-[var(--dd-cream)]"
            >
              <span className="relative hidden h-[14px] overflow-hidden font-[family-name:var(--font-nav)] text-[10.5px] font-medium uppercase leading-[14px] tracking-[0.26em] sm:block">
                <span
                  className={`block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    open ? "-translate-y-1/2" : "translate-y-0"
                  }`}
                >
                  <span className="block h-[14px]">Menu</span>
                  <span className="block h-[14px]">Close</span>
                </span>
              </span>
              <span className="relative block h-10 w-10 rounded-full border border-[var(--dd-cream)]/30 transition-colors duration-500 group-hover:border-[var(--dd-gold)]">
                <span
                  className={`absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    open ? "rotate-45" : "-translate-y-[3px]"
                  }`}
                />
                <span
                  className={`absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    open ? "-rotate-45" : "translate-y-[3px]"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
        </div>
      </motion.header>

      <AnimatePresence>{open && <MenuOverlay onClose={close} />}</AnimatePresence>
    </>
  );
}

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(0);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const link = NAV_LINKS[active];

  useEffect(() => {
    const id = window.setTimeout(() => firstLinkRef.current?.focus({ preventScroll: true }), 450);
    return () => window.clearTimeout(id);
  }, []);

  const go = (href: string) => {
    onClose();
    window.setTimeout(() => scrollToTarget(href), 520);
  };

  return (
    <motion.div
      id="dd-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--dd-night)] text-[var(--dd-cream)]"
      initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.95, ease: EASE_INOUT } }}
      exit={{ clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.75, ease: EASE_INOUT, delay: 0.1 } }}
      data-lenis-prevent
    >
      <div className="dd-container grid min-h-[100svh] grid-cols-1 gap-12 pb-10 pt-[120px] md:pt-[140px] lg:grid-cols-12 lg:gap-10">
        {/* Index */}
        <nav aria-label="Menu" className="flex flex-col justify-center lg:col-span-7">
          <ol>
            {NAV_LINKS.map((item, i) => (
              <li key={item.href} className="overflow-hidden">
                <motion.a
                  ref={i === 0 ? firstLinkRef : undefined}
                  href={item.href}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.href);
                  }}
                  className="group flex items-baseline gap-5 py-1.5 outline-none md:gap-8"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%", transition: { duration: 1, delay: 0.32 + i * 0.07, ease: EASE_OUT } }}
                  exit={{ y: "110%", transition: { duration: 0.45, ease: EASE_INOUT } }}
                >
                  <span
                    className={`w-8 shrink-0 font-[family-name:var(--font-display)] text-lg italic transition-colors duration-500 ${
                      active === i ? "text-[var(--dd-gold)]" : "text-[var(--dd-cream)]/30"
                    }`}
                  >
                    {["i.", "ii.", "iii.", "iv.", "v."][i]}
                  </span>
                  <span
                    className={`font-[family-name:var(--font-display)] text-[clamp(2.6rem,6.2vw,5.6rem)] leading-[1.06] tracking-[-0.01em] transition-[color,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      active === i
                        ? "translate-x-3 text-[var(--dd-cream)]"
                        : "text-[var(--dd-cream)]/35 group-hover:text-[var(--dd-cream)]/70"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.a>
              </li>
            ))}
          </ol>

          <motion.div
            className="mt-12 flex flex-wrap items-center gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.75, duration: 0.8, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <a
              href="#book"
              onClick={(e) => {
                e.preventDefault();
                go("#book");
              }}
              className="dd-btn dd-btn--solid"
            >
              Reserve your stay <span className="dd-arrow" aria-hidden>→</span>
            </a>
            <ProfileMenu />
          </motion.div>
        </nav>

        {/* Picture for the hovered destination */}
        <div className="hidden lg:col-span-4 lg:col-start-9 lg:flex lg:flex-col lg:justify-center">
          <motion.div
            className="dd-arch relative aspect-[3/4] w-full bg-[var(--dd-night-2)]"
            initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.2, delay: 0.4, ease: EASE_INOUT } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={link.image}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: EASE_OUT }}
              >
                <div
                  className="absolute inset-0"
                  style={link.zoom ? { transform: `scale(${link.zoom})`, transformOrigin: link.position } : undefined}
                >
                  <Image
                    src={link.image}
                    alt=""
                    fill
                    sizes="34vw"
                    className="object-cover"
                    style={{ objectPosition: link.position }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={link.note}
              className="dd-body mt-6 text-center !text-[14px]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.45 }}
            >
              {link.note}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Footer strip */}
        <motion.div
          className="flex flex-col gap-3 border-t border-[var(--dd-line-dark)] pt-6 font-[family-name:var(--font-body)] text-[14px] font-light text-[var(--dd-cream)]/65 sm:flex-row sm:items-center sm:justify-between lg:col-span-12 lg:self-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.85, duration: 0.8 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <p>{HOTEL.address}</p>
          <p className="flex gap-6">
            <a href={HOTEL.phones[0].href} className="hover:text-[var(--dd-gold)]">
              {HOTEL.phones[0].label}
            </a>
            <a href={`mailto:${HOTEL.email}`} className="hover:text-[var(--dd-gold)]">
              {HOTEL.email}
            </a>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
