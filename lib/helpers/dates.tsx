import { isAfter, subMonths } from "date-fns";

/**
 * Lists the dates within the last six months.
 * @param dates - An array of Date objects
 * @returns An array of dates within the last six months
 */
export function getDatesInLastNumMonths(dates: Date[], num: number): Date[] {
  const sixMonthsAgo = subMonths(new Date(), num);
  return dates.filter((date) => isAfter(date, sixMonthsAgo));
}
