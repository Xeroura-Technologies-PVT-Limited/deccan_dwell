"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_INOUT = [0.76, 0, 0.24, 1] as const;

/** Fade-and-rise as the block enters the viewport. Plays once. */
export function Reveal({
  children,
  delay = 0,
  y = 34,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "p" | "span" | "article";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.15, delay, ease: EASE_OUT }}
    >
      {children}
    </Comp>
  );
}

/**
 * An image that is unveiled by a rising mask, settles from a slight zoom, and
 * then drifts gently against the scroll (parallax) for depth.
 */
export function RevealImage({
  src,
  alt,
  sizes,
  className = "",
  imgClassName = "",
  objectPosition = "50% 50%",
  parallax = 7,
  delay = 0,
  preload = false,
  quality = 90,
  zoom,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  objectPosition?: string;
  /** Drift in % of the frame height. 0 disables parallax. */
  parallax?: number;
  delay?: number;
  preload?: boolean;
  quality?: number;
  /** Crop into the photo: `{ scale: 1.6, origin: "40% 25%" }`. */
  zoom?: { scale: number; origin: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-parallax}%`, `${parallax}%`]);

  // The in-view trigger sits on the unclipped frame: a target that is fully
  // clipped away (inset 100%) never reports as intersecting in Chrome.
  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
    >
      <motion.div
        className="absolute inset-0"
        variants={{
          hidden: { clipPath: "inset(100% 0% 0% 0%)" },
          show: {
            clipPath: "inset(0% 0% 0% 0%)",
            transition: { duration: 1.45, delay, ease: EASE_INOUT },
          },
        }}
      >
        <motion.div
          className="absolute inset-x-0"
          style={{ y, top: `${-parallax}%`, bottom: `${-parallax}%` }}
        >
          <motion.div
            className="absolute inset-0"
            variants={{
              hidden: { scale: 1.16 },
              show: { scale: 1, transition: { duration: 2.2, delay, ease: EASE_OUT } },
            }}
          >
            <div
              className="absolute inset-0"
              style={zoom ? { transform: `scale(${zoom.scale})`, transformOrigin: zoom.origin } : undefined}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes={sizes}
                quality={quality}
                preload={preload}
                className={`object-cover ${imgClassName}`}
                style={{ objectPosition }}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Headline whose lines slide up from behind a mask. The trigger lives on the
 * heading itself — a fully masked line can never register as "in view".
 */
export function RevealLines({
  lines,
  className = "",
  delay = 0,
  as = "h2",
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.1em]">
          <motion.span
            className="block"
            variants={{
              hidden: { y: "110%" },
              show: {
                y: "0%",
                transition: { duration: 1.25, delay: delay + i * 0.1, ease: EASE_OUT },
              },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
