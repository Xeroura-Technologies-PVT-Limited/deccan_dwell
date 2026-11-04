"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * First-load lockup: the big D and the house rise in together, part, and
 * ECCAN / WELL is unmasked between them; the tagline is then written in and
 * the whole overlay lifts away like a curtain to reveal the arch.
 *
 * The play-through is a single CSS timeline (see `.dd-intro` in globals.css)
 * so nothing in JS can cut it short. JS only:
 *   - locks scrolling while the overlay is up,
 *   - adds `.is-leaving` (on schedule, or early on tap / Escape / scroll),
 *   - unmounts once the curtain has lifted.
 *
 * It plays on every full load of the home page. An inline script in the
 * layout marks the document `dd-no-intro` before first paint for other pages
 * and `?intro=0`, so those never flash the overlay.
 *
 * The moment the curtain starts to lift it adds `dd-entered` to <html> and
 * fires `dd:enter`, which cues the hero's entrance choreography.
 *
 * Slices of `/images/logo.png` (979×390):
 *   D 0–151 · word 151–520 · house 520–979
 */
const LOGO_SRC = "/images/logo.png";
const LOGO_W = 979;
const LOGO_H = 390;
const D_END = 151;
const MARK_START = 520;

/** When the lockup has settled and caught the light (ms after navigation). */
const SETTLED_AT = 2800;
/** Exit = lockup lifts away (0.6s) under the curtain lift (0.18s + 1s). */
const EXIT_MS = 1250;

/** Cue the hero entrance (CSS keys off the class; JS listens for the event). */
export function signalEnter() {
  const root = document.documentElement;
  if (root.classList.contains("dd-entered")) return;
  root.classList.add("dd-entered");
  window.dispatchEvent(new Event("dd:enter"));
}

export function IntroSplash() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const timers = useRef<number[]>([]);
  const leavingRef = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const finish = useCallback(() => {
    clearTimers();
    document.documentElement.classList.remove("dd-introing");
    window.dispatchEvent(new Event("dd:intro-done"));
    setGone(true);
  }, []);

  const leave = useCallback(
    (exitMs: number) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      clearTimers();
      setLeaving(true);
      // Let the curtain get a head start, then bring the hero in beneath it.
      timers.current.push(window.setTimeout(signalEnter, 420));
      timers.current.push(window.setTimeout(finish, exitMs));
    },
    [finish],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("dd-no-intro")) {
      // Already hidden by CSS; unmount and bring the hero in on the next frames.
      const id = window.setTimeout(() => {
        finish();
        requestAnimationFrame(() => requestAnimationFrame(signalEnter));
      }, 60);
      return () => window.clearTimeout(id);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const exitMs = reduce ? 520 : EXIT_MS;
    root.classList.add("dd-introing");

    // The CSS timeline started at first paint, not at hydration, so schedule
    // the exit against navigation time — a slow hydrate just shortens the hold.
    const settledAt = reduce ? 900 : SETTLED_AT;
    const wait = Math.max(350, settledAt - performance.now());
    timers.current.push(window.setTimeout(() => leave(exitMs), wait));

    const skip = () => leave(exitMs);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      clearTimers();
      root.classList.remove("dd-introing");
    };
  }, [finish, leave]);

  if (gone) return null;

  return (
    <div
      className={`dd-intro${leaving ? " is-leaving" : ""}`}
      onPointerUp={() => leave(EXIT_MS)}
      role="presentation"
      aria-hidden
    >
      <div className="dd-intro-stage">
        <div className="dd-intro-lockup">
          <LogoSlice className="dd-intro-d" offset={0} width={D_END} />
          <div className="dd-intro-word">
            <LogoSlice offset={D_END} width={MARK_START - D_END} />
          </div>
          <LogoSlice className="dd-intro-mark" offset={MARK_START} width={LOGO_W - MARK_START} />
          <div className="dd-intro-tag">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="" draggable={false} />
          </div>
          <span className="dd-intro-sheen" />
        </div>
        <span className="dd-intro-rule" />
      </div>
    </div>
  );
}

function LogoSlice({
  offset,
  width,
  className = "",
}: {
  offset: number;
  width: number;
  className?: string;
}) {
  return (
    <div
      className={`dd-intro-slice ${className}`.trim()}
      style={{ width: `calc(var(--dd-intro-logo-w) * ${width} / ${LOGO_W})` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt=""
        draggable={false}
        style={{
          width: "var(--dd-intro-logo-w)",
          height: `calc(var(--dd-intro-logo-w) * ${LOGO_H} / ${LOGO_W})`,
          marginLeft: `calc(var(--dd-intro-logo-w) * ${-offset} / ${LOGO_W})`,
        }}
      />
    </div>
  );
}
