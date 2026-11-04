import { Reveal, RevealImage, RevealLines } from "./Reveal";
import { ScrollLitText } from "./ScrollLitText";
import { CHECK_IN_TIME, CHECK_OUT_TIME } from "@/lib/hotel";

const FACTS = [
  { label: "Rooms", value: "Executive · Premium · Premium Deluxe" },
  { label: "Suites", value: "Three bedrooms, with dining" },
  { label: "Check-in · out", value: `${CHECK_IN_TIME} · ${CHECK_OUT_TIME}` },
  { label: "Mysore Palace", value: "6 km away" },
];

/**
 * The first "day" section. It rises over the pinned hero as a curtain with a
 * low dome — the arch, once more.
 */
export function WelcomeSection() {
  return (
    <section
      id="welcome"
      className="dd-paper dd-grain dd-curtain relative z-10 -mt-[var(--dd-hero-h,100vh)] overflow-hidden"
    >
      <div className="dd-container pb-[clamp(96px,12vw,176px)] pt-[clamp(128px,15vw,220px)]">
        <Reveal className="flex justify-center">
          <p className="dd-eyebrow dd-eyebrow--plain">Welcome to Deccan Dwell</p>
        </Reveal>
        <RevealLines
          as="h2"
          className="dd-display mx-auto mt-8 text-center"
          lines={[
            <span key="l1">A quiet house at the foot</span>,
            <span key="l2">
              of <em>Chamundi Hills</em>.
            </span>,
          ]}
        />

        <ScrollLitText
          className="mx-auto mt-[clamp(56px,7vw,104px)] max-w-[30ch] text-center font-[family-name:var(--font-display)] text-[clamp(1.7rem,3.1vw,2.9rem)] leading-[1.28] text-[var(--dd-text-ink)]"
          text="A modern stay on Chamundi Hills Road — *calm rooms for two,* *generous three-bedroom suites* for families, and the Palace and the old city a short drive away."
        />

        <div className="mt-[clamp(72px,9vw,140px)] grid items-end gap-14 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5 md:col-start-1">
            <RevealImage
              src="/images/story/bedroom.jpg"
              alt="A Deccan Dwell bedroom — warm wood, soft lamplight and a garden window"
              sizes="(max-width: 768px) 92vw, 40vw"
              className="dd-arch aspect-[3/4] w-full"
              objectPosition="58% 50%"
            />
          </div>

          <div className="md:col-span-6 md:col-start-7 md:pb-6">
            <Reveal>
              <p className="dd-lead max-w-[32rem] text-[var(--dd-text-ink)]">
                Come for a weekend of palaces and temples, or settle in for longer. Either way the
                idea is simple: a home away from home, kept quietly and well.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <dl className="mt-12 grid grid-cols-2 gap-x-8 border-t border-[var(--dd-line-light)]">
                {FACTS.map((f) => (
                  <div key={f.label} className="border-b border-[var(--dd-line-light)] py-5">
                    <dt className="dd-meta !text-[10px] text-[var(--dd-gold-ink)]">{f.label}</dt>
                    <dd className="mt-2 font-[family-name:var(--font-display)] text-[1.3rem] leading-snug text-[var(--dd-text-ink)]">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={0.2} className="mt-12 flex flex-wrap items-center gap-6">
              <a href="#rooms" data-magnetic className="dd-btn dd-btn--ink">
                Discover the rooms <span className="dd-arrow" aria-hidden>→</span>
              </a>
              <a href="#mysuru" className="dd-link text-[var(--dd-text-ink)]">
                The neighbourhood
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
