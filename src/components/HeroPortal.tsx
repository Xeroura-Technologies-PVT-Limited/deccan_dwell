"use client";

import {
  animate,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * The opening shot.
 *
 * Phase 1 — we travel through a fixed arch until it passes the camera,
 *           revealing the hills full bleed, while the title flies past us.
 * Phase 2 — the photo settles into a slow push-in and a single line of copy
 *           surfaces; the next section then rises over it like a curtain
 *           (it overlaps the last 100vh of this section — see `.dd-curtain`).
 *
 * Everything is authored in viewport-heights of scroll, then converted to the
 * 0–1 progress of the pinned stage.
 */
const SECTION_VH = 340;
const SCROLL_VH = SECTION_VH - 100;
const vh = (v: number) => v / SCROLL_VH;

/** Arch has fully passed the camera. */
const PORTAL_END = vh(110);
/** Title has fully passed the camera. */
const TITLE_PASS = vh(70);
const TITLE_CUT_START = TITLE_PASS * 0.93;

/**
 * Camera depth for the title. translateZ must stay safely under this: at
 * z = PERSPECTIVE the projected scale is infinite, and past it the element
 * inverts behind the camera.
 */
const PERSPECTIVE = 1000;
/**
 * Apparent size is PERSPECTIVE / (PERSPECTIVE - z), so ramping z linearly gives
 * the hyperbolic blow-up of a real fly-past. 12x keeps the peak raster under
 * the 16k GPU texture limit.
 */
const TITLE_MAGNIFICATION = 12;
const TITLE_Z_MAX = PERSPECTIVE * (1 - 1 / TITLE_MAGNIFICATION);
/** Phones/tablets: a shorter fly-past keeps the title's raster small, so the
 *  first pass never stalls while the GPU re-rasterises huge text. */
const LITE_TITLE_Z_MAX = PERSPECTIVE * (1 - 1 / 3.2);

/**
 * "Mysore Palace Gate in Golden Morning Haze" — Surya Rajesh, Pexels licence.
 * Cropped so the gate's axis sits dead centre, then graded into the brand
 * palette: emerald-black shadows, champagne-gold haze.
 */
const HERO_IMAGE = {
  src: "/images/hero-gate-graded-2000.jpg",
  srcSet:
    "/images/hero-gate-graded-1200.jpg 1200w, /images/hero-gate-graded-2000.jpg 2000w, /images/hero-gate-graded-3200.jpg 3200w",
  alt: "The arched gate of Mysore Palace in golden morning haze",
};

/**
 * The arch at rest. On phones it starts below the header so the logo and the
 * Reserve / Menu buttons never sit on its shoulders; on wider screens the
 * header's centre is empty, so it can rise higher.
 *
 * Mirrors `.dd-hero-arch` in globals.css (the pre-hydration state).
 */
function archGeometry(boxW: number, boxH: number) {
  const baseW = Math.min(Math.max(280, boxW * 0.42), 460);
  const top = boxW < 768 ? Math.max(boxH * 0.05, 104) : boxH * 0.05;
  const bottom = boxH * 0.05;
  const baseH = boxH - top - bottom;
  const baseR = Math.min(baseW / 2, baseH * 0.35);
  const cy = top + baseH / 2;
  return { baseW, baseH, baseR, cy };
}

/**
 * How far the arch has opened, as one uniform scale factor — a fixed shape
 * scaled up reads as travelling through an arch rather than a shape morphing.
 */
function archScale(openness: number, boxW: number, boxH: number) {
  if (boxW <= 0 || boxH <= 0) return 1;
  const { baseW, baseH, baseR, cy } = archGeometry(boxW, boxH);
  const halfH = Math.max(cy, boxH - cy);

  // Scale at which the arch — rounded top corners included — has grown past
  // every edge of the viewport.
  const clearSides = boxW / baseW;
  const clearHeight = (2 * halfH) / baseH;
  const clearTopCurve = halfH / (baseH / 2 - baseR);
  const clearCorners = boxW / (baseW + 2 * baseR);
  const maxScale = 1.12 * Math.max(clearSides, clearHeight, clearTopCurve, clearCorners);

  // Constant-speed travel toward the arch, so apparent size accelerates.
  const k = 1 - 1 / maxScale;
  return 1 / (1 - k * Math.min(1, Math.max(0, openness)));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Phones and tablets: the surround (green sky + palms) is a stencil with the
 * resting arch cut out of it. Travelling through the arch is then a plain
 * `scale()` of that stencil about the arch's centre — compositor-only, no
 * per-frame repaint — instead of re-clipping the full-screen photo.
 */
function archMask(boxW: number, boxH: number) {
  const { baseW, baseH, baseR, cy } = archGeometry(boxW, boxH);
  const x0 = round2((boxW - baseW) / 2);
  const x1 = round2(x0 + baseW);
  const top = round2(cy - baseH / 2);
  const sill = round2(cy + baseH / 2);
  const r = round2(baseR);
  const W = Math.ceil(boxW);
  const H = Math.ceil(boxH);
  const hole = `M${x0} ${sill}V${round2(top + r)}A${r} ${r} 0 0 1 ${round2(x0 + r)} ${top}H${round2(x1 - r)}A${r} ${r} 0 0 1 ${x1} ${round2(top + r)}V${sill}Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path fill-rule="evenodd" d="M0 0H${W}V${H}H0Z${hole}"/></svg>`;
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, originY: round2(cy) };
}

const LITE_QUERY = "(hover: none), (max-width: 1023px)";

/**
 * The arch as an `inset()` with rounded top corners.
 *
 * `rise` (0–1) is the entrance: the arch grows up from its threshold like a
 * dome rising over the horizon, then the scroll takes over.
 */
function archInset(openness: number, boxW: number, boxH: number, rise = 1) {
  const scale = archScale(openness, boxW, boxH);
  const { baseW, baseH, baseR, cy } = archGeometry(boxW, boxH);

  const x = round2((boxW - baseW * scale) / 2);
  const fullTop = cy - (baseH * scale) / 2;
  const sill = cy + (baseH * scale) / 2;
  const top = round2(sill - (sill - fullTop) * Math.min(1, Math.max(0, rise)));
  const bottom = round2(boxH - sill);
  const r = round2(baseR * scale);

  return `inset(${top}px ${x}px ${bottom}px ${x}px round ${r}px ${r}px 0px 0px)`;
}

export function HeroPortal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);
  /** Phones and tablets get the compositor-only variant of the hero. */
  const liteRef = useRef(false);
  useEffect(() => {
    liteRef.current = window.matchMedia(LITE_QUERY).matches;
  }, []);
  const nRef = useRef<SVGTSpanElement>(null);

  // Elements whose fade is applied by hand — see `fades` below.
  const palmRef = useRef<HTMLDivElement>(null);
  const sideLeftRef = useRef<HTMLDivElement>(null);
  const sideRightRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const bookCtaRef = useRef<HTMLDivElement>(null);
  const bookBtnRef = useRef<HTMLAnchorElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const restShadeRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 42 });
  const [box, setBox] = useState({ w: 0, h: 0 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // A reload that restores scroll would drop you mid fly-past; always start
  // the timeline from the beginning.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

  // Mobile browsers resize the viewport as the address bar slides in and out.
  // Pin the hero to one measured height so the pinned arch never jumps or
  // drifts mid-scroll; only a real change (rotation, window resize) re-measures.
  useEffect(() => {
    const root = document.documentElement;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let lastW = window.innerWidth;
    let lastH = window.innerHeight;
    root.style.setProperty("--dd-hero-h", `${lastH}px`);
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (coarse && w === lastW && Math.abs(h - lastH) < 160) return;
      lastW = w;
      lastH = h;
      root.style.setProperty("--dd-hero-h", `${h}px`);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** 0 → 1 as the hero makes its entrance beneath the lifting intro curtain. */
  const rise = useMotionValue(0);

  // Cursor depth: everything drifts a few pixels with the pointer, nearer
  // layers more than farther ones. Desktop pointers only.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const mx = useSpring(pointerX, { stiffness: 50, damping: 18, mass: 0.8 });
  const my = useSpring(pointerY, { stiffness: 50, damping: 18, mass: 0.8 });
  const palmDX = useTransform(mx, (v) => v * -26);
  const palmDY = useTransform(my, (v) => v * -14);
  const photoDX = useTransform(mx, (v) => v * 14);
  const photoDY = useTransform(my, (v) => v * 9);
  const titleDX = useTransform(mx, (v) => v * -12);
  const titleDY = useTransform(my, (v) => v * -7);
  const sideDX = useTransform(mx, (v) => v * -7);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      pointerX.set((e.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [pointerX, pointerY]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let controls: ReturnType<typeof animate> | null = null;
    const enter = () => {
      if (rise.get() > 0) return;
      controls = animate(rise, 1, {
        duration: reduce ? 0.01 : 1.9,
        ease: [0.65, 0, 0.25, 1],
      });
    };
    if (document.documentElement.classList.contains("dd-entered")) enter();
    window.addEventListener("dd:enter", enter);
    // Belt and braces: never leave the arch closed if the cue is missed.
    const fallback = window.setTimeout(() => {
      if (rise.get() === 0) rise.set(1);
    }, 9000);
    return () => {
      window.removeEventListener("dd:enter", enter);
      window.clearTimeout(fallback);
      controls?.stop();
    };
  }, [rise]);

  /** 0 = arch closed, 1 = arch fully past us. */
  const openness = useTransform(scrollYProgress, (p) =>
    Math.min(1, Math.max(0, p / PORTAL_END)),
  );

  /** Gentle push-in through the arch, then a slow settle while the curtain rises. */
  const photoScale = useTransform([scrollYProgress, rise], ([p, r]: number[]) => {
    const settle = 1 + 0.16 * (1 - r);
    if (p <= PORTAL_END) return (1.06 - 0.06 * (p / PORTAL_END)) * settle;
    return (1 + 0.08 * ((p - PORTAL_END) / (1 - PORTAL_END))) * settle;
  });

  const palmsOpacity = useTransform(scrollYProgress, [0, vh(22), vh(44)], [1, 1, 0]);
  const palmsX = useTransform(scrollYProgress, [0, vh(66)], [0, -980]);
  const palmsScale = useTransform(scrollYProgress, [0, vh(66)], [1, 1.4]);

  /** Title rushes toward the camera and passes behind us. */
  const titleScale = useTransform(scrollYProgress, [0, TITLE_PASS, 1], [0.34, 0.48, 0.48]);
  const titleZ = useTransform(scrollYProgress, (p) => {
    const zMax = liteRef.current ? LITE_TITLE_Z_MAX : TITLE_Z_MAX;
    return zMax * Math.min(1, Math.max(0, p / TITLE_PASS));
  });
  const titleOpacity = useTransform(scrollYProgress, (p) => {
    const [a, b] = liteRef.current ? [TITLE_PASS * 0.42, TITLE_PASS * 0.72] : [TITLE_CUT_START, TITLE_PASS];
    return p <= a ? 1 : p >= b ? 0 : 1 - (p - a) / (b - a);
  });

  const sideScale = useTransform(scrollYProgress, [0, TITLE_PASS, 1], [1, 1.45, 1.45]);
  const sideLeftX = useTransform(scrollYProgress, [0, TITLE_PASS, 1], [0, -1100, -1100]);
  const sideRightX = useTransform(scrollYProgress, [0, TITLE_PASS, 1], [0, 1100, 1100]);
  const sideOpacity = useTransform(
    scrollYProgress,
    [0, TITLE_PASS * 0.62, TITLE_PASS * 0.9, 1],
    [1, 1, 0, 0],
  );

  const exploreOpacity = useTransform(scrollYProgress, [0, vh(12), vh(30)], [1, 1, 0]);

  const statementOpacity = useTransform(scrollYProgress, [0, vh(104), vh(134), 1], [0, 0, 1, 1]);
  const statementY = useTransform(scrollYProgress, [vh(104), vh(134), 1], [36, 0, -70]);
  const dimOpacity = useTransform(scrollYProgress, [0, vh(100), vh(140), 1], [0, 0, 1, 1]);
  const restShadeOpacity = useTransform(scrollYProgress, [0, TITLE_PASS * 0.8, TITLE_PASS], [1, 1, 0]);

  /**
   * Scroll-driven fades, applied to the DOM by hand: framer 13 leaves
   * `opacity` style motion values at their mount value on these elements, so
   * they are reconciled in the frame loop below together with the arch.
   */
  const fades = useMemo(
    () =>
      [
        [palmRef, palmsOpacity],
        [sideLeftRef, sideOpacity],
        [sideRightRef, sideOpacity],
        [titleRef, titleOpacity],
        [bookCtaRef, titleOpacity],
        [exploreRef, exploreOpacity],
        [statementRef, statementOpacity],
        [dimRef, dimOpacity],
        [restShadeRef, restShadeOpacity],
      ] as const,
    [
      palmsOpacity,
      sideOpacity,
      titleOpacity,
      exploreOpacity,
      statementOpacity,
      dimOpacity,
      restShadeOpacity,
    ],
  );

  // Drive the arch clip and the fades imperatively: no re-render per frame.
  // A frame loop reconciles the DOM against the current scroll position (so a
  // dropped event can never leave the arch frozen), then idles out ~1s after
  // motion stops until scroll/resize/visibility wakes it.
  useEffect(() => {
    let raf = 0;
    let idleFrames = 0;
    let lastClip = "";

    const lite = window.matchMedia(LITE_QUERY).matches;
    let lastScale = "";
    let lastFrameVisible = "";
    const frame = atmosphereRef.current;
    if (frame) {
      if (lite && box.w > 0 && box.h > 0) {
        const { url, originY } = archMask(box.w, box.h);
        frame.style.setProperty("-webkit-mask-image", url);
        frame.style.setProperty("mask-image", url);
        frame.style.setProperty("-webkit-mask-size", "100% 100%");
        frame.style.setProperty("mask-size", "100% 100%");
        frame.style.transformOrigin = `50% ${originY}px`;
        frame.style.zIndex = "3";
        frame.style.willChange = "transform";
      } else {
        for (const prop of ["-webkit-mask-image", "mask-image", "-webkit-mask-size", "mask-size"]) {
          frame.style.removeProperty(prop);
        }
        frame.style.transform = "";
        frame.style.zIndex = "";
        frame.style.willChange = "";
        frame.style.visibility = "";
        frame.style.opacity = "";
      }
    }

    const reconcile = () => {
      let changed = false;

      const el = overlayRef.current;
      if (el && box.w > 0 && box.h > 0) {
        const open = openness.get();
        const r = rise.get();
        // Lite mode clips the photo only during the entrance; after that the
        // scaled stencil above it does the work.
        const clip = lite && r >= 1 ? "none" : archInset(open, box.w, box.h, r);
        if (clip !== lastClip) {
          lastClip = clip;
          el.style.clipPath = clip;
          el.style.setProperty("-webkit-clip-path", clip);
          changed = true;
        }
        if (lite && frame) {
          // Once the arch's sides have cleared the screen only slivers of the
          // surround remain: fade it out early and stop growing it, so the
          // layer is never rasterised at a huge scale.
          const raw = archScale(open, box.w, box.h);
          const clearAt = box.w / Math.min(Math.max(280, box.w * 0.42), 460);
          const fadeFrom = clearAt * 1.05;
          const fadeTo = clearAt * 1.6;
          const s = Math.min(raw, fadeTo);
          const scale = `scale(${s.toFixed(4)})`;
          if (scale !== lastScale) {
            lastScale = scale;
            frame.style.transform = scale;
            changed = true;
          }
          const op = raw <= fadeFrom ? 1 : raw >= fadeTo ? 0 : 1 - (raw - fadeFrom) / (fadeTo - fadeFrom);
          const opStr = op.toFixed(3);
          if (frame.style.opacity !== opStr) {
            frame.style.opacity = opStr;
            changed = true;
          }
          const visible = op <= 0 ? "hidden" : "visible";
          if (visible !== lastFrameVisible) {
            lastFrameVisible = visible;
            frame.style.visibility = visible;
          }
        }
      }

      for (const [ref, value] of fades) {
        const node = ref.current;
        if (!node) continue;
        const next = value.get().toFixed(3);
        if (node.style.opacity !== next) {
          node.style.opacity = next;
          if (ref === bookCtaRef) {
            const btn = bookBtnRef.current;
            if (btn) btn.style.pointerEvents = Number(next) < 0.2 ? "none" : "auto";
          }
          if (ref === exploreRef) {
            node.style.pointerEvents = Number(next) < 0.2 ? "none" : "auto";
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

    const unsubscribe = scrollYProgress.on("change", wake);
    const unsubscribeRise = rise.on("change", wake);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      unsubscribe();
      unsubscribeRise();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      document.removeEventListener("visibilitychange", wake);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [openness, box, fades, scrollYProgress, rise]);

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

      // Only meaningful while the title is still at rest.
      const nEl = nRef.current;
      if (!nEl || scrollYProgress.get() > vh(4)) return;
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

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative bg-[var(--dd-hero-base)]"
      style={{ height: `calc(var(--dd-hero-h, 100vh) * ${SECTION_VH / 100})` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-[var(--dd-hero-h,100svh)] overflow-hidden bg-[var(--dd-hero-base)]"
      >
        {/* Green atmosphere: full bleed and never clipped, so the stacked
            gradients and blended palm rasterise once. */}
        <div ref={atmosphereRef} className="dd-hero-atmosphere pointer-events-none absolute inset-0 z-[1]" aria-hidden>
          <div className="dd-hero-sky" />
          <motion.div
            ref={palmRef}
            className="dd-hero-palms"
            style={{ x: palmsX, scale: palmsScale }}
          >
            {/* Vector shadow (scripts/palm-shadow.py) — crisp at any size. */}
            <motion.div className="absolute inset-0" style={{ x: palmDX, y: palmDY }}>
              <div className="dd-enter dd-enter-palm absolute inset-0">
                <div className="dd-hero-palms-sway">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/palm-shadow.svg" alt="" draggable={false} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* The arch is a window onto the photo — a plain `inset()` with
            rounded top corners, written each frame by the loop above. */}
        <div ref={overlayRef} className="dd-hero-arch absolute inset-0 z-[2]" data-cursor="Scroll">
          <motion.div className="absolute inset-0" style={{ scale: photoScale }}>
            <motion.div className="absolute inset-0 scale-[1.035]" style={{ x: photoDX, y: photoDY }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE.src}
              srcSet={HERO_IMAGE.srcSet}
              sizes="100vw"
              alt={HERO_IMAGE.alt}
              className="absolute inset-0 h-full w-full object-cover object-[50%_46%]"
              draggable={false}
              decoding="sync"
              fetchPriority="high"
            />
            </motion.div>
          </motion.div>
          {/* Seats the title on the bright haze while the arch is closed;
              lifts away as we travel through. */}
          <div
            ref={restShadeRef}
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_42%_at_50%_34%,rgba(6,22,19,0.5)_0%,rgba(6,22,19,0.18)_60%,transparent_100%)]"
            aria-hidden
          />
          <div
            ref={dimRef}
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,22,19,0.5)_0%,rgba(6,22,19,0.28)_45%,rgba(6,22,19,0.6)_100%)]"
            style={{ opacity: 0 }}
            aria-hidden
          />
          <motion.div
            ref={statementRef}
            style={{ y: statementY, opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-[12%] z-[3] px-[var(--dd-gutter)] text-center md:top-[11%]"
          >
            <p className="dd-eyebrow dd-eyebrow--plain justify-center text-[var(--dd-cream)]/85">
              Chamundi Hills · Mysuru
            </p>
            <p className="dd-display mx-auto mt-6 max-w-[14ch] text-[var(--dd-cream)] [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">
              Where the city <em className="!text-[var(--dd-cream)]">slows</em> down.
            </p>
          </motion.div>
        </div>

        <motion.div
          ref={sideLeftRef}
          style={{ x: sideLeftX, scale: sideScale }}
          className="pointer-events-none absolute bottom-[14%] left-[var(--dd-gutter)] z-20 hidden origin-bottom-left sm:block"
        >
          <motion.div style={{ x: sideDX }}>
          <div className="dd-enter dd-enter-up dd-delay-6">
          <p className="font-[family-name:var(--font-display)] text-3xl italic text-[var(--dd-gold)]">
            01
          </p>
          <div className="my-3 h-px w-10 bg-[var(--dd-gold)]/70" />
          <p className="max-w-[9rem] font-[family-name:var(--font-nav)] text-[10.5px] uppercase leading-relaxed tracking-[0.22em] text-[var(--dd-cream)]">
            Rooms &amp;
            <br />
            three-bedroom
            <br />
            suites
          </p>
          </div>
          </motion.div>
        </motion.div>

        <motion.div
          ref={sideRightRef}
          style={{ x: sideRightX, scale: sideScale }}
          className="pointer-events-none absolute bottom-[14%] right-[var(--dd-gutter)] z-20 hidden origin-bottom-right text-right sm:block"
        >
          <motion.div style={{ x: sideDX }}>
          <div className="dd-enter dd-enter-up dd-delay-7">
          <p className="font-[family-name:var(--font-display)] text-3xl italic text-[var(--dd-gold)]">
            02
          </p>
          <div className="my-3 ml-auto h-px w-10 bg-[var(--dd-gold)]/70" />
          <p className="ml-auto max-w-[10rem] font-[family-name:var(--font-nav)] text-[10.5px] uppercase leading-relaxed tracking-[0.22em] text-[var(--dd-cream)]">
            At the foothills of Chamundi Hills
          </p>
          </div>
          </motion.div>
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
            className="absolute left-1/2 top-[34%] w-[min(220vw,2400px)] will-change-transform"
          >
            <motion.div style={{ x: titleDX, y: titleDY }}>
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
                  <feFlood floodColor="#0b1f1a" floodOpacity="0.55" result="tint" />
                  <feComposite in="tint" in2="off" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <text
                className="dd-enter dd-enter-track dd-delay-2"
                x="450"
                y="48"
                textAnchor="middle"
                fill="#f3eee4"
                filter="url(#dd-title-pop)"
                style={{
                  fontFamily: "var(--font-nav), DM Sans, sans-serif",
                  fontSize: "22px",
                  letterSpacing: "0.55em",
                }}
              >
                MYSURU
              </text>
              <text
                className="dd-enter dd-enter-title dd-delay-3"
                x="450"
                y="155"
                textAnchor="middle"
                fill="#f3eee4"
                filter="url(#dd-title-pop)"
                style={{
                  fontFamily: "var(--font-display), Cormorant Garamond, serif",
                  fontSize: "122px",
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                }}
              >
                Decca
                <tspan ref={nRef} dx="0">
                  n
                </tspan>
                {" Dwell"}
              </text>
              <text
                className="dd-enter dd-enter-up dd-delay-5"
                x="450"
                y="232"
                textAnchor="middle"
                fill="#efe4c8"
                filter="url(#dd-title-pop)"
                style={{
                  fontFamily: "var(--font-display), Cormorant Garamond, serif",
                  fontStyle: "italic",
                  fontSize: "30px",
                  letterSpacing: "0.04em",
                }}
              >
                a home away from home
              </text>
            </svg>
            </motion.div>
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
            className="absolute bottom-[19%] left-1/2 origin-center will-change-transform md:bottom-[16%]"
          >
            <a
              ref={bookBtnRef}
              href="#book"
              data-magnetic
              className="dd-enter dd-enter-up dd-delay-6 pointer-events-auto block cursor-pointer whitespace-nowrap border border-[#c5a059] bg-[rgba(6,22,19,0.5)] px-16 py-8 font-[family-name:var(--font-nav)] text-[38px] uppercase tracking-[0.32em] text-[#f3eee4] backdrop-blur-[6px] transition-colors duration-500 hover:bg-[#c5a059] hover:text-[#0b2a24]"
            >
              Reserve your stay
            </a>
          </motion.div>
        </div>

        <div
          ref={exploreRef}
          className="absolute inset-x-0 bottom-7 z-30 flex items-end justify-between px-[var(--dd-gutter)]"
        >
          <p className="dd-enter dd-enter-fade dd-delay-8 hidden font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.3em] text-[var(--dd-cream)]/70 md:block">
            Mysuru · Karnataka
          </p>

          <a
            href="#welcome"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[var(--dd-cream)]"
          >
            <span className="dd-enter dd-enter-up dd-delay-8 flex flex-col items-center gap-3"
          >
            <span className="font-[family-name:var(--font-nav)] text-[9.5px] uppercase tracking-[0.38em] text-[var(--dd-cream)]/80">
              Scroll
            </span>
            <span className="relative block h-12 w-px overflow-hidden bg-[var(--dd-cream)]/20">
              <motion.span
                className="absolute inset-x-0 top-0 h-1/2 bg-[var(--dd-gold)]"
                animate={{ y: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: [0.76, 0, 0.24, 1] }}
              />
            </span>
            </span>
          </a>

          <p className="dd-enter dd-enter-fade dd-delay-8 hidden font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.3em] text-[var(--dd-cream)]/70 md:block">
            Chamundi Hills Road
          </p>
        </div>
      </div>
    </section>
  );
}
