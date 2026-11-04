"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { scrollToTarget, setLenis } from "@/lib/smooth-scroll";

/**
 * Inertial smooth scrolling for the home page (desktop wheel / trackpad;
 * touch keeps native momentum). Lenis drives the real window scroll position,
 * so framer-motion's `useScroll` and sticky positioning keep working.
 *
 * Also takes over in-page `#anchor` links so they glide instead of jump.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lenis: Lenis | null = null;
    if (!reduce) {
      lenis = new Lenis({
        lerp: 0.085,
        wheelMultiplier: 0.9,
        autoRaf: true,
        // While the intro overlay is up, swallow wheel input entirely.
        virtualScroll: () => !document.documentElement.classList.contains("dd-introing"),
      });
      setLenis(lenis);
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href^='#']");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.length < 2) return;
      const id = href.slice(1).split("?")[0];
      if (!document.getElementById(id)) return;
      event.preventDefault();
      if (href.includes("?")) {
        window.history.replaceState(null, "", href);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
      scrollToTarget(id);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
