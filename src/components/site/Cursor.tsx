"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Mode = "default" | "link" | "label";

const MAGNET_X = 0.32;
const MAGNET_Y = 0.42;

/**
 * A quiet custom cursor for desktop pointers: a fine dot that tracks the
 * pointer exactly, and a ring that follows with a little inertia.
 *
 * - Over links and buttons the ring swells.
 * - Over anything with `data-cursor="Label"` it becomes a cream disc that
 *   reads the label ("Open", "Scroll", …).
 * - Elements with `data-magnetic` lean toward the pointer and glide back.
 *
 * Touch devices and reduced-motion users keep the native cursor.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("default");
  const [label, setLabel] = useState("");
  const [hidden, setHidden] = useState(true);
  const [tone, setTone] = useState<"dark" | "light">("dark");

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });
  const magnet = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    const root = document.documentElement;
    root.classList.add("dd-has-cursor");
    const raf = requestAnimationFrame(() => setEnabled(true));

    const applied = new WeakMap<HTMLElement, { dx: number; dy: number }>();
    const release = () => {
      if (magnet.current) {
        applied.delete(magnet.current);
        magnet.current.style.transform = "";
        magnet.current = null;
      }
    };

    let lastX = -1;
    let lastY = -1;

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      lastX = e.clientX;
      lastY = e.clientY;
      setHidden(false);
      evaluate(e.target as HTMLElement | null, e.clientX, e.clientY);
    };

    // The page can scroll a different element under a resting pointer.
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf || lastX < 0) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        evaluate(document.elementFromPoint(lastX, lastY) as HTMLElement | null, lastX, lastY);
      });
    };

    const evaluate = (target: HTMLElement | null, px: number, py: number) => {
      if (!target?.closest) return;

      // Ink cursor over the cream "day" sections, cream over the green ones.
      const surface = target.closest(".dd-paper, .dd-paper-2, .dd-night, #home, header");
      setTone(surface?.matches(".dd-paper, .dd-paper-2") ? "light" : "dark");

      if (target.closest("input, textarea, select, [contenteditable='true']")) {
        setHidden(true);
        return;
      }

      const labelled = target.closest<HTMLElement>("[data-cursor]");
      const interactive = target.closest("a, button, [role='button'], summary, label");
      if (labelled && !(interactive && labelled.contains(interactive) && interactive !== labelled)) {
        setMode("label");
        setLabel(labelled.dataset.cursor ?? "");
      } else if (interactive) {
        setMode("link");
      } else {
        setMode("default");
      }

      const m = target.closest<HTMLElement>("[data-magnetic]");
      if (m !== magnet.current) release();
      if (m) {
        if (!m.dataset.magnetReady) {
          // Keep the element's own transitions and add a soft glide for transform.
          const own = getComputedStyle(m).transition;
          const glide = "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
          m.style.transition = own && own !== "all 0s ease 0s" ? `${own}, ${glide}` : glide;
          m.dataset.magnetReady = "1";
        }
        magnet.current = m;
        // Measure the resting position: the rect already includes our offset.
        const r = m.getBoundingClientRect();
        const prev = applied.get(m) ?? { dx: 0, dy: 0 };
        const cx = r.left - prev.dx + r.width / 2;
        const cy = r.top - prev.dy + r.height / 2;
        const dx = (px - cx) * MAGNET_X;
        const dy = (py - cy) * MAGNET_Y;
        applied.set(m, { dx, dy });
        m.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      }
    };

    const onLeave = () => {
      setHidden(true);
      release();
    };
    const onDown = () => root.classList.add("dd-cursor-down");
    const onUp = () => root.classList.remove("dd-cursor-down");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("dd-has-cursor", "dd-cursor-down");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      release();
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <div className="dd-cursor" data-mode={mode} data-tone={tone} data-hidden={hidden} aria-hidden>
      <motion.div className="absolute left-0 top-0" style={{ x: ringX, y: ringY }}>
        <div className="dd-cursor-ring" />
        <div className="dd-cursor-label">{label}</div>
      </motion.div>
      <motion.div className="absolute left-0 top-0" style={{ x, y }}>
        <div className="dd-cursor-dot" />
      </motion.div>
    </div>
  );
}
