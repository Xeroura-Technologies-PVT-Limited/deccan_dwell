"use client";

import { motion } from "framer-motion";

/** The footer wordmark — letters rise one after another from below. */
export function WordmarkRise({ text, className = "" }: { text: string; className?: string }) {
  return (
    <motion.p
      aria-hidden
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -5% 0px" }}
    >
      {Array.from(text).map((ch, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "105%" },
              show: {
                y: "0%",
                transition: { duration: 1.2, delay: i * 0.045, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {ch === " " ? " " : ch}
          </motion.span>
        </span>
      ))}
    </motion.p>
  );
}
