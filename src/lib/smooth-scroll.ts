import type Lenis from "lenis";

/**
 * The page's Lenis instance, when smooth scrolling is active. Kept in a module
 * so the header, buttons and sections can scroll programmatically without
 * prop-drilling or context.
 */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}

/** Height of the fixed header, so anchored sections don't tuck under it. */
const HEADER_OFFSET = 0;

/** Smooth-scroll to `#id` (or an element); falls back to native scrolling. */
export function scrollToTarget(target: string | HTMLElement, offset = HEADER_OFFSET) {
  const el =
    typeof target === "string"
      ? document.getElementById(target.replace(/^#/, "").split("?")[0])
      : target;
  if (!el) return;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.6 });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
}
