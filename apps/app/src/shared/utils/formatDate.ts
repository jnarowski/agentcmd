import { format as dateFnsFormat } from "date-fns";

/**
 * Format a date using date-fns with a default format
 *
 * @param date - Date to format (Date object, ISO string, or timestamp number)
 * @param formatStr - Optional format string (defaults to "MM/dd/yy 'at' h:mma")
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date()) // "01/15/25 at 1:23pm"
 * formatDate(new Date(), "MMM d, yyyy") // "Jan 15, 2025"
 * formatDate("2025-01-15T13:23:00Z", "MM/dd 'at' h:mma") // "01/15 at 1:23pm"
 * formatDate(1705329780000, "HH:mm:ss") // "13:23:00"
 */
export function formatDate(
  date: Date | string | number,
  formatStr: string = "MM/dd/yy 'at' h:mma"
): string {
  const d = date instanceof Date ? date : new Date(date);
  return dateFnsFormat(d, formatStr);
}
