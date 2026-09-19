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

### Room availability
- SQLite database at `prisma/dev.db` (swap `DATABASE_URL` to Postgres/Supabase later)
- Each booking writes one row per occupied night, so the calendar can show **how many rooms are left on each day**
- `GET /api/availability?month=YYYY-MM&roomTypeId=rt_deluxe`
- `GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`
- Pending holds last 15 minutes, then those nights free up again

### Booking + Razorpay
1. Guest picks dates on the calendar and pays on the site
2. `POST /api/bookings` holds the nights and creates a Razorpay order
3. Razorpay Checkout opens in the page
4. `POST /api/payments/verify` checks the signature and confirms the stay
5. Production: Razorpay webhook `POST /api/webhooks/razorpay` (`payment.captured`)

Add keys to `.env.local` (see `.env.example`):

```bash
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_WEBHOOK_SECRET=...
```

Then:

```bash
npx prisma db push
npm run db:seed
npm run dev
```

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
  status text not null,
  amount_inr int not null,
  payment_id text,
  razorpay_order_id text unique,
  hold_expires_at timestamptz,
  created_at timestamptz default now()
);

create table booking_nights (
  id text primary key,
  booking_id text references bookings(id) on delete cascade,
  room_type_id text references room_types(id),
  night date not null
);
```

## Brand assets

- Logo: `public/images/logo.jpg` (exact client logo)
- Hero: `public/images/hero-mysuru.png`
