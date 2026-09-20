"use client";

type ReceiptBooking = {
  id: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: string;
  amountInr: number;
  paymentMethod?: string;
  paymentId?: string;
};

function paymentLabel(booking: ReceiptBooking) {
  if (booking.paymentId === "paid_at_hotel") return "Paid at hotel";
  if (booking.paymentMethod === "at_hotel") return "Due at hotel";
  if (booking.paymentMethod === "online") return "Paid online";
  return "Pending";
}

export function BookingReceipt({ booking }: { booking: ReceiptBooking }) {
  function downloadReceipt() {
    window.print();
  }

  return (
    <div className="dd-receipt mt-10 max-w-3xl border border-[var(--dd-gold)]/25 bg-[var(--dd-green)]/40 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--dd-gold)]/20 pb-6">
        <div>
          <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.28em] text-[var(--dd-gold)]">
            Deccan Dwell
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
            Booking confirmed
          </h2>
        </div>
        <button
          type="button"
          onClick={downloadReceipt}
          className="print:hidden border border-[var(--dd-gold)] px-4 py-2 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-cream)] hover:bg-[var(--dd-gold)] hover:text-[var(--dd-green)]"
        >
          Download / print
        </button>
      </div>
      <div className="grid gap-6 py-7 text-sm sm:grid-cols-2">
        <div><p className="text-[var(--dd-cream)]/50">Booking ID</p><p className="mt-1 break-all">{booking.id}</p></div>
        <div><p className="text-[var(--dd-cream)]/50">Status</p><p className="mt-1 capitalize">{booking.status}</p></div>
        <div><p className="text-[var(--dd-cream)]/50">Room</p><p className="mt-1">{booking.roomName}</p></div>
        <div><p className="text-[var(--dd-cream)]/50">Guests</p><p className="mt-1">{booking.guests}</p></div>
        <div><p className="text-[var(--dd-cream)]/50">Check in</p><p className="mt-1">{booking.checkIn} · 12:00 PM</p></div>
        <div><p className="text-[var(--dd-cream)]/50">Check out</p><p className="mt-1">{booking.checkOut} · 11:30 AM</p></div>
        <div>
          <p className="text-[var(--dd-cream)]/50">Guest</p>
          <p className="mt-1">{booking.guestName}</p>
          <p className="text-[var(--dd-cream)]/60">{booking.guestEmail}</p>
          <p className="text-[var(--dd-cream)]/60">{booking.guestPhone}</p>
        </div>
        <div>
          <p className="text-[var(--dd-cream)]/50">Payment</p>
          <p className="mt-1">{paymentLabel(booking)}</p>
          <p className="mt-1 text-lg text-[var(--dd-gold)]">₹{booking.amountInr.toLocaleString("en-IN")}</p>
        </div>
      </div>
      <p className="border-t border-[var(--dd-gold)]/20 pt-5 text-sm text-[var(--dd-cream)]/60">
        Please keep this receipt for your records. We look forward to welcoming you.
      </p>
    </div>
  );
}
