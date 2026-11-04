"use client";

import { useMotionValueEvent, useScroll } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * A statement that lights up word by word as it scrolls through the
 * viewport. Wrap words in *asterisks* to set them in gold italics.
 *
 * Opacity is written straight to each word (no re-renders), so it stays
 * smooth even on long passages.
 */
export function ScrollLitText({
  text,
  className = "",
  dim = 0.16,
}: {
  text: string;
  className?: string;
  dim?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = useRef<HTMLSpanElement[]>([]);
  const reduce = useRef(false);

  const tokens = useMemo(() => parseTokens(text), [text]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.88", "end 0.42"] });

  const paint = useCallback(
    (p: number) => {
      const n = words.current.length;
      words.current.forEach((el, i) => {
        if (!el) return;
        const t = reduce.current ? 1 : Math.min(1, Math.max(0, (p * (n + 3) - i) / 3));
        el.style.opacity = (dim + (1 - dim) * t).toFixed(3);
      });
    },
    [dim],
  );

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    paint(scrollYProgress.get());
  }, [paint, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", paint);

  return (
    <p ref={ref} className={className}>
      {tokens.map((t, i) => (
        <span key={i}>
          <span
            ref={(el) => {
              if (el) words.current[i] = el;
            }}
            className={`transition-opacity duration-300 ${
              t.italic ? "italic text-[var(--dd-gold-ink)]" : ""
            }`}
            style={{ opacity: dim }}
          >
            {t.word}
          </span>{" "}
        </span>
      ))}
    </p>
  );
}

/** Splits on whitespace; words between *asterisks* are flagged italic. */
function parseTokens(text: string) {
  const out: { word: string; italic: boolean }[] = [];
  let italic = false;
  for (const raw of text.split(/\s+/)) {
    let word = raw;
    if (word.startsWith("*")) {
      italic = true;
      word = word.slice(1);
    }
    const closes = word.endsWith("*");
    word = word.replace(/\*/g, "");
    out.push({ word, italic });
    if (closes) italic = false;
  }
  return out;
}
