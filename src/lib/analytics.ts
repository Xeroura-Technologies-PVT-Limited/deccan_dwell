/**
 * Google Analytics 4 helpers. Everything is a no-op until
 * NEXT_PUBLIC_GA_ID is set, and nothing personal (name, email, phone) is
 * ever sent — only room, dates-free amounts and booking ids.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

/** Pages that never load analytics (they carry guest details in the URL). */
export const PRIVATE_PATHS = /^\/(admin|account|booking|login|signup)(\/|$)/;

type Gtag = (...args: unknown[]) => void;

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!GA_ID || !gtag) return;
  gtag("event", event, { ...params, transport_type: "beacon" });
}
