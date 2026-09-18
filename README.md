# Deccan Dwell

Premium animated hotel site for **Deccan Dwell**, Mysuru — with live room availability and Razorpay-ready booking holds.

## Run

```bash
cd deccan-dwell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Hero “camera into the arch”
Scroll the first section: the arched Mysuru window scales up like a push-in shot; chrome (logo, nav, side copy) fades away until the photo fills the frame.

### Room availability (free local stack)
- `GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`
- Inventory in `src/lib/inventory.ts` (in-memory; swap for Supabase later)
- Rooms UI shows **X left** / **All booked**
- Booking creates a **15-minute pending hold**, then confirm via payment

### Booking + Razorpay path
1. `POST /api/bookings` → pending hold + amount
2. Create Razorpay order (amount in paise) — wire `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
3. On success: `PATCH /api/bookings` with `{ bookingId, paymentId }`
4. Prefer Razorpay **webhooks** in production

Demo: use **Demo: Confirm Payment** on the Book section (no gateway keys needed).

## Schema (for Supabase / Postgres later)

```sql
create table room_types (
  id text primary key,
  name text not null,
  slug text unique not null,
  total_units int not null,
  base_price_inr int not null
);

create table bookings (
  id text primary key,
  room_type_id text references room_types(id),
  check_in date not null,
  check_out date not null,
  guests int not null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  status text not null, -- pending | confirmed | cancelled | expired
  amount_inr int not null,
  payment_id text,
  hold_expires_at timestamptz,
  created_at timestamptz default now()
);
```

## Brand assets

- Logo: `public/images/logo.jpg` (exact client logo)
- Hero: `public/images/hero-mysuru.png`
