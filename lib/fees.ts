// Fee calculations shared by the server and the dialogs that preview them.
// Nothing here may import the database: Client Components use it too.

export type FeeSettingValue = {
  // "YYYY-MM": the first month these values apply to.
  effectiveFrom: string
  // Centavos.
  monthlyBudget: number
  dueDay: number
}

// Splits `total` between units in proportion to their ownership shares. Each
// part is rounded down and the leftover centavos go to the largest remainders
// (the earlier unit on a tie), so the parts always add up to `total`.
export function splitByShares(total: number, shares: number[]): number[] {
  const shareTotal = shares.reduce((sum, share) => sum + share, 0)
  if (shareTotal === 0) {
    return shares.map(() => 0)
  }

  const parts = shares.map((share) => Math.floor((total * share) / shareTotal))
  const leftover = total - parts.reduce((sum, part) => sum + part, 0)

  shares
    .map((share, index) => ({ index, remainder: (total * share) % shareTotal }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, leftover)
    .forEach(({ index }) => {
      parts[index] += 1
    })

  return parts
}

// The settings in force for a month: the latest ones that started on or
// before it. Periods compare correctly as strings.
export function findFeeSetting<T extends FeeSettingValue>(
  settings: T[],
  period: string
): T | undefined {
  return settings
    .filter((setting) => setting.effectiveFrom <= period)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

// Calendar dates (due dates, a period's first day) are stored and shown as
// midnight UTC, so they never shift with the viewer's time zone.
export function periodDate(period: string, day = 1): Date {
  const [year, month] = period.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function nextPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number)
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7)
}
