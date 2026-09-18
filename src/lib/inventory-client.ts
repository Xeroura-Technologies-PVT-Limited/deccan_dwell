import type { RoomType } from "./types";

/** Client-safe room catalog (no booking state). */
export const ROOM_TYPES: RoomType[] = [
  {
    id: "rt_deluxe",
    name: "Deluxe Room",
    slug: "deluxe",
    description:
      "Spacious stays with modern comforts — soft linens, garden light, and a calm Mysuru retreat.",
    amenities: ["King bed", "Garden view", "Ensuite", "Breakfast", "AC", "Wi‑Fi"],
    totalUnits: 4,
    basePriceInr: 4500,
    image: "/images/room-deluxe.jpg",
  },
  {
    id: "rt_suite",
    name: "Heritage Suite",
    slug: "suite",
    description:
      "At the foothills of Chamundi Hills — a generous suite for longer stays and quiet evenings.",
    amenities: ["Living area", "Hill view", "Bathtub", "Breakfast", "AC", "Wi‑Fi"],
    totalUnits: 2,
    basePriceInr: 7500,
    image: "/images/room-suite.jpg",
  },
];
