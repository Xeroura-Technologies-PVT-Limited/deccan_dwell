"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ReactLenis from "lenis/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

interface CardData {
  id: number | string;
  image: string;
  alt?: string;
}

interface StickyCard002Props {
  cards: CardData[];
  className?: string;
  containerClassName?: string;
  imageClassName?: string;
  /** Full-viewport stack (for post-hero handoff) instead of centered card */
  fullBleed?: boolean;
}

function waitForImages(images: HTMLImageElement[]) {
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );
}

const StickyCard002 = ({
  cards,
  className,
  containerClassName,
  imageClassName,
  fullBleed = false,
}: StickyCard002Props) => {
  const container = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const stickyEl = stickyRef.current;
      const frameEl = frameRef.current;
      if (!stickyEl || !frameEl) return;

      let killed = false;
      let scrollTimeline: gsap.core.Timeline | null = null;
      let resizeObserver: ResizeObserver | null = null;

      const setup = async () => {
        const imageElements = imageRefs.current.filter(Boolean) as HTMLImageElement[];
        const totalCards = imageElements.length;
        if (!imageElements[0] || totalCards < 1) return;

        await waitForImages(imageElements);
        if (killed) return;

        // Stable stacking: each next card sits above the previous
        imageElements.forEach((img, i) => {
          gsap.set(img, {
            zIndex: i + 1,
            force3D: true,
            transformOrigin: "50% 50%",
            willChange: "transform",
          });
        });

        gsap.set(imageElements[0], { yPercent: 0, scale: 1, rotation: 0 });
        for (let i = 1; i < totalCards; i++) {
          gsap.set(imageElements[i], { yPercent: 100, scale: 1, rotation: 0 });
        }

        scrollTimeline = gsap.timeline({
          defaults: { ease: "none", force3D: true },
          scrollTrigger: {
            trigger: stickyEl,
            start: "top top",
            end: () => `+=${window.innerHeight * Math.max(1, totalCards - 1)}`,
            pin: true,
            scrub: true, // 1:1 with scroll — no laggy catch-up glitch
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            fastScrollEnd: true,
          },
        });

        const outScale = fullBleed ? 0.88 : 0.7;
        const outRot = fullBleed ? 2.5 : 5;

        for (let i = 0; i < totalCards - 1; i++) {
          const currentImage = imageElements[i];
          const nextImage = imageElements[i + 1];
          const position = i;

          // Outgoing card shrinks/rotates behind the incoming one
          scrollTimeline.to(
            currentImage,
            {
              scale: outScale,
              rotation: outRot,
              duration: 1,
            },
            position,
          );

          // Incoming card slides up to cover
          scrollTimeline.to(
            nextImage,
            {
              yPercent: 0,
              duration: 1,
            },
            position,
          );
        }

        resizeObserver = new ResizeObserver(() => {
          ScrollTrigger.refresh();
        });
        resizeObserver.observe(stickyEl);

        // One refresh after images + layout settle (avoids first-frame jump)
        requestAnimationFrame(() => ScrollTrigger.refresh());
      };

      void setup();

      return () => {
        killed = true;
        resizeObserver?.disconnect();
        scrollTimeline?.scrollTrigger?.kill();
        scrollTimeline?.kill();
      };
    },
    { scope: container, dependencies: [cards.length, fullBleed] },
  );

  return (
    <div className={cn("relative h-full w-full", className)} ref={container}>
      <div
        ref={stickyRef}
        className={cn(
          "sticky-cards relative flex h-full w-full items-center justify-center overflow-hidden bg-black",
          fullBleed ? "p-0" : "p-3 lg:p-8",
        )}
      >
        <div
          ref={frameRef}
          className={cn(
            fullBleed
              ? "relative h-full w-full overflow-hidden bg-black"
              : "relative h-[90%] w-full max-w-sm overflow-hidden rounded-lg bg-black sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl",
            containerClassName,
          )}
        >
          {cards.map((card, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- GSAP needs direct DOM refs
            <img
              key={card.id}
              src={card.image}
              alt={card.alt || ""}
              draggable={false}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "auto"}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                fullBleed ? "rounded-none" : "rounded-4xl",
                imageClassName,
              )}
              style={{ zIndex: i + 1 }}
              ref={(el) => {
                imageRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Skiper17 = () => {
  const defaultCards = [
    { id: 1, image: "/images/lummi/img14.png" },
    { id: 2, image: "/images/lummi/img15.png" },
    { id: 3, image: "/images/lummi/img29.png" },
    { id: 4, image: "/images/lummi/img21.png" },
    { id: 5, image: "/images/lummi/img27.png" },
  ];

  return (
    <ReactLenis root>
      <div className="h-full w-full">
        <StickyCard002 cards={defaultCards} />
      </div>
    </ReactLenis>
  );
};

export { Skiper17, StickyCard002 };

/**
 * Skiper 17 StickyCard_002 — React + Gsap + scrollTrigger
 * Inspired rebuild; attribution to Skiper UI (free tier).
 * Author: @gurvinder-singh02 — https://gxuri.me
 */
