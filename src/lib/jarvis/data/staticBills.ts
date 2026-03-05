/**
 * Static Bills Configuration
 *
 * Jonathan's recurring monthly bills organized by day-of-month due date.
 * Used as fallback when Notion bills database is unavailable or returns empty.
 *
 * Amounts are approximate — will be replaced with live-fetched values in v4.5 agent milestone.
 */

import type { BillSummary } from '../executive/types';

interface StaticBill {
  name: string;
  dayOfMonth: number;
  amount: number;
  category: string;
}

const STATIC_BILLS: StaticBill[] = [
  // Day 1
  { name: 'St. George City', dayOfMonth: 1, amount: 101.13, category: 'Utilities' },
  { name: 'Dixie Power', dayOfMonth: 1, amount: 162, category: 'Utilities' },
  { name: 'Embridge', dayOfMonth: 1, amount: 126, category: 'Utilities' },
  { name: 'Quantum', dayOfMonth: 1, amount: 0, category: 'Internet' },
  { name: 'HOA', dayOfMonth: 1, amount: 48, category: 'Home' },
  { name: 'Honda', dayOfMonth: 1, amount: 883, category: 'Auto' },
  { name: 'Subaru', dayOfMonth: 1, amount: 336, category: 'Auto' },
  { name: 'Mr. Cooper', dayOfMonth: 1, amount: 2776, category: 'Mortgage' },
  { name: 'Discover', dayOfMonth: 1, amount: 0, category: 'Credit Card' },
  { name: 'UPromise', dayOfMonth: 1, amount: 19.71, category: 'Savings' },

  // Day 5
  { name: 'Jennie Barclay', dayOfMonth: 5, amount: 131, category: 'Credit Card' },
  { name: 'AmEx', dayOfMonth: 5, amount: 385.56, category: 'Credit Card' },
  { name: 'T.J. Maxx', dayOfMonth: 5, amount: 0, category: 'Credit Card' },

  // Day 7
  { name: 'Jennie Capital One QS', dayOfMonth: 7, amount: 2198.67, category: 'Credit Card' },
  { name: 'Jon Haze Capital One', dayOfMonth: 7, amount: 474, category: 'Credit Card' },
  { name: 'Jon Navy Federal Mastercard', dayOfMonth: 7, amount: 2613.63, category: 'Credit Card' },

  // Day 10
  { name: 'Amazon', dayOfMonth: 10, amount: 2881.58, category: 'Credit Card' },

  // Day 14
  { name: 'Jennie Capital One', dayOfMonth: 14, amount: 1912, category: 'Credit Card' },
  { name: 'Jennie Navy Federal', dayOfMonth: 14, amount: 2120, category: 'Credit Card' },

  // Day 16
  { name: 'Old Walmart Capital One', dayOfMonth: 16, amount: 5514, category: 'Credit Card' },
  { name: 'Jon Capital One QS', dayOfMonth: 16, amount: 416, category: 'Credit Card' },
  { name: "Kohl's", dayOfMonth: 16, amount: 195.75, category: 'Credit Card' },

  // Day 21
  { name: 'Navy Federal Visa', dayOfMonth: 21, amount: 1604, category: 'Credit Card' },

  // Day 23
  { name: 'Target', dayOfMonth: 23, amount: 161, category: 'Credit Card' },

  // Day 27
  { name: 'Jennie Capital One VG', dayOfMonth: 27, amount: 66.66, category: 'Credit Card' },
];

/**
 * Get ISO date string for a day-of-month in the current or next month.
 * If the day has already passed this month, returns this month's date (shows as overdue).
 * If the day is today or upcoming, returns this month's date.
 */
function getBillDueDate(dayOfMonth: number, now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth();

  // Always use this month — overdue status is computed downstream by transformBills
  // If dayOfMonth > last day of this month (e.g., day 31 in Feb), clamp to last day
  const lastDay = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(dayOfMonth, lastDay);

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Returns all static bills as BillSummary objects with computed due dates.
 * All bills for the current month are returned — status (overdue/upcoming) is
 * computed downstream in transformBills() based on date comparison.
 */
export function getStaticBills(timezone?: string): BillSummary[] {
  const now = timezone
    ? new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    : new Date();

  return STATIC_BILLS.map((bill, index) => ({
    id: `static-bill-${index}-${bill.dayOfMonth}`,
    title: bill.name,
    amount: bill.amount,
    dueDate: getBillDueDate(bill.dayOfMonth, now),
    serviceLink: null,
  }));
}
