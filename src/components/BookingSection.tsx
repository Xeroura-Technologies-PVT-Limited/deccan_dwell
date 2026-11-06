"use client";

import { readJson } from "@/lib/http";
import { track } from "@/lib/analytics";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import Link from "next/link";
import { ROOM_TYPES, extraGuests, stayTotalInr } from "@/lib/inventory-client";
import type { RoomType } from "@/lib/types";
import { EXTRA_BED_INR, HOUSE_RULES, CHECK_IN_TIME, CHECK_OUT_TIME, HOTEL } from "@/lib/hotel";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import Image from "next/image";
import { Reveal } from "@/components/site/Reveal";
import { todayISO as indiaToday } from "@/lib/dates";
import type { AvailabilityResult, CalendarDay } from "@/lib/types";
import { AvailabilityCalendar, shiftMonth } from "@/components/AvailabilityCalendar";
import {
  loadRazorpayScript,
  type RazorpayCheckoutResponse,
} from "@/lib/razorpay-browser";

type PaymentSession = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  amountInr: number;
  holdMinutes: number;
};

const ONLINE_PAYMENTS_ENABLED = false;

export function BookingSection() {
  const today = indiaToday();
  const [rooms, setRooms] = useState<RoomType[]>(ROOM_TYPES);
  const [roomTypeId, setRoomTypeId] = useState(ROOM_TYPES[0].id);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "held" | "paid" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [days, setDays] = useState<CalendarDay[] | null>(null);
  const [daysNext, setDaysNext] = useState<CalendarDay[] | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [quote, setQuote] = useState<AvailabilityResult | null>(null);
  /** Wizard step: 1 room · 2 dates · 3 details. `dir` drives the slide direction. */
  const [step, setStep] = useState(1);
  /** Room the guest is hovering in step i — previewed in the summary card. */
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dir, setDir] = useState(1);

  const room = useMemo(
    () => rooms.find((r) => r.id === roomTypeId),
    [roomTypeId, rooms],
  );


  useEffect(() => {
    fetch("/api/rooms")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await readJson(response);
        if (Array.isArray(data.rooms) && data.rooms.length > 0) setRooms(data.rooms);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!room) return;
    if (guests > room.maxGuests) setGuests(room.maxGuests);
  }, [room, guests]);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const res = await fetch("/api/auth");
      const data = await readJson(res);
      if (cancelled || !data.user || data.user.role === "admin") return;
      if (data.user.name) setGuestName(data.user.name);
      if (data.user.email) setGuestEmail(data.user.email);
      if (data.user.phone) setGuestPhone(data.user.phone);
    }
    loadUser().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // `#book?room=…&in=…&out=…` preselects a stay — on load, and whenever a
    // "Reserve" link elsewhere on the page updates the hash.
    const apply = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#book")) return;
      const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
      const params = new URLSearchParams(query);
      const slug = params.get("room");
      const found = rooms.find((r) => r.slug === slug);
      if (found) setRoomTypeId(found.id);
      const inn = params.get("in");
      const out = params.get("out");
      if (inn) {
        setCheckIn(inn);
        setMonth(inn.slice(0, 7));
      }
      if (out) setCheckOut(out);
      if (found || inn) {
        setDir(1);
        setStep(inn && out ? 3 : 2);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [rooms]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCalLoading(true);
      // Two months side by side, like a hotel reservation engine.
      const fetchMonth = async (m: string) => {
        const res = await fetch(`/api/availability?month=${m}&roomTypeId=${roomTypeId}`);
        if (!res.ok) throw new Error("Could not load calendar");
        const data = await readJson(res);
        return data.days as CalendarDay[];
      };
      try {
        const [a, b] = await Promise.all([fetchMonth(month), fetchMonth(shiftMonth(month, 1))]);
        if (!cancelled) {
          setDays(a);
          setDaysNext(b);
        }
      } catch {
        if (!cancelled) {
          setDays([]);
          setDaysNext([]);
        }
      } finally {
        if (!cancelled) setCalLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [month, roomTypeId, status]);

  useEffect(() => {
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    async function load() {
      const res = await fetch(
        `/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&roomTypeId=${roomTypeId}`,
      );
      if (!res.ok) {
        if (!cancelled) setQuote(null);
        return;
      }
      const data = await readJson(res);
      if (!cancelled) setQuote((data.availability as AvailabilityResult[])[0] ?? null);
    }
    load().catch(() => {
      if (!cancelled) setQuote(null);
    });
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, roomTypeId]);

  function onPick(date: string) {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut("");
      return;
    }
    if (date <= checkIn) {
      setCheckIn(date);
      setCheckOut("");
      return;
    }
    const blocked = [...(days ?? []), ...(daysNext ?? [])].some(
      (d) => d.date >= checkIn && d.date < date && d.soldOut,
    );
    if (blocked) {
      setMessage("That stay includes a sold-out night. Pick another range.");
      setStatus("error");
      return;
    }
    setCheckOut(date);
    setMessage(null);
    setStatus("idle");
    // A beat to see the range land, then on to the guest's details.
    window.setTimeout(() => {
      setDir(1);
      setStep(3);
    }, 700);
  }

  async function openCheckout(
    session: PaymentSession,
    booking: { id: string; guestName: string; guestEmail: string; guestPhone: string },
  ) {
    await loadRazorpayScript();
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const checkout = new window.Razorpay({
        key: session.keyId,
        amount: session.amountPaise,
        currency: "INR",
        name: "Deccan Dwell",
        description: `${room?.name ?? "Stay"} · ${checkIn} → ${checkOut}`,
        order_id: session.orderId,
        prefill: {
          name: booking.guestName,
          email: booking.guestEmail,
          contact: booking.guestPhone,
        },
        notes: { bookingId: booking.id },
        theme: { color: "#024d43" },
        handler: (response: RazorpayCheckoutResponse) => {
          void confirmPayment(booking.id, response)
            .then(() => {
              settled = true;
              resolve();
            })
            .catch((err) => {
              settled = true;
              reject(err);
            });
        },
        modal: {
          ondismiss: () => {
            if (settled) return;
            settled = true;
            setStatus("held");
            setMessage(
              `Payment window closed. Your room is held for ${session.holdMinutes} minutes.`,
            );
            resolve();
          },
        },
      });
      checkout.open();
    });
  }

  async function confirmPayment(id: string, response: RazorpayCheckoutResponse) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Could not confirm payment");
    setStatus("paid");
    setPayment(null);
    setMessage(
      `Paid in full. Booking ${data.booking.id} is confirmed for ${data.booking.checkIn} → ${data.booking.checkOut}.${
        data.email?.sent
          ? " A confirmation email is on the way."
          : " We will confirm by email once mail is connected."
      }`,
    );
    track("purchase", {
      transaction_id: data.booking.id,
      value: data.booking.amountInr,
      currency: "INR",
      payment_type: "online",
      items: [{ item_id: data.booking.roomTypeId, quantity: 1 }],
    });
    window.location.href = `/booking/${data.booking.id}?email=${encodeURIComponent(guestEmail)}`;
  }

  async function startPayment() {
    if (!bookingId || !payment) return;
    setStatus("loading");
    setMessage(null);
    try {
      await openCheckout(payment, {
        id: bookingId,
        guestName,
        guestEmail,
        guestPhone,
      });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Payment failed");
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const paymentMethod =
      submitter?.value === "at_hotel" ? "at_hotel" : "online";
    if (paymentMethod === "online" && !ONLINE_PAYMENTS_ENABLED) {
      setStatus("error");
      setMessage("Online payment is not available yet. Please pay at the hotel.");
      return;
    }
    if (!checkIn || !checkOut) {
      setStatus("error");
      setMessage("Pick check-in and check-out on the calendar.");
      return;
    }
    if (quote?.soldOut) {
      setStatus("error");
      setMessage("Sold out for those nights.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    track("begin_checkout", {
      currency: "INR",
      value: total || undefined,
      payment_type: paymentMethod,
      items: [{ item_id: roomTypeId, quantity: 1 }],
    });
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId,
          checkIn,
          checkOut,
          guests,
          guestName,
          guestEmail,
          guestPhone,
          paymentMethod,
        }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not hold room");

      if (paymentMethod === "at_hotel") {
        // Straight to the printed receipt — no interim message.
        setBookingId(data.booking.id);
        setPayment(null);
        setStatus("paid");
        track("purchase", {
          transaction_id: data.booking.id,
          value: data.booking.amountInr,
          currency: "INR",
          payment_type: "at_hotel",
          items: [{ item_id: data.booking.roomTypeId, quantity: 1 }],
        });
        window.location.assign(`/booking/${data.booking.id}?email=${encodeURIComponent(guestEmail)}`);
        return;
      }

      const session: PaymentSession = {
        keyId: data.payment.keyId,
        orderId: data.payment.orderId,
        amountPaise: data.payment.amountPaise,
        amountInr: data.payment.amountInr,
        holdMinutes: data.holdMinutes,
      };
      setBookingId(data.booking.id);
      setPayment(session);
      setStatus("held");
      await openCheckout(session, data.booking);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Booking failed");
    }
  }

  const locked = status === "loading" || status === "held";
  const pretty = (iso: string) => format(parseISO(iso), "EEE d MMM");
  const maxGuests = room?.maxGuests ?? 3;
  const hasDates = Boolean(checkIn && checkOut);
  // Price the stay locally so the summary works even if live availability
  // is unreachable; the live quote only decides "sold out".
  const nights = hasDates
    ? Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)))
    : 0;
  // While hovering a room card, the summary shows that room instead.
  const shown = (step === 1 && previewId ? rooms.find((r) => r.id === previewId) : undefined) ?? room;
  const previewing = Boolean(shown && room && shown.id !== room.id);
  const shownGuests = shown ? Math.min(guests, shown.maxGuests) : guests;
  const total = shown && nights ? stayTotalInr(shown, nights, shownGuests) : 0;
  const shownExtraBeds = shown ? extraGuests(shown, shownGuests) : 0;
  const roomImage = (r?: RoomType) =>
    r?.kind === "suite" ? "/images/story/suite.jpg" : "/images/story/bedroom.jpg";
  const nextMonth = shiftMonth(month, 1);
  const canGoBack = month > today.slice(0, 7);

  const STEPS = ["Room", "Dates", "Details"];
  const canReach = (n: number) => n === 1 || (n === 2 && Boolean(room)) || (n === 3 && hasDates);
  const go = (n: number) => {
    if (!canReach(n) || n === step) return;
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const cta =
    step === 1
      ? { label: "Choose your dates", disabled: !room }
      : step === 2
        ? { label: hasDates ? "Continue" : "Select your dates", disabled: !hasDates }
        : {
            label: status === "loading" ? "Reserving…" : status === "paid" ? "Printing your receipt…" : "Reserve · pay at hotel",
            disabled: status === "loading" || status === "paid" || Boolean(quote?.soldOut),
          };

  return (
    <section
      id="book"
      className="dd-paper dd-grain relative overflow-hidden py-[clamp(48px,6vh,80px)] lg:flex lg:min-h-[100svh] lg:items-center"
    >
      <div className="dd-container">
        {/* Heading row */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal>
              <p className="dd-eyebrow">Reserve</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="dd-h2 mt-5">
                Book your <em>stay</em>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-text-ink)]/65 md:justify-end">
              {["Best rate, direct", "No card needed", "Pay on arrival"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[var(--dd-gold-ink)]" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 grid gap-8 lg:mt-9 lg:grid-cols-12 lg:gap-8"
          onKeyDown={(e) => {
            // Enter on steps 1–2 moves forward instead of submitting.
            if (e.key === "Enter" && step < 3) {
              e.preventDefault();
              if (!cta.disabled) go(step + 1);
            }
          }}
        >
          {/* Wizard panel */}
          <Reveal className="lg:col-span-8" delay={0.08}>
            <div className="flex h-full flex-col border border-[var(--dd-line-light)] bg-[var(--dd-paper)]">
              {/* Step tabs */}
              <ol className="grid grid-cols-3 border-b border-[var(--dd-line-light)]">
                {STEPS.map((label, i) => {
                  const n = i + 1;
                  const active = n === step;
                  const reachable = canReach(n);
                  return (
                    <li key={label} className="relative">
                      <button
                        type="button"
                        onClick={() => go(n)}
                        disabled={!reachable}
                        className="flex w-full items-baseline justify-center gap-2 py-4 transition-opacity disabled:opacity-35"
                      >
                        <span
                          className={`font-[family-name:var(--font-display)] text-lg italic transition-colors duration-500 ${
                            active ? "text-[var(--dd-gold-ink)]" : "text-[var(--dd-text-ink)]/45"
                          }`}
                        >
                          {["i.", "ii.", "iii."][i]}
                        </span>
                        <span
                          className={`dd-meta !text-[10px] transition-colors duration-500 ${
                            active ? "text-[var(--dd-text-ink)]" : "text-[var(--dd-text-ink)]/50"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                      {active && (
                        <motion.span
                          layoutId="dd-step-underline"
                          className="absolute inset-x-6 -bottom-px h-[2px] bg-[var(--dd-text-ink)]"
                          transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>

              {/* Step body — fixed height so the page never jumps */}
              <div className="relative flex-1 overflow-hidden lg:h-[clamp(360px,47vh,450px)]">
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.div
                    key={step}
                    custom={dir}
                    variants={{
                      enter: (d: number) => ({ opacity: 0, x: d * 48, filter: "blur(6px)" }),
                      center: { opacity: 1, x: 0, filter: "blur(0px)" },
                      exit: (d: number) => ({ opacity: 0, x: d * -48, filter: "blur(6px)" }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full p-5 md:p-7"
                  >
                    {step === 1 && (
                      <div className="flex h-full flex-col">
                        <p className="dd-body mb-5 !text-[14px] text-[var(--dd-text-ink)]">
                          Rooms sleep two (three with an extra bed). Suites have three bedrooms and sleep six.
                        </p>
                        <div role="radiogroup" aria-label="Room" className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {rooms.map((r, i) => {
                            const selected = r.id === roomTypeId;
                            return (
                              <motion.button
                                key={r.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={locked}
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                                whileTap={{ scale: 0.985 }}
                                onMouseEnter={() => setPreviewId(r.id)}
                                onMouseLeave={() => setPreviewId(null)}
                                onFocus={() => setPreviewId(r.id)}
                                onBlur={() => setPreviewId(null)}
                                onClick={() => {
                                  setPreviewId(null);
                                  if (!selected) {
                                    setRoomTypeId(r.id);
                                    setCheckIn("");
                                    setCheckOut("");
                                  }
                                  window.setTimeout(() => {
                                    setDir(1);
                                    setStep(2);
                                  }, 380);
                                }}
                                className={`group relative flex min-h-[96px] items-stretch gap-4 overflow-hidden border p-2.5 text-left transition-colors duration-500 ${
                                  selected
                                    ? "border-[var(--dd-text-ink)] bg-[var(--dd-text-ink)] text-[var(--dd-paper)]"
                                    : "border-[var(--dd-line-light)] text-[var(--dd-text-ink)] hover:border-[var(--dd-text-ink)]/45"
                                }`}
                              >
                                <span className="relative block w-[4.25rem] shrink-0 overflow-hidden">
                                  <Image
                                    src={roomImage(r)}
                                    alt=""
                                    fill
                                    sizes="68px"
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                  />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col justify-between py-1">
                                  <span>
                                    <span className="block font-[family-name:var(--font-display)] text-[1.25rem] leading-tight">
                                      {r.name}
                                    </span>
                                    <span className="mt-1 block font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.18em] opacity-60">
                                      {r.kind === "suite" ? "3 bedrooms · sleeps 6" : `Sleeps ${r.occupancy}${r.maxGuests > r.occupancy ? `–${r.maxGuests}` : ""}`}
                                    </span>
                                  </span>
                                  <span className="font-[family-name:var(--font-body)] text-[13px]">
                                    ₹{r.basePriceInr.toLocaleString("en-IN")}{" "}
                                    <span className="opacity-55">/ night</span>
                                  </span>
                                </span>
                                <span
                                  aria-hidden
                                  className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-all duration-300 ${
                                    selected
                                      ? "scale-100 border-[var(--dd-gold)] bg-[var(--dd-gold)] text-[var(--dd-night)]"
                                      : "scale-90 border-current/30 text-transparent opacity-40"
                                  }`}
                                >
                                  ✓
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="flex h-full flex-col">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <p className="dd-body !text-[14px] text-[var(--dd-text-ink)]">
                            {!checkIn
                              ? "Tap your arrival date."
                              : !checkOut
                                ? "Now tap your departure date."
                                : `${pretty(checkIn)} → ${pretty(checkOut)} · ${nights} night${nights === 1 ? "" : "s"}`}
                          </p>
                          {checkIn && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckIn("");
                                setCheckOut("");
                              }}
                              className="dd-link !pb-1 text-[var(--dd-text-ink)]"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={month}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35 }}
                            className="grid flex-1 gap-8 md:grid-cols-2"
                          >
                            <AvailabilityCalendar
                              month={month}
                              today={today}
                              days={days}
                              checkIn={checkIn}
                              checkOut={checkOut}
                              loading={calLoading || locked}
                              onPick={onPick}
                              onPrev={canGoBack ? () => setMonth(shiftMonth(month, -1)) : undefined}
                            />
                            <div className="hidden md:block">
                              <AvailabilityCalendar
                                month={nextMonth}
                                today={today}
                                days={daysNext}
                                checkIn={checkIn}
                                checkOut={checkOut}
                                loading={calLoading || locked}
                                onPick={onPick}
                                onNext={() => setMonth(nextMonth)}
                              />
                            </div>
                          </motion.div>
                        </AnimatePresence>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 font-[family-name:var(--font-nav)] text-[9.5px] uppercase tracking-[0.18em] text-[var(--dd-text-ink)]/55">
                          <span className="flex items-center gap-5">
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--dd-gold-ink)]" /> Few left
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="line-through">12</span> Full
                            </span>
                            <button type="button" onClick={() => setMonth(nextMonth)} className="underline md:hidden">
                              Next month →
                            </button>
                          </span>
                          <span>
                            In {CHECK_IN_TIME} · Out {CHECK_OUT_TIME}
                          </span>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="flex h-full flex-col justify-center gap-7">
                        <div className="flex items-center justify-between gap-6 border-b border-[var(--dd-line-light)] pb-6">
                          <div>
                            <p className="dd-field-label">Guests</p>
                            <p className="dd-body mt-1 !text-[13px] text-[var(--dd-text-ink)]">
                              Up to {maxGuests}
                              {room && room.maxGuests > room.occupancy ? ` · extra bed ₹${EXTRA_BED_INR} / night for a third guest` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              aria-label="Fewer guests"
                              disabled={locked || guests <= 1}
                              onClick={() => setGuests((g) => Math.max(1, g - 1))}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dd-line-light)] text-lg text-[var(--dd-text-ink)] transition hover:border-[var(--dd-text-ink)] disabled:opacity-30"
                            >
                              −
                            </button>
                            <span className="relative h-8 w-6 overflow-hidden text-center font-[family-name:var(--font-display)] text-2xl text-[var(--dd-text-ink)]">
                              <AnimatePresence initial={false} mode="popLayout">
                                <motion.span
                                  key={guests}
                                  className="absolute inset-0"
                                  initial={{ y: "100%", opacity: 0 }}
                                  animate={{ y: "0%", opacity: 1 }}
                                  exit={{ y: "-100%", opacity: 0 }}
                                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                >
                                  {guests}
                                </motion.span>
                              </AnimatePresence>
                            </span>
                            <button
                              type="button"
                              aria-label="More guests"
                              disabled={locked || guests >= maxGuests}
                              onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dd-line-light)] text-lg text-[var(--dd-text-ink)] transition hover:border-[var(--dd-text-ink)] disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {[
                          { label: "Full name", value: guestName, set: setGuestName, type: "text", auto: "name", ph: "As on your ID" },
                          { label: "Email", value: guestEmail, set: setGuestEmail, type: "email", auto: "email", ph: "For your confirmation" },
                          { label: "Phone", value: guestPhone, set: setGuestPhone, type: "tel", auto: "tel", ph: "+91" },
                        ].map((f, i) => (
                          <motion.label
                            key={f.label}
                            className="dd-field"
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <span className="dd-field-label">{f.label}</span>
                            <input
                              required
                              type={f.type}
                              disabled={locked}
                              autoComplete={f.auto}
                              value={f.value}
                              onChange={(e) => f.set(e.target.value)}
                              className="dd-input"
                              placeholder={f.ph}
                              autoFocus={i === 0 && !f.value}
                            />
                          </motion.label>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Panel footer */}
              <div className="flex items-center justify-between border-t border-[var(--dd-line-light)] px-5 py-3.5 md:px-7">
                <button
                  type="button"
                  onClick={() => go(step - 1)}
                  className={`dd-link !pb-1 text-[var(--dd-text-ink)] transition-opacity ${step === 1 ? "pointer-events-none opacity-0" : ""}`}
                >
                  ← Back
                </button>
                <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-text-ink)]/50">
                  Step {step} of 3
                </span>
              </div>
            </div>
          </Reveal>

          {/* Summary */}
          <Reveal className="lg:col-span-4" delay={0.14}>
            <aside className="dd-night relative flex h-full flex-col overflow-hidden">
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={roomImage(shown)}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Image src={roomImage(shown)} alt="" fill sizes="(max-width: 1024px) 92vw, 30vw" className="object-cover" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--dd-night)] via-[var(--dd-night)]/25 to-transparent" />
                <div className="absolute inset-x-5 bottom-4">
                  <p className="dd-meta !text-[9.5px] text-[var(--dd-gold)]">
                    {previewing ? "Previewing" : "Your stay"}
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={shown?.id ?? "none"}
                      className="mt-1.5 font-[family-name:var(--font-display)] text-[1.9rem] leading-none text-[var(--dd-cream)]"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4 }}
                    >
                      {shown?.name ?? "Choose a room"}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-5">
                <dl className="grid grid-cols-2 gap-px bg-[var(--dd-line-dark)]">
                  {[
                    ["Arrive", checkIn ? pretty(checkIn) : "—", CHECK_IN_TIME],
                    ["Depart", checkOut ? pretty(checkOut) : "—", CHECK_OUT_TIME],
                  ].map(([label, value, time]) => (
                    <div key={label} className="bg-[var(--dd-night)] odd:pr-4 even:pl-4">
                      <dt className="font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.2em] text-[var(--dd-cream)]/50">
                        {label}
                      </dt>
                      <dd className="mt-1 font-[family-name:var(--font-display)] text-[1.2rem] text-[var(--dd-cream)]">{value}</dd>
                      <dd className="font-[family-name:var(--font-body)] text-[11.5px] text-[var(--dd-cream)]/45">{time}</dd>
                    </div>
                  ))}
                </dl>

                <div className="space-y-1.5 border-t border-[var(--dd-line-dark)] pt-4 font-[family-name:var(--font-body)] text-[13.5px] font-light text-[var(--dd-cream)]/75">
                  <p className="flex justify-between gap-4">
                    <span>
                      ₹{shown?.basePriceInr.toLocaleString("en-IN") ?? "—"} × {nights || "–"} night{nights === 1 ? "" : "s"}
                    </span>
                    <span>{shown && nights ? `₹${(shown.basePriceInr * nights).toLocaleString("en-IN")}` : "—"}</span>
                  </p>
                  {shownExtraBeds > 0 && (
                    <p className="flex justify-between gap-4">
                      <span>Extra bed</span>
                      <span>{nights ? `₹${(EXTRA_BED_INR * shownExtraBeds * nights).toLocaleString("en-IN")}` : "—"}</span>
                    </p>
                  )}
                  <p className="flex justify-between gap-4">
                    <span>Guests</span>
                    <span>{shownGuests}</span>
                  </p>
                </div>

                <div className="mt-auto flex items-end justify-between gap-4 border-t border-[var(--dd-line-dark)] pt-4">
                  <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-cream)]/60">
                    Total
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-[2.1rem] leading-none text-[var(--dd-gold)]">
                    {total && !quote?.soldOut ? <AnimatedRupees value={total} /> : "—"}
                  </span>
                </div>
                {quote?.soldOut && (
                  <p className="text-[13px] text-[#f0a493]">Sold out for these nights — try other dates.</p>
                )}

                <button
                  key={step === 3 ? "submit" : "next"}
                  type={step === 3 ? "submit" : "button"}
                  value={step === 3 ? "at_hotel" : undefined}
                  data-magnetic
                  disabled={cta.disabled}
                  onClick={step < 3 ? () => go(step + 1) : undefined}
                  className="dd-btn dd-btn--solid w-full"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={cta.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      {cta.label} <span className="dd-arrow" aria-hidden>→</span>
                    </motion.span>
                  </AnimatePresence>
                </button>
                {ONLINE_PAYMENTS_ENABLED && step === 3 && (
                  <button type="submit" value="online" disabled={cta.disabled} className="dd-btn w-full">
                    Pay online
                  </button>
                )}
                {status === "held" && payment && (
                  <button type="button" onClick={() => void startPayment()} className="dd-btn w-full">
                    Resume payment · ₹{payment.amountInr.toLocaleString("en-IN")}
                  </button>
                )}
                {message && status !== "paid" ? (
                  <p
                    role="status"
                    className={`text-center font-[family-name:var(--font-body)] text-[13px] ${
                      status === "error" ? "text-[#f0a493]" : "text-[var(--dd-gold)]"
                    }`}
                  >
                    {message}
                  </p>
                ) : (
                  <p className="text-center font-[family-name:var(--font-body)] text-[12px] text-[var(--dd-cream)]/50">
                    Nothing is charged now — you pay at check-in.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-[var(--dd-line-dark)] pt-3 font-[family-name:var(--font-body)] text-[12px] text-[var(--dd-cream)]/55">
                  <details className="dd-details group/p">
                    <summary className="hover:text-[var(--dd-gold)]">Stay policies +</summary>
                    <ul className="absolute bottom-[3.25rem] left-5 right-5 z-10 hidden space-y-2 border border-[var(--dd-line-dark)] bg-[var(--dd-night-2)] p-4 text-[12.5px] leading-relaxed text-[var(--dd-cream)]/80 shadow-2xl group-open/p:block">
                      {HOUSE_RULES.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </details>
                  <Link href="/booking/lookup" className="hover:text-[var(--dd-gold)]">
                    Find a booking
                  </Link>
                  <a href={HOTEL.phones[0].href} className="hover:text-[var(--dd-gold)]">
                    Call us
                  </a>
                </div>
              </div>
            </aside>
          </Reveal>
        </form>
      </div>
    </section>
  );
}

/** Rupee total that counts smoothly to its new value. */
function AnimatedRupees({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(value);
  useEffect(() => {
    const from = last.current;
    last.current = value;
    const node = ref.current;
    if (!node) return;
    const controls = animate(from, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = `₹${Math.round(v).toLocaleString("en-IN")}`;
      },
    });
    return () => controls.stop();
  }, [value]);
  return <span ref={ref}>₹{value.toLocaleString("en-IN")}</span>;
}
