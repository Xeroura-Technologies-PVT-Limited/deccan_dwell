import type { RoomType } from "./types";
import { EXTRA_BED_INR } from "./hotel";

/** Catalog shown on the site. Seeded into the DB so bookings can reference it. */
export const ROOM_TYPES: RoomType[] = [
  {
    id: "rt_executive",
    name: "Executive",
    slug: "executive",
    kind: "room",
    subtitle: "Double occupancy",
    description:
      "A calm Mysuru room for two — compact, comfortable, and close to Chamundi Hills.",
    amenities: ["Double occupancy", "Ensuite", "AC", "Wi‑Fi"],
    occupancy: 2,
    maxGuests: 3,
    totalUnits: 3,
    basePriceInr: 1500,
    image: "/images/room-deluxe.jpg",
  },
  {
    id: "rt_premium",
    name: "Premium",
    slug: "premium",
    kind: "room",
    subtitle: "Without balcony",
    description:
      "A quieter premium room for two, without a balcony — soft linens and garden light.",
    amenities: ["Double occupancy", "Without balcony", "Ensuite", "AC", "Wi‑Fi"],
    occupancy: 2,
    maxGuests: 3,
    totalUnits: 3,
    basePriceInr: 2000,
    image: "/images/room-deluxe.jpg",
  },
  {
    id: "rt_premium_deluxe",
    name: "Premium Deluxe",
    slug: "premium-deluxe",
    kind: "room",
    subtitle: "With balcony",
    description:
      "Premium deluxe with a balcony — the same modern comforts, with a little more air and view.",
    amenities: ["Double occupancy", "Balcony", "Ensuite", "AC", "Wi‑Fi"],
    occupancy: 2,
    maxGuests: 3,
    totalUnits: 3,
    basePriceInr: 2500,
    image: "/images/room-deluxe.jpg",
  },
  {
    id: "rt_suite_g",
    name: "Suite G",
    slug: "suite-g",
    kind: "suite",
    subtitle: "Ground floor · 3 BHK with dining",
    description:
      "Ground-floor 3 BHK suite with a dining area — made for families and longer stays.",
    amenities: ["3 BHK", "Dining area", "Ground floor", "AC", "Wi‑Fi"],
    occupancy: 6,
    maxGuests: 6,
    totalUnits: 2,
    basePriceInr: 5000,
    image: "/images/room-suite.jpg",
  },
  {
    id: "rt_suite_f",
    name: "Suite F",
    slug: "suite-f",
    kind: "suite",
    subtitle: "First floor · 3 BHK · 2 extra balconies",
    description:
      "First-floor 3 BHK with dining and two extra balconies — space to spread out.",
    amenities: ["3 BHK", "Dining area", "2 extra balconies", "First floor", "AC", "Wi‑Fi"],
    occupancy: 6,
    maxGuests: 6,
    totalUnits: 2,
    basePriceInr: 6000,
    image: "/images/room-suite.jpg",
  },
  {
    id: "rt_suite_s",
    name: "Suite S",
    slug: "suite-s",
    kind: "suite",
    subtitle: "Second floor · 3 BHK · 2 extra balconies",
    description:
      "Second-floor 3 BHK with dining and two extra balconies — Chamundi air a little higher up.",
    amenities: ["3 BHK", "Dining area", "2 extra balconies", "Second floor", "AC", "Wi‑Fi"],
    occupancy: 6,
    maxGuests: 6,
    totalUnits: 2,
    basePriceInr: 6000,
    image: "/images/room-suite.jpg",
  },
];

export function getRoomTypeById(id: string) {
  return ROOM_TYPES.find((r) => r.id === id);
}

export function getRoomTypeBySlug(slug: string) {
  return ROOM_TYPES.find((r) => r.slug === slug);
}

export function extraGuests(room: RoomType, guests: number) {
  return Math.max(0, guests - room.occupancy);
}

export function stayTotalInr(room: RoomType, nights: number, guests: number) {
  if (nights < 1) return 0;
  return room.basePriceInr * nights + EXTRA_BED_INR * extraGuests(room, guests) * nights;
}
