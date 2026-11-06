import { CHECK_IN_TIME, CHECK_OUT_TIME, HOTEL } from "@/lib/hotel";
import { ROOM_TYPES } from "@/lib/rooms";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

/** "12:00 pm" → "12:00", "11:30 am" → "11:30" (schema.org wants 24h). */
function to24h(t: string) {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return t;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "pm") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * Hotel structured data for Google (rich results, Maps/knowledge panel).
 * Built from the same constants the site shows, so it never drifts.
 */
export function HotelJsonLd() {
  const prices = ROOM_TYPES.map((r) => r.basePriceInr);
  const data = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "@id": `${SITE_URL}/#hotel`,
    name: HOTEL.name,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    slogan: "A home away from home",
    image: [`${SITE_URL}/og-image.jpg`, `${SITE_URL}/images/building-exterior.jpg`, `${SITE_URL}/images/room-deluxe.jpg`, `${SITE_URL}/images/room-suite.jpg`],
    logo: `${SITE_URL}/images/logo.png`,
    email: HOTEL.email,
    telephone: HOTEL.phones.map((p) => p.href.replace("tel:", "")),
    priceRange: `₹${Math.min(...prices).toLocaleString("en-IN")} – ₹${Math.max(...prices).toLocaleString("en-IN")}`,
    currenciesAccepted: "INR",
    checkinTime: to24h(CHECK_IN_TIME),
    checkoutTime: to24h(CHECK_OUT_TIME),
    numberOfRooms: ROOM_TYPES.reduce((n, r) => n + r.totalUnits, 0),
    address: {
      "@type": "PostalAddress",
      streetAddress: "No. 24, Chamundi Hills Main Road, Nazarbadh Mohalla, JC Nagar",
      addressLocality: "Mysuru",
      addressRegion: "Karnataka",
      postalCode: "570011",
      addressCountry: "IN",
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Deccan Dwell, ${HOTEL.address}`)}`,
    amenityFeature: ["Air conditioning", "Free Wi-Fi", "Ensuite bathrooms", "Family suites", "Balcony rooms"].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    containsPlace: ROOM_TYPES.map((r) => ({
      "@type": r.kind === "suite" ? "Suite" : "HotelRoom",
      name: r.name,
      description: r.description,
      occupancy: { "@type": "QuantitativeValue", maxValue: r.maxGuests },
    })),
    makesOffer: ROOM_TYPES.map((r) => ({
      "@type": "Offer",
      name: `${r.name} — per night`,
      price: r.basePriceInr,
      priceCurrency: "INR",
      url: `${SITE_URL}/#book`,
      availability: "https://schema.org/InStock",
    })),
  };
  return (
    <script
      type="application/ld+json"
      // JSON from our own constants; "<" is escaped so it can't close the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
