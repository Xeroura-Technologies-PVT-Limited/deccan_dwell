"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * First-load lockup: the big D and the house sit together, then move apart
 * so ECCAN / WELL is revealed between them. Click or Escape skips.
 *
 * Slices of `/images/logo.png` (979×390):
 *   D 0–151 · word 151–520 · house 520–979
 */
const LOGO_SRC = "/images/logo.png";
const LOGO_W = 979;
const LOGO_H = 390;
const D_END = 151;
const MARK_START = 520;

type Phase = "cluster" | "open" | "bye";

export function IntroSplash() {
  const [phase, setPhase] = useState<Phase>("cluster");
  const [gone, setGone] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const finish = useCallback(() => {
    document.documentElement.classList.remove("dd-introing");
    setGone(true);
  }, []);

  const skip = useCallback(() => {
    clearTimers();
    setPhase("open");
    later(() => setPhase("bye"), 280);
    later(finish, 900);
  }, [finish]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("intro") === "0") {
      finish();
      return;
    }
    if (window.location.pathname !== "/") {
      finish();
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("dd-introing");

    if (reduce) {
      setPhase("open");
      later(() => setPhase("bye"), 500);
      later(finish, 1100);
      return () => {
        clearTimers();
        document.documentElement.classList.remove("dd-introing");
      };
    }

    later(() => setPhase("open"), 720);
    later(() => setPhase("bye"), 3100);
    later(finish, 3900);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimers();
      document.documentElement.classList.remove("dd-introing");
    };
  }, [finish, skip]);

  if (gone) return null;

  return (
    <div
      className={`dd-intro dd-intro--${phase}`}
      data-dd-intro={phase}
      onClick={skip}
      role="dialog"
      aria-label="Deccan Dwell"
      aria-modal="true"
    >
      <div className="dd-intro-lockup" aria-hidden>
        <LogoSlice className="dd-intro-d" offset={0} width={D_END} />
        <div className="dd-intro-word">
          <LogoSlice offset={D_END} width={MARK_START - D_END} />
        </div>
        <LogoSlice className="dd-intro-mark" offset={MARK_START} width={LOGO_W - MARK_START} />
        <div className="dd-intro-tag">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" draggable={false} />
        </div>
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
