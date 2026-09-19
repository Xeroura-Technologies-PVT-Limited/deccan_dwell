export type BookingStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type RoomKind = "room" | "suite";

export type RoomType = {
  id: string;
  name: string;
  slug: string;
  kind: RoomKind;
  subtitle: string;
  description: string;
  amenities: string[];
  occupancy: number;
  maxGuests: number;
  totalUnits: number;
  basePriceInr: number;
  image: string;
};

export type PaymentMethod = "online" | "at_hotel";

export type Booking = {
  id: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: BookingStatus;
  amountInr: number;
  depositInr?: number;
  paymentId?: string;
  paymentMethod?: PaymentMethod;
  razorpayOrderId?: string;
  holdExpiresAt?: string;
  createdAt: string;
  userId?: string;
};

export type CalendarDay = {
  date: string;
  booked: number;
  remaining: number;
  total: number;
  soldOut: boolean;
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
  calendar: CalendarDay[];
};
