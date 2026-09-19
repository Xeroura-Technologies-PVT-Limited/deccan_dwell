import nodemailer from "nodemailer";
import { CHECK_IN_TIME, CHECK_OUT_TIME, HOTEL } from "./hotel";
import { getRoomTypeById } from "./rooms";
import type { Booking } from "./types";

function transporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function bookingHtml(booking: Booking) {
  const room = getRoomTypeById(booking.roomTypeId);
  const paid =
    booking.paymentMethod === "online" && booking.status === "confirmed"
      ? "Paid online in full"
      : "Pay at the hotel on arrival";
  return `
  <div style="font-family:Georgia,serif;background:#024d43;color:#f3eee4;padding:32px">
    <p style="letter-spacing:0.3em;color:#c5a059;font-size:11px;text-transform:uppercase">Deccan Dwell · Mysuru</p>
    <h1 style="font-weight:400;font-size:32px;margin:12px 0 24px">Your stay is reserved</h1>
    <p>Dear ${booking.guestName},</p>
    <p>Thank you for choosing Deccan Dwell. Here are your booking details.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;color:#f3eee4">
      <tr><td style="padding:8px 0;color:#c5a059">Booking</td><td>${booking.id}</td></tr>
      <tr><td style="padding:8px 0;color:#c5a059">Room</td><td>${room?.name ?? booking.roomTypeId}</td></tr>
      <tr><td style="padding:8px 0;color:#c5a059">Check in</td><td>${booking.checkIn} · ${CHECK_IN_TIME}</td></tr>
      <tr><td style="padding:8px 0;color:#c5a059">Check out</td><td>${booking.checkOut} · ${CHECK_OUT_TIME}</td></tr>
      <tr><td style="padding:8px 0;color:#c5a059">Guests</td><td>${booking.guests}</td></tr>
      <tr><td style="padding:8px 0;color:#c5a059">Amount</td><td>₹${booking.amountInr.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 0;color:#c5a059">Payment</td><td>${paid}</td></tr>
    </table>
    <p style="font-size:13px;opacity:0.8">${HOTEL.address}</p>
    <p style="font-size:13px;opacity:0.8">${HOTEL.phones.map((p) => p.label).join(" · ")} · ${HOTEL.email}</p>
  </div>`;
}

export async function sendBookingConfirmation(booking: Booking) {
  const room = getRoomTypeById(booking.roomTypeId);
  const subject = `Deccan Dwell booking ${booking.id} · ${room?.name ?? "Stay"}`;
  const html = bookingHtml(booking);
  const from = process.env.SMTP_FROM || `Deccan Dwell <${HOTEL.email}>`;
  const mailer = transporter();

  if (!mailer) {
    console.info("[email] SMTP not configured. Would send:", {
      to: booking.guestEmail,
      subject,
    });
    return { sent: false, reason: "SMTP is not configured" };
  }

  try {
    await mailer.sendMail({
      from,
      to: booking.guestEmail,
      bcc: HOTEL.email,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "Could not send email",
    };
  }
}
