"use client";

import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { useRef } from "react";

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * A slow river of words that speeds up — and changes direction — with the
 * reader's scroll, then eases back to its own pace.
 */
export function Marquee({
  items,
  baseVelocity = 1.6,
  className = "",
}: {
  items: string[];
  baseVelocity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "200px 0px" });
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [0, 1000], [0, 4], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);
  const direction = useRef(-1);

  useAnimationFrame((_, delta) => {
    if (!inView) return;
    const f = factor.get();
    if (f < 0) direction.current = 1;
    else if (f > 0) direction.current = -1;
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    moveBy += direction.current * Math.abs(moveBy) * Math.abs(f);
    baseX.set(baseX.get() + moveBy);
  });

  const row = (copy: number) => (
    <span className="flex" aria-hidden={copy > 0}>
      {items.map((item, i) => (
        <span key={`${copy}-${i}`} className="dd-marquee-item">
          <span className={i % 2 === 1 ? "dd-marquee-outline" : ""}>{item}</span>
          <span className="dd-marquee-star">✦</span>
        </span>
      ))}
    </span>
  );

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div className="dd-marquee-track" style={{ x }}>
        {row(0)}
        {row(1)}
      </motion.div>
    </div>
  );
}
