export type BookingStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type RoomType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  amenities: string[];
  totalUnits: number;
  basePriceInr: number;
  image: string;
};

export type Booking = {
  id: string;
  roomTypeId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: BookingStatus;
  amountInr: number;
  paymentId?: string;
  holdExpiresAt?: string;
  createdAt: string;
};

export type AvailabilityResult = {
  roomTypeId: string;
  name: string;
  slug: string;
  totalUnits: number;
  bookedUnits: number;
  availableUnits: number;
  soldOut: boolean;
  basePriceInr: number;
  nights: number;
  totalPriceInr: number;
};
