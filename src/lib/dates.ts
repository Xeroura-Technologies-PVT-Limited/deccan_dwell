const IST = "Asia/Kolkata";

/** Calendar date in India, YYYY-MM-DD. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}

export function addCalendarDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return formatISODate(next);
}

export function formatISODate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Occupied hotel nights: [checkIn, checkOut). Checkout day is free. */
export function stayNights(checkIn: string, checkOut: string) {
  if (checkIn >= checkOut) return [];
  const nights: string[] = [];
  for (let date = checkIn; date < checkOut; date = addCalendarDays(date, 1)) {
    nights.push(date);
  }
  return nights;
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return stayNights(checkIn, checkOut).length;
}

export function daysInMonth(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `${month}-${day}`;
  });
}
