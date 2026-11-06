import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminBooking } from "@/lib/inventory";
import { CHECK_IN_TIME, CHECK_OUT_TIME, HOTEL } from "@/lib/hotel";
import { PrintButton } from "@/components/admin/desk/PrintButton";
import { fmtDate, fmtStamp, methodLabel, nightsOf, paidAmount, rupees } from "@/components/admin/desk/lib";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  pending: "On hold",
  confirmed: "Confirmed",
  checked_in: "In house",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
  expired: "Expired",
  blocked: "Blocked",
};

export default async function InvoicePage({ params }: { params: Promise<{ bookingId: string }> }) {
  if (!(await requireAdmin())) redirect("/admin/login");
  const { bookingId } = await params;
  const b = await getAdminBooking(bookingId);
  if (!b) notFound();

  const nights = nightsOf(b);
  const received = paidAmount(b);
  const void_ = ["cancelled", "no_show", "expired"].includes(b.status);
  // A cancelled stay only charges what the hotel kept (the cancellation fee).
  const total = void_ ? Math.max(0, received) : b.amountInr;
  const balance = total - received;
  const issued = new Date().toISOString();

  return (
    <main className="min-h-screen bg-[#ebe7de] px-4 py-10 font-[family-name:var(--font-body)] text-[#16302a] print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[780px] justify-end gap-2 print:hidden">
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[780px] bg-white p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-[#e5dfd2] pb-6">
          <div>
            <div className="relative h-[54px] w-[140px] bg-[#0b2a24] p-2">
              <Image src="/images/logo.png" alt="Deccan Dwell" fill sizes="140px" className="object-contain p-1.5" />
            </div>
            <p className="mt-3 max-w-[300px] text-[12px] leading-relaxed text-[#6b7873]">
              {HOTEL.address}
              <br />
              {HOTEL.phones[0].label} · {HOTEL.email}
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-[family-name:var(--font-display)] text-[34px] leading-none">Invoice</h1>
            <p className="mt-2 font-mono text-[13px]">{b.id.toUpperCase()}</p>
            <p className="text-[12px] text-[#6b7873]">Issued {fmtStamp(issued)}</p>
            <p className="mt-2 inline-block rounded-full border border-[#16302a]/20 px-2.5 py-0.5 text-[11.5px]">{STATUS_LABEL[b.status] ?? b.status}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-[#e5dfd2] py-6 text-[13.5px] sm:grid-cols-2">
          <div>
            <p className="text-[11.5px] uppercase tracking-[0.1em] text-[#6b7873]">Guest</p>
            <p className="mt-1 text-[16px] font-medium">{b.guestName}</p>
            {b.guestPhone && <p>{b.guestPhone}</p>}
            {b.guestEmail && <p>{b.guestEmail}</p>}
          </div>
          <div>
            <p className="text-[11.5px] uppercase tracking-[0.1em] text-[#6b7873]">Stay</p>
            <p className="mt-1">{b.roomName} · {b.guests} guest{b.guests > 1 ? "s" : ""}</p>
            <p>Check-in {fmtDate(b.checkIn)}, {CHECK_IN_TIME}</p>
            <p>Check-out {fmtDate(b.checkOut)}, {CHECK_OUT_TIME}</p>
          </div>
        </section>

        <table className="mt-6 w-full text-[13.5px]">
          <thead className="border-b border-[#e5dfd2] text-left text-[11.5px] uppercase tracking-[0.1em] text-[#6b7873]">
            <tr>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Nights</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {void_ ? (
              <tr className="border-b border-[#e5dfd2]">
                <td className="py-3">
                  {b.status === "no_show" ? "No-show charge" : "Cancellation fee"} · {b.roomName}, {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}
                  {b.cancelReason && <span className="block text-[12px] text-[#6b7873]">{b.cancelReason}</span>}
                </td>
                <td className="py-3 text-right">—</td>
                <td className="py-3 text-right">—</td>
                <td className="py-3 text-right tabular-nums">{rupees(total)}</td>
              </tr>
            ) : (
              <tr className="border-b border-[#e5dfd2]">
                <td className="py-3">{b.roomName} room · {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</td>
                <td className="py-3 text-right tabular-nums">{nights}</td>
                <td className="py-3 text-right tabular-nums">{rupees(b.amountInr / Math.max(1, nights))}</td>
                <td className="py-3 text-right tabular-nums">{rupees(b.amountInr)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-full max-w-[300px] space-y-1.5 text-[13.5px]">
          <div className="flex justify-between"><span className="text-[#6b7873]">Total</span><span className="tabular-nums">{rupees(total)}</span></div>
          <div className="flex justify-between"><span className="text-[#6b7873]">Received</span><span className="tabular-nums">{rupees(received)}</span></div>
          <div className="flex justify-between border-t border-[#16302a] pt-2 text-[16px] font-semibold">
            <span>{balance >= 0 ? "Balance due" : "Credit"}</span>
            <span className="tabular-nums">{rupees(Math.abs(balance))}</span>
          </div>
        </div>

        {(b.payments?.length || b.paymentId?.startsWith("pay_")) ? (
          <section className="mt-8">
            <p className="text-[11.5px] uppercase tracking-[0.1em] text-[#6b7873]">Payments</p>
            <ul className="mt-2 divide-y divide-[#e5dfd2] text-[13px]">
              {b.paymentId?.startsWith("pay_") && (
                <li className="flex justify-between py-2"><span>Online · {b.paymentId}</span><span className="tabular-nums">{rupees(b.depositInr || b.amountInr)}</span></li>
              )}
              {b.payments?.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>{fmtStamp(p.createdAt)} · {p.amountInr < 0 ? "Refund" : "Payment"} · {methodLabel(p.method)}{p.note ? ` · ${p.note}` : ""}</span>
                  <span className="tabular-nums">{p.amountInr < 0 ? "−" : ""}{rupees(Math.abs(p.amountInr))}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-[#e5dfd2] pt-5 text-center text-[12px] text-[#6b7873]">
          Thank you for staying with us. Tariff inclusive of applicable taxes.
          <p className="mt-1 font-[family-name:var(--font-display)] text-[18px] italic text-[#16302a]">A home away from home</p>
        </footer>
      </article>
    </main>
  );
}
