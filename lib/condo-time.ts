// The condo's time zone decides what "today" and "this month" mean.
export const CONDO_TIME_ZONE = "America/Cancun"

// Today's calendar date where the condo is, as "YYYY-MM-DD". Reads the clock,
// so in a Server Component call it only after request-time data was awaited.
export function condoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CONDO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}
