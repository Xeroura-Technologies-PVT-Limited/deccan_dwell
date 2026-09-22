# Deccan Dwell

Premium animated hotel site for **Deccan Dwell**, Mysuru — with live room availability and Razorpay-ready booking holds.

## Run Locally

```bash
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app uses a Supabase PostgreSQL database through Prisma. Copy `.env.example` to `.env` and fill in the database password before running the app.

## Database Setup

Prisma uses two Supabase pooler URLs:

- `DATABASE_URL`: shared transaction-mode pooler for application runtime.
- `DIRECT_URL`: shared session-mode pooler for Prisma schema commands.

The expected format is:

```env
DATABASE_URL="postgresql://postgres.ducyaivfqpiadmjdcufz:YOUR_DATABASE_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.ducyaivfqpiadmjdcufz:YOUR_DATABASE_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

Replace `YOUR_DATABASE_PASSWORD` with the password from Supabase Dashboard → Connect → ORM → Prisma. Do not commit `.env`.

Create or update the remote schema and seed the room catalog and admin user:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
npx prisma db push
npm run db:seed
```

If Prisma reports that `DIRECT_URL` is missing, add both variables to `.env` and clear any stale PowerShell environment overrides with the commands above. The previous local SQLite database is not migrated automatically.

## Features

### Hero “camera into the arch”
Scroll the first section: the arched Mysuru window scales up like a push-in shot; chrome (logo, nav, side copy) fades away until the photo fills the frame.

### Room availability
- Supabase PostgreSQL database managed through Prisma
- Each booking writes one row per occupied night, so the calendar can show **how many rooms are left on each day**
- `GET /api/availability?month=YYYY-MM&roomTypeId=rt_executive`
- `GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`
- Pending holds last 15 minutes, then those nights free up again
- A Vercel cron job calls `/api/cron/expire-bookings` every five minutes to expire unpaid holds automatically

### Booking and confirmation
1. Guest selects a room, dates, guests, and contact details.
2. `POST /api/bookings` saves the reservation in Supabase.
3. Pay-at-hotel bookings are confirmed immediately.
4. Successful bookings redirect to `/booking/[bookingId]`.
5. The confirmation page provides a print/download-as-PDF receipt.
6. Guests can recover a booking at `/booking/lookup` using the booking ID and reservation email.

Booking lookup is protected by both booking ID and normalized guest email. A mismatched email does not reveal booking details.

### Admin operations

The protected `/admin` dashboard includes:

- Arrivals, departures, occupancy, booked revenue, and collected revenue for a selected day
- A month-based booking calendar with room filtering
- Status updates for pending, confirmed, checked in, checked out, cancelled, and expired bookings
- Admin notes on individual bookings
- CSV export at `/api/admin/bookings/export`
- Room price, unit count, image path, name, and description management
- Review of guest cancellation and date-change requests

Signed-in guests can request a cancellation or new dates from `/account`. Requests are saved for hotel review; approving a date change checks availability and moves the booking nights transactionally. Set `CRON_SECRET` in production so the expiry endpoint only accepts the scheduled job.

### Razorpay online payment

Online payment is currently disabled in the booking UI until Razorpay credentials are configured. The backend still contains the Razorpay order, verification, and webhook flow for later activation.

Add keys to `.env` for local development or your deployment provider's environment settings (see `.env.example`):

```bash
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_WEBHOOK_SECRET=...
```

## API Routes

### Public

- `GET /api/availability?month=YYYY-MM&roomTypeId=ROOM_ID`
- `GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`
- `POST /api/bookings`
- `GET /api/bookings/lookup?bookingId=BOOKING_ID&email=GUEST_EMAIL`
- `GET /booking/lookup`
- `GET /booking/BOOKING_ID?email=GUEST_EMAIL`

### Authentication and account

- `POST /api/auth` for login or registration
- `DELETE /api/auth` to sign out
- `GET /api/auth` to read the current session
- `/account` for signed-in guest bookings

### Payments

- `POST /api/payments/verify` for Razorpay checkout verification
- `POST /api/webhooks/razorpay` for Razorpay payment webhooks

## Prisma Schema

The database schema is defined in `prisma/schema.prisma`. It includes room types, users, bookings, and one `BookingNight` row per occupied night. Run `npx prisma db push` after schema changes.

## Environment Variables

Required locally:

```env
DATABASE_URL=...
DIRECT_URL=...
AUTH_SECRET=use-a-long-random-production-secret
```

Optional integrations are documented in `.env.example`:

- `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, and `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`

Use strong, unique production values for `AUTH_SECRET`, the admin password, and database credentials. Rotate any credential that has been exposed.

## Legacy SQL Reference

The following is an older conceptual schema reference. The Prisma schema is the source of truth for the live Supabase database.

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
