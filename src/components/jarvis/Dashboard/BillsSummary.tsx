'use client';

import { isToday, parseISO } from 'date-fns';
import { PriorityIndicator } from '../PriorityIndicator';
import type { BillSummary } from '@/lib/jarvis/executive/types';

interface BillsSummaryProps {
  bills: BillSummary[];
  total: number;
  loading: boolean;
  expanded: boolean;
}

export function BillsSummary({ bills, total, loading, expanded }: BillsSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Bills</h3>
        <div className="animate-pulse h-4 bg-white/10 rounded w-1/2" />
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Bills</h3>
        <p className="text-white/40 text-sm">No bills due this week</p>
      </div>
    );
  }

  const displayBills = expanded ? bills : bills.slice(0, 2);

  // Check if bill is due today
  const isDueToday = (bill: BillSummary) => {
    if (!bill.dueDate) return false;
    try {
      return isToday(parseISO(bill.dueDate));
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Bills</h3>
        <span className="text-white/60 text-xs">
          ${total.toLocaleString()} total
        </span>
      </div>

      <ul className="space-y-1">
        {displayBills.map((bill) => (
          <li
            key={bill.id}
            className="flex items-center justify-between text-white/80 text-sm"
          >
            <div className="flex items-center gap-2">
              {isDueToday(bill) && <PriorityIndicator type="deadline_near" />}
              <span>{bill.title}</span>
            </div>
            <span className="text-white/50">${bill.amount}</span>
          </li>
        ))}
      </ul>

      {!expanded && bills.length > 2 && (
        <p className="text-white/40 text-xs">+{bills.length - 2} more</p>
      )}
    </div>
  );
}
