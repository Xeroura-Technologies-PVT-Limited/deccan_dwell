"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MysuruStory } from "./MysuruStory";
import { HotelTell } from "./HotelTell";
import { MysuruVisit } from "./MysuruVisit";
import { ProfileMenu } from "./ProfileMenu";

function IconInstagram({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFacebook({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M14 8h2.5V5H14a4 4 0 0 0-4 4v2H8v3h2v7h3v-7h2.2l.5-3H13V9a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function IconPin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

const NAV = [
  { label: "Home", href: "#home" },
  { label: "Rooms", href: "#rooms" },
  { label: "Suites", href: "#suites" },
  { label: "Experience", href: "#experience" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

type StackCard = {
  id: string;
  image: string;
  alt: string;
};

/** Card 0 is the hero plate seen through the arch — never a second copy. */
const STACK_CARDS: StackCard[] = [
  {
    id: "wide",
    image: "/images/hero-wide.jpg",
    alt: "Hills around Deccan Dwell, Mysuru",
  },
  {
    id: "exterior",
    image: "/images/building-exterior-hd.jpg",
    alt: "Deccan Dwell building exterior",
  },
  {
    id: "entrance",
    image: "/images/entrance-stairs-hd.jpg",
    alt: "Deccan Dwell entrance stairs and sign",
  },
  {
    id: "deluxe",
    image: "/images/room-deluxe.jpg",
    alt: "Premium Deluxe room",
  },
  {
    id: "suite",
    image: "/images/room-suite.jpg",
    alt: "Suite interior",
  },
];

const STACK_SEGMENTS = STACK_CARDS.length - 1;

/**
 * Hero phases are authored in viewport-heights of *scroll*, then converted to
 * 0–1 progress. That way inserting the Mysuru polaroid story does not speed
 * up the arch or the card stack.
 *
 * The original 500vh section had a 400vh scroll range (offset end-start).
 */
const BASE_SCROLL_VH = 400;
const PORTAL_SCROLL_VH = 0.24 * BASE_SCROLL_VH;
const STACK_SCROLL_VH = (1 - 0.32) * BASE_SCROLL_VH;
const VISIT_SCROLL_VH = 240;
const TELL_SCROLL_VH = 320;
const STORY_SCROLL_VH = 280;
const SCROLL_VH =
  PORTAL_SCROLL_VH + VISIT_SCROLL_VH + TELL_SCROLL_VH + STORY_SCROLL_VH + STACK_SCROLL_VH;
const SECTION_VH = SCROLL_VH + 100;

const at = (oldProgress: number) => (oldProgress * BASE_SCROLL_VH) / SCROLL_VH;

/** Arch has fully passed the camera. */
const PORTAL_END = at(0.24);
const VISIT_START = PORTAL_END;
const VISIT_END = (PORTAL_SCROLL_VH + VISIT_SCROLL_VH) / SCROLL_VH;
const TELL_START = VISIT_END;
const TELL_END = (PORTAL_SCROLL_VH + VISIT_SCROLL_VH + TELL_SCROLL_VH) / SCROLL_VH;
const STORY_START = TELL_END;
const STORY_END =
  (PORTAL_SCROLL_VH + VISIT_SCROLL_VH + TELL_SCROLL_VH + STORY_SCROLL_VH) / SCROLL_VH;
/** Card stack begins after the polaroid map has settled. */
const STACK_START = STORY_END;

/**
 * Camera depth for the title. translateZ must stay safely under this: at
 * z = PERSPECTIVE the projected scale is infinite, and past it the element
 * inverts behind the camera.
 */
const PERSPECTIVE = 1000;
/** Scroll progress at which the title has fully passed the camera. */
const TITLE_PASS = at(0.16);
/**
 * Apparent size is PERSPECTIVE / (PERSPECTIVE - z), so ramping z linearly gives
 * the hyperbolic blow-up of a real fly-past. Stopping just short of PERSPECTIVE
 * caps magnification here instead of letting it run to infinity and invert.
 * 12x keeps the peak raster (~13.8k px) under the 16k GPU texture limit.
 */
const TITLE_MAGNIFICATION = 12;
const TITLE_Z_MAX = PERSPECTIVE * (1 - 1 / TITLE_MAGNIFICATION);
/**
 * The original read as a fly-past because it never dissolved — it just got too
 * big to be legible and was gone. Cutting opacity only over the last stretch,
 * where apparent size is nearly doubling, keeps that read; a longer fade leaves
 * a screen-filling translucent ghost hanging at the top instead.
 */
const TITLE_CUT_START = TITLE_PASS * 0.93;

/**
 * How far the arch has opened, as one uniform scale factor.
 *
 * Because a single scale is applied to a fixed shape, the arch's proportions
 * and corner radius cannot drift — it reads as travelling through a fixed arch
 * rather than a shape morphing. `openness` 0 = closed, 1 = fully past us.
 */
function archScale(openness: number, boxW: number, boxH: number) {
  if (boxW <= 0 || boxH <= 0) return 1;

  // Mirrors the CSS: width clamp(280px, 42vw, 460px), height 90%,
  // radius min(width / 2, 31.5vh).
  const baseW = Math.min(Math.max(280, boxW * 0.42), 460);
  const baseH = boxH * 0.9;
  const baseR = Math.min(baseW / 2, baseH * 0.35);

  // Scale at which the arch — rounded top corners included — has grown past
  // every edge of the viewport.
  const clearSides = boxW / baseW;
  const clearHeight = boxH / baseH;
  const clearTopCurve = boxH / 2 / (baseH / 2 - baseR);
  const clearCorners = boxW / (baseW + 2 * baseR);
  const maxScale = 1.12 * Math.max(clearSides, clearHeight, clearTopCurve, clearCorners);

  // Constant-speed travel toward the arch, so apparent size accelerates.
  const k = 1 - 1 / maxScale;
  return 1 / (1 - k * Math.min(1, Math.max(0, openness)));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The arch as a plain `inset()` with rounded top corners — a rounded-top
 * rectangle is exactly an arch.
 *
 * Written as a complete value rather than driven by a CSS custom property.
 * Custom properties inherit, so animating one here would invalidate style for
 * every card in the subtree on every frame; a direct `clip-path` write only
 * dirties this one element.
 *
 * The insets go negative once the arch outgrows the viewport, which is what
 * lets it keep travelling past us without its corner radius ever rounding the
 * corners of the screen.
 */
function archInset(openness: number, boxW: number, boxH: number) {
  const scale = archScale(openness, boxW, boxH);

  const baseW = Math.min(Math.max(280, boxW * 0.42), 460);
  const baseH = boxH * 0.9;
  const baseR = Math.min(baseW / 2, baseH * 0.35);

  const x = round2((boxW - baseW * scale) / 2);
  const y = round2((boxH - baseH * scale) / 2);
  const r = round2(baseR * scale);

  return `inset(${y}px ${x}px ${y}px ${x}px round ${r}px ${r}px 0px 0px)`;
}

/**
 * Phase 1 — we travel through a fixed arch until it passes the camera,
 * revealing the hero photo full bleed, while the title flies past us.
 * Phase 2 — that same photo is card 0 of the scroll stack.
 *
 * The photo is never scaled up and never duplicated. The arch is a clip path,
 * so the reveal is pure geometry and reverses exactly.
 */
export function HeroPortal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const nRef = useRef<SVGTSpanElement>(null);

  // Elements whose fade is applied by hand — see `fades` below.
  const headerRef = useRef<HTMLElement>(null);
  const palmRef = useRef<HTMLDivElement>(null);
  const sideLeftRef = useRef<HTMLDivElement>(null);
  const sideRightRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const bookCtaRef = useRef<HTMLDivElement>(null);
  const bookBtnRef = useRef<HTMLAnchorElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 42 });
  const [box, setBox] = useState({ w: 0, h: 0 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // The hero is a 500vh scrubbed timeline, so a reload that restores scroll
  // drops you mid-animation: the header has already lifted away and the title
  // is frozen mid fly-past. Always start the timeline from the beginning.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const extras = [
      "/images/places/palace.jpg",
      "/images/places/chamundi.jpg",
      "/images/places/cathedral.jpg",
      "/images/places/zoo.jpg",
      "/images/places/jaganmohan.jpg",
      "/images/places/brindavan.jpg",
      "/images/building-exterior-hd.jpg",
      "/images/entrance-stairs-hd.jpg",
      "/images/story/bedroom.jpg",
      "/images/story/suite.jpg",
    ];
    [...STACK_CARDS.map((card) => card.image), ...extras].forEach((src) => {
      const img = new window.Image();
      img.src = src;
      void img.decode?.().catch(() => undefined);
    });
  }, []);

  /** 0 = arch closed, 1 = arch fully past us. */
  const openness = useTransform(scrollYProgress, (p) =>
    Math.min(1, Math.max(0, p / PORTAL_END)),
  );

  /** Gentle push-in. Small enough that the photo never softens. */
  const photoPush = useTransform(openness, [0, 1], [1.06, 1]);

  const chromeY = useTransform(scrollYProgress, [0, at(0.04), at(0.1)], [0, -8, -140]);
  const chromeOpacity = useTransform(scrollYProgress, [0, at(0.04), at(0.1)], [1, 1, 0]);

  const palmsOpacity = useTransform(scrollYProgress, [0, at(0.06), at(0.12)], [1, 1, 0]);
  const palmsX = useTransform(scrollYProgress, [0, at(0.18)], [0, -980]);
  const palmsScale = useTransform(scrollYProgress, [0, at(0.18)], [1, 1.4]);

  /**
   * Title rushes toward the camera and passes behind us. It sits above the
   * perspective origin, so the blow-up also carries it up and out of frame.
   */
  const titleScale = useTransform(
    scrollYProgress,
    [0, TITLE_PASS, 1],
    [0.34, 0.48, 0.48],
  );
  const titleZ = useTransform(
    scrollYProgress,
    [0, TITLE_PASS, 1],
    [0, TITLE_Z_MAX, TITLE_Z_MAX],
  );
  const titleOpacity = useTransform(
    scrollYProgress,
    [0, TITLE_CUT_START, TITLE_PASS, 1],
    [1, 1, 0, 0],
  );

  const sideScale = useTransform(scrollYProgress, [0, TITLE_PASS, 1], [1, 1.45, 1.45]);
  const sideLeftX = useTransform(scrollYProgress, [0, TITLE_PASS, 1], [0, -1100, -1100]);
  const sideRightX = useTransform(scrollYProgress, [0, TITLE_PASS, 1], [0, 1100, 1100]);
  const sideOpacity = useTransform(
    scrollYProgress,
    [0, TITLE_PASS * 0.62, TITLE_PASS * 0.9, 1],
    [1, 1, 0, 0],
  );

  const exploreOpacity = useTransform(scrollYProgress, [0, at(0.05), at(0.1)], [1, 1, 0]);

  const stackProgress = useTransform(scrollYProgress, [STACK_START, 1], [0, 1]);
  const visitProgress = useTransform(scrollYProgress, [VISIT_START, VISIT_END], [0, 1]);
  const tellProgress = useTransform(scrollYProgress, [TELL_START, TELL_END], [0, 1]);
  const storyProgress = useTransform(scrollYProgress, [STORY_START, STORY_END], [0, 1]);
  /** Polaroid overlays stay on card 0 after they assemble — they recede with it. */
  const storyOpacity = useTransform(
    scrollYProgress,
    [VISIT_START, VISIT_START + 0.01, 1],
    [0, 1, 1],
  );

  /**
   * Scroll-driven fades, applied to the DOM by hand.
   *
   * Framer 13.2.0 will not write `opacity` for these elements: the motion
   * value updates correctly but the style is left at its mount value of 1, so
   * the header, side captions and title never actually faded. Everything that
   * looked like it disappeared was only being translated or magnified out of
   * frame — which is why the title stayed on screen on phones, where it never
   * grows large enough to clear the viewport.
   *
   * Writing these ourselves also makes them self-healing, since they ride the
   * same reconcile loop as the arch.
   */
  const fades = useMemo(
    () =>
      [
        [headerRef, chromeOpacity],
        [palmRef, palmsOpacity],
        [sideLeftRef, sideOpacity],
        [sideRightRef, sideOpacity],
        [titleRef, titleOpacity],
        [bookCtaRef, titleOpacity],
        [exploreRef, exploreOpacity],
        [storyRef, storyOpacity],
      ] as const,
    [chromeOpacity, palmsOpacity, sideOpacity, titleOpacity, exploreOpacity, storyOpacity],
  );

  // Drive the arch clip and the fades imperatively: no re-render per frame,
  // and always against the current measured box.
  //
  // Listening to `change` alone is not enough. If a single event is dropped or
  // coalesced the arch stays frozen at whatever it last drew — stuck wide open
  // at the top of the page until the next scroll jolts it back. So instead of
  // trusting events, a frame loop reconciles the DOM against the current
  // scroll position, and re-applies if anything else overwrote a property. It
  // idles out ~1s after motion stops and is woken by scroll/resize/visibility,
  // so it costs nothing while the page is at rest.
  useEffect(() => {
    let raf = 0;
    let idleFrames = 0;
    let lastClip = "";

    const reconcile = () => {
      let changed = false;

      const el = overlayRef.current;
      if (el && box.w > 0 && box.h > 0) {
        const clip = archInset(openness.get(), box.w, box.h);
        if (clip !== lastClip || el.style.clipPath !== lastClip) {
          lastClip = clip;
          el.style.clipPath = clip;
          el.style.setProperty("-webkit-clip-path", clip);
          changed = true;
        }
      }

      for (const [ref, value] of fades) {
        const node = ref.current;
        if (!node) continue;
        const next = value.get().toFixed(3);
        if (node.style.opacity !== next) {
          node.style.opacity = next;
          if (ref === storyRef) {
            node.style.visibility = Number(next) < 0.01 ? "hidden" : "visible";
          }
          if (ref === bookCtaRef) {
            const btn = bookBtnRef.current;
            if (btn) btn.style.pointerEvents = Number(next) < 0.2 ? "none" : "auto";
          }
          changed = true;
        }
      }

      return changed;
    };

    const tick = () => {
      idleFrames = reconcile() ? 0 : idleFrames + 1;
      raf = idleFrames < 60 ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      idleFrames = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    reconcile();
    wake();

    const unsubscribe = openness.on("change", wake);
    const unsubscribeStory = storyProgress.on("change", wake);
    const unsubscribeVisit = visitProgress.on("change", wake);
    const unsubscribeTell = tellProgress.on("change", wake);
    const unsubscribeScroll = scrollYProgress.on("change", wake);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("scrollend", wake);
    window.addEventListener("resize", wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      unsubscribe();
      unsubscribeStory();
      unsubscribeVisit();
      unsubscribeTell();
      unsubscribeScroll();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("scrollend", wake);
      window.removeEventListener("resize", wake);
      document.removeEventListener("visibilitychange", wake);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [openness, box, fades, storyProgress, visitProgress, tellProgress, scrollYProgress]);

  useEffect(() => {
    const measure = () => {
      const sticky = stickyRef.current;
      if (sticky) {
        const rect = sticky.getBoundingClientRect();
        setBox((prev) =>
          prev.w === rect.width && prev.h === rect.height
            ? prev
            : { w: rect.width, h: rect.height },
        );
      }

      // getBoundingClientRect includes the ancestor fly-past transform, so this
      // is only meaningful while the title is still at rest.
      const nEl = nRef.current;
      if (!nEl || scrollYProgress.get() > at(0.02)) return;
      const nBox = nEl.getBoundingClientRect();
      setOrigin({
        x: Math.min(62, Math.max(38, ((nBox.left + nBox.width / 2) / window.innerWidth) * 100)),
        y: Math.min(55, Math.max(35, ((nBox.bottom + 6) / window.innerHeight) * 100)),
      });
    };
    measure();
    const t = window.setTimeout(measure, 160);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [scrollYProgress]);

  const sectionVh = SECTION_VH;

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative bg-[var(--dd-hero-base)]"
      style={{ height: `${sectionVh}vh` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen overflow-hidden bg-[var(--dd-hero-base)]"
      >
        {/* Green atmosphere. Full bleed and never clipped, so the six stacked
            gradients and the blended palm rasterise once and are never
            repainted — this is the expensive layer, and now it is static. */}
        <div className="dd-hero-atmosphere pointer-events-none absolute inset-0 z-[1]" aria-hidden>
          <div className="dd-hero-sky" />
          <motion.div
            ref={palmRef}
            className="dd-hero-palms"
            style={{ x: palmsX, scale: palmsScale }}
          >
            <Image
              src="/images/palm-shadows.png"
              alt=""
              fill
              priority
              className="object-contain object-left-top opacity-[0.78]"
              sizes="55vw"
            />
          </motion.div>
        </div>

        {/* The arch is a window onto the photo rather than a hole in the wall.
            One plain `inset()` with rounded top corners, driven by a single
            CSS variable, so there is no path geometry, no even-odd hole and
            nothing for Safari or mobile to disagree about. */}
        <div ref={overlayRef} className="dd-hero-arch absolute inset-0 z-[2]">
          {/* `isolate` keeps every card inside this stacking context. */}
          <motion.div className="absolute inset-0 isolate" style={{ scale: photoPush }}>
            {/* Surface the cards sit on once they start stacking. Near-black,
                not the hero green, so a receding card reads as a card on a
                dark table rather than as green bars torn out of the hero. */}
            <div className="absolute inset-0 bg-[#060f0d]" aria-hidden />
            {STACK_CARDS.map((card, index) => (
              <StackCardLayer
                key={card.id}
                card={card}
                index={index}
                segments={STACK_SEGMENTS}
                progress={stackProgress}
              >
                {index === 0 ? (
                  <div
                    ref={storyRef}
                    className="absolute inset-0 z-[1]"
                    style={{ opacity: 0, visibility: "hidden" }}
                  >
                    <MysuruVisit progress={visitProgress} />
                    <HotelTell progress={tellProgress} />
                    <MysuruStory progress={storyProgress} />
                  </div>
                ) : null}
              </StackCardLayer>
            ))}
          </motion.div>
        </div>

        <motion.header
          ref={headerRef}
          style={{ y: chromeY }}
          className="absolute inset-x-0 top-0 z-30 flex items-start justify-between px-5 pb-4 pt-5 md:px-10 lg:px-14"
        >
          <a
            href="#home"
            className="relative block h-[58px] w-[230px] shrink-0 md:h-[72px] md:w-[300px]"
            style={{
              filter:
                "drop-shadow(0 3px 6px rgba(0,0,0,0.45)) drop-shadow(0 8px 18px rgba(0,0,0,0.28))",
            }}
          >
            <Image
              src="/images/logo.png"
              alt="Deccan Dwell — Home away from home"
              fill
              priority
              className="object-contain object-left"
              sizes="300px"
            />
          </a>

          <nav className="absolute left-1/2 top-7 hidden -translate-x-1/2 items-center gap-7 lg:flex">
            {NAV.map((item, i) => (
              <a
                key={item.label}
                href={item.href}
                className={`font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.22em] text-[var(--dd-cream)] transition hover:text-[var(--dd-gold)] ${
                  i === 0
                    ? "border-b border-[var(--dd-gold)] pb-1 text-[var(--dd-gold)]"
                    : ""
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center pt-1">
            <ProfileMenu />
          </div>
        </motion.header>

        <motion.div
          ref={sideLeftRef}
          style={{ x: sideLeftX, scale: sideScale }}
          className="pointer-events-none absolute bottom-[14%] left-6 z-20 origin-bottom-left md:left-10 lg:left-14"
        >
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--dd-gold)] md:text-3xl">
            01
          </p>
          <div className="my-3 h-px w-10 bg-[var(--dd-gold)]/70" />
          <p className="max-w-[8rem] font-[family-name:var(--font-nav)] text-[10px] uppercase leading-relaxed tracking-[0.2em] text-[var(--dd-cream)] md:text-[11px]">
            Spacious stays
            <br />
            Modern
            <br />
            Comforts
          </p>
        </motion.div>

        <motion.div
          ref={sideRightRef}
          style={{ x: sideRightX, scale: sideScale }}
          className="pointer-events-none absolute bottom-[14%] right-6 z-20 origin-bottom-right text-right md:right-10 lg:right-14"
        >
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--dd-gold)] md:text-3xl">
            02
          </p>
          <div className="ml-auto my-3 h-px w-10 bg-[var(--dd-gold)]/70" />
          <p className="ml-auto max-w-[9rem] font-[family-name:var(--font-nav)] text-[10px] uppercase leading-relaxed tracking-[0.2em] text-[var(--dd-cream)] md:text-[11px]">
            At the foothills of Chamundi Hills
          </p>
        </motion.div>

        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            perspective: `${PERSPECTIVE}px`,
            perspectiveOrigin: `${origin.x}% ${origin.y}%`,
          }}
        >
          <motion.div
            ref={titleRef}
            style={{
              x: "calc(-50% + 0.7vw)",
              y: "-50%",
              scale: titleScale,
              z: titleZ,
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
            className="absolute left-1/2 top-[32%] w-[min(220vw,2400px)] will-change-transform"
          >
            <svg
              viewBox="0 0 900 280"
              className="h-auto w-full overflow-visible"
              role="img"
              aria-label="Deccan Dwell — Mysuru — Home away from home"
            >
              <defs>
                <filter id="dd-title-pop" x="-40%" y="-50%" width="180%" height="220%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                  <feOffset in="blur" dy="3" result="off" />
                  <feFlood floodColor="#1a1814" floodOpacity="0.32" result="tint" />
                  <feComposite in="tint" in2="off" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <text
                x="450"
                y="48"
                textAnchor="middle"
                fill="#c5a059"
                filter="url(#dd-title-pop)"
                style={{
                  fontFamily: "var(--font-nav), DM Sans, sans-serif",
                  fontSize: "24px",
                  letterSpacing: "0.45em",
                }}
              >
                MYSURU
              </text>
              <text
                x="450"
                y="155"
                textAnchor="middle"
                fill="#efe4c8"
                filter="url(#dd-title-pop)"
                style={{
                  fontFamily: "var(--font-display), Cormorant Garamond, serif",
                  fontSize: "118px",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                }}
              >
                Decca
                <tspan ref={nRef} dx="0">
                  n
                </tspan>
                {" Dwell"}
              </text>
              <text
                x="450"
                y="235"
                textAnchor="middle"
                fill="#c5a059"
                filter="url(#dd-title-pop)"
                style={{
                  fontFamily: "var(--font-nav), DM Sans, sans-serif",
                  fontSize: "20px",
                  letterSpacing: "0.35em",
                }}
              >
                HOME AWAY FROM HOME
              </text>
            </svg>
          </motion.div>
          <motion.div
            ref={bookCtaRef}
            style={{
              x: "-50%",
              scale: titleScale,
              z: titleZ,
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
            className="absolute bottom-[18%] left-1/2 origin-center will-change-transform md:bottom-[15%]"
          >
            <a
              ref={bookBtnRef}
              href="#book"
              className="pointer-events-auto cursor-pointer whitespace-nowrap border border-[#c5a059] px-16 py-8 font-[family-name:var(--font-nav)] text-[42px] uppercase tracking-[0.28em] text-[#efe4c8] transition hover:bg-[#c5a059] hover:text-[#024d43]"
              style={{
                filter:
                  "drop-shadow(0 3px 6px rgba(26,24,20,0.32)) drop-shadow(0 8px 18px rgba(26,24,20,0.2))",
              }}
            >
              Book Your Stay
            </a>
          </motion.div>
        </div>

        <div
          ref={exploreRef}
          className="absolute bottom-8 left-0 right-0 z-30 flex items-end justify-between px-6 md:px-10 lg:px-14"
        >
          <div className="flex items-center gap-4 text-[var(--dd-cream)]">
            <a href="https://instagram.com" aria-label="Instagram" className="transition hover:text-[var(--dd-gold)]">
              <IconInstagram />
            </a>
            <a href="https://facebook.com" aria-label="Facebook" className="transition hover:text-[var(--dd-gold)]">
              <IconFacebook />
            </a>
            <a href="#contact" aria-label="Location" className="transition hover:text-[var(--dd-gold)]">
              <IconPin />
            </a>
          </div>

          <a
            href="#rooms"
            className="absolute bottom-2 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[var(--dd-cream)]"
          >
            <span className="font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.35em]">
              Explore
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80">
              <motion.span
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                className="text-lg leading-none"
              >
                ↓
              </motion.span>
            </span>
          </a>

          <p className="font-[family-name:var(--font-nav)] text-[10px] tracking-[0.25em] text-[var(--dd-cream)]">
            01 ——— 03
          </p>
        </div>
      </div>
    </section>
  );
}

function StackCardLayer({
  card,
  index,
  segments,
  progress,
  children,
}: {
  card: StackCard;
  index: number;
  segments: number;
  progress: MotionValue<number>;
  children?: ReactNode;
}) {
  const enterStart = (index - 1) / segments;
  const enterEnd = index / segments;
  const exitStart = index / segments;
  const exitEnd = (index + 1) / segments;
  const isLast = index === segments;

  const y = useTransform(
    progress,
    index === 0 ? [0, 1] : [enterStart, enterEnd, 1],
    index === 0 ? ["0%", "0%"] : ["100%", "0%", "0%"],
  );

  // Card-stack recede: the outgoing card shrinks, tilts and rounds off, so it
  // reads as a card being laid down while the next one slides over it. The
  // exposed margin is the dark surface behind the stack, never the hero green,
  // and it only ever happens after the arch has fully settled.
  const scale = useTransform(
    progress,
    isLast ? [0, 1] : [exitStart, exitEnd],
    isLast ? [1, 1] : [1, 0.88],
  );

  const rotate = useTransform(
    progress,
    isLast ? [0, 1] : [exitStart, exitEnd],
    isLast ? [0, 0] : [0, 2.5],
  );

  const radius = useTransform(
    progress,
    isLast ? [0, 1] : [exitStart, exitEnd],
    isLast ? ["0px", "0px"] : ["0px", "26px"],
  );

  const dim = useTransform(
    progress,
    isLast ? [0, 1] : [exitStart, exitEnd],
    isLast ? [0, 0] : [0, 0.3],
  );

  /**
   * A card that hasn't started sliding in yet sits at y: 100%, entirely below
   * the fold. Left visible it would still be painted and given its own
   * compositor layer — five full-bleed images at DPR 2 is on the order of 70MB
   * of layer memory, all of it dead weight during the arch animation.
   *
   * `visibility: hidden` drops it from paint and compositing while still
   * keeping its image loaded and decoded, so nothing pops when it appears. The
   * flip happens the instant the card starts moving, while it is still fully
   * off-screen, so it can never be seen.
   */
  const visible = useTransform(progress, (p) =>
    index === 0 || p > enterStart + 1e-6 ? "visible" : "hidden",
  );
  // Only hint the compositor for cards that are actually in play; a permanent
  // hint on every card is what forces all those layers to exist at once.
  const willChange = useTransform(visible, (v) => (v === "visible" ? "transform" : "auto"));

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden shadow-[0_28px_70px_-20px_rgba(0,0,0,0.75)]"
      style={{
        y,
        scale,
        rotate,
        borderRadius: radius,
        zIndex: index + 1,
        transformOrigin: "50% 50%",
        backfaceVisibility: "hidden",
        visibility: visible,
        willChange,
      }}
    >
      {index === 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.image}
          alt={card.alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
          decoding="sync"
          fetchPriority="high"
        />
      ) : (
        <Image
          src={card.image}
          alt={card.alt}
          fill
          priority={index < 2}
          quality={95}
          sizes="100vw"
          className="object-cover object-center"
          draggable={false}
        />
      )}
      {children}
      {/* Depth cue for the outgoing card — replaces the shrink, so no gap. */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[2] bg-black"
        style={{ opacity: dim }}
        aria-hidden
      />
    </motion.div>
  );
}
