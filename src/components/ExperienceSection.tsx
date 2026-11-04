import { Reveal, RevealImage } from "@/components/site/Reveal";

const MOMENTS = [
  {
    n: "i.",
    title: "Morning light",
    copy: "Wake slowly. The hills are already on the horizon, and the city hasn’t started yet.",
    image: "/images/hero-wide.jpg",
    alt: "Green hills near Mysuru under a soft morning sky",
    position: "50% 60%",
  },
  {
    n: "ii.",
    title: "Slow evenings",
    copy: "Lamplight, warm wood and room to unwind after a day of palaces and markets.",
    image: "/images/story/bedroom.jpg",
    alt: "A Deccan Dwell room in warm evening lamplight",
    position: "70% 50%",
  },
  {
    n: "iii.",
    title: "Mysuru at your door",
    copy: "Heritage walks, the Palace lit on Sunday nights, and the old city’s flavours minutes away.",
    image: "/images/places/palace.jpg",
    alt: "Mysore Palace at dusk",
    position: "50% 40%",
  },
];

export function ExperienceSection() {
  return (
    <section id="experience" className="dd-paper dd-grain dd-section relative overflow-hidden">
      <div className="dd-container">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal className="flex justify-center">
            <p className="dd-eyebrow dd-eyebrow--plain">Experience</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="dd-h2 mt-7">
              Unhurried days, <em>gently</em> kept.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="dd-lead mx-auto mt-7 max-w-[34rem] text-[var(--dd-text-ink)]">
              A stay here moves at Mysuru&rsquo;s pace — early light, long walks, and evenings
              that ask for nothing.
            </p>
          </Reveal>
        </div>

        <div className="mt-[clamp(64px,8vw,120px)] grid gap-16 md:grid-cols-3 md:gap-8 lg:gap-12">
          {MOMENTS.map((m, i) => (
            <article key={m.title} className={i === 1 ? "md:mt-24" : i === 2 ? "md:mt-12" : ""}>
              <RevealImage
                src={m.image}
                alt={m.alt}
                sizes="(max-width: 768px) 92vw, 30vw"
                className="dd-arch aspect-[3/4] w-full"
                objectPosition={m.position}
                delay={i * 0.12}
              />
              <Reveal delay={0.1 + i * 0.08}>
                <p className="mt-8 font-[family-name:var(--font-display)] text-2xl italic text-[var(--dd-gold-ink)]">
                  {m.n}
                </p>
                <h3 className="dd-h3 mt-2">{m.title}</h3>
                <p className="dd-body mt-4 max-w-[22rem] text-[var(--dd-text-ink)]">{m.copy}</p>
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
