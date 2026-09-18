"use client";

import { motion } from "framer-motion";

const moments = [
  {
    n: "01",
    title: "Morning light",
    copy: "Breakfast in the garden hush, with Chamundi Hills on the horizon.",
  },
  {
    n: "02",
    title: "Slow evenings",
    copy: "Palm shadows, soft gold interiors, and space to truly unwind.",
  },
  {
    n: "03",
    title: "Mysuru at your door",
    copy: "Heritage walks, palace evenings, and local flavours minutes away.",
  },
];

export function ExperienceSection() {
  return (
    <section
      id="experience"
      className="relative overflow-hidden bg-[var(--dd-green-deep)] px-6 py-28 md:px-10 lg:px-14"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(197,160,89,0.08),transparent_55%)]" />
      <div className="mx-auto max-w-6xl">
        <p className="font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
          Experience
        </p>
        <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl text-[var(--dd-cream)] md:text-5xl">
          A home away from home at the foothills.
        </h2>

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {moments.map((m, i) => (
            <motion.article
              key={m.n}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
            >
              <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--dd-gold)]">
                {m.n}
              </p>
              <div className="my-4 h-px w-12 bg-[var(--dd-gold)]/50" />
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--dd-cream)]">
                {m.title}
              </h3>
              <p className="mt-3 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--dd-cream)]/65">
                {m.copy}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
