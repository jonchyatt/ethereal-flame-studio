'use client';

import { useMemo } from 'react';
import { Card, Badge, Button } from '@/components/jarvis/primitives';
import { usePersonalStore, type PersonalBill } from '@/lib/jarvis/stores/personalStore';

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_BADGE: Record<
  PersonalBill['status'],
  { status: 'critical' | 'warning' | 'success' | 'info'; label: string }
> = {
  overdue: { status: 'critical', label: 'Overdue' },
  due_soon: { status: 'warning', label: 'Due Soon' },
  paid: { status: 'success', label: 'Paid' },
  upcoming: { status: 'info', label: 'Upcoming' },
};

const SECTION_CONFIG: Record<
  PersonalBill['status'],
  { headerClass: string; wrapperClass?: string; useCard: boolean; cardOpacity?: string }
> = {
  overdue: {
    headerClass: 'text-xs uppercase tracking-wider text-red-400/70 mb-2',
    wrapperClass: 'rounded-xl bg-red-400/5 border border-red-400/10 p-3',
    useCard: false,
  },
  due_soon: {
    headerClass: 'text-xs uppercase tracking-wider text-amber-400/70 mb-2',
    wrapperClass: 'rounded-xl bg-amber-400/5 border border-amber-400/10 p-3',
    useCard: false,
  },
  upcoming: {
    headerClass: 'text-xs uppercase tracking-wider text-white/30 mb-2 px-1',
    useCard: true,
  },
  paid: {
    headerClass: 'text-xs text-white/20 mb-2 px-1',
    useCard: true,
    cardOpacity: 'opacity-60',
  },
};

// ── Bill Row ────────────────────────────────────────────────────────────────

function BillRow({
  bill,
  onMarkPaid,
  isLast,
}: {
  bill: PersonalBill;
  onMarkPaid: (id: string) => void;
  isLast: boolean;
}) {
  const badge = STATUS_BADGE[bill.status];
  const isPaid = bill.status === 'paid';
  const isOverdue = bill.status === 'overdue';

  const amountClass = isOverdue
    ? 'text-sm font-semibold text-red-400'
    : isPaid
      ? 'text-sm font-semibold text-white/40'
      : 'text-sm font-semibold text-white';

  return (
    <div className={`py-2.5 px-1 ${!isLast ? 'border-b border-white/5' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90">{bill.name}</p>
          <p className="text-xs text-white/30">{bill.category}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={amountClass}>
            {isPaid ? <span className="line-through">{formatCurrency(bill.amount)}</span> : formatCurrency(bill.amount)}
          </p>
          <p className="text-xs text-white/30">{formatDate(bill.dueDate)}</p>
        </div>

        <Badge variant="status" status={badge.status}>
          {badge.label}
        </Badge>
      </div>

      {!isPaid && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => onMarkPaid(bill.id)}
        >
          Mark Paid
        </Button>
      )}
    </div>
  );
}

// ── Bills List ──────────────────────────────────────────────────────────────

export function BillsList() {
  const bills = usePersonalStore((s) => s.bills);
  const markBillPaid = usePersonalStore((s) => s.markBillPaid);

  const totalDue = useMemo(
    () => bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + b.amount, 0),
    [bills],
  );

  const totalPaid = useMemo(
    () => bills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
    [bills],
  );

  const sections = useMemo(() => {
    const result: { key: PersonalBill['status']; label: string; bills: PersonalBill[] }[] = [];
    const overdue = bills.filter((b) => b.status === 'overdue');
    const dueSoon = bills.filter((b) => b.status === 'due_soon');
    const upcoming = bills.filter((b) => b.status === 'upcoming');
    const paid = bills.filter((b) => b.status === 'paid');
    if (overdue.length > 0) result.push({ key: 'overdue', label: 'OVERDUE', bills: overdue });
    if (dueSoon.length > 0) result.push({ key: 'due_soon', label: 'DUE SOON', bills: dueSoon });
    if (upcoming.length > 0) result.push({ key: 'upcoming', label: 'UPCOMING', bills: upcoming });
    if (paid.length > 0)
      result.push({ key: 'paid', label: `PAID \u00B7 ${paid.length}`, bills: paid });
    return result;
  }, [bills]);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bill-section-enter { animation: fadeInUp 400ms ease-out both; }
      `}</style>

      {/* Financial Summary Hero */}
      <Card variant="glass" padding="md" className="bill-section-enter mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40">Total Due</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalDue)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Paid</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      </Card>

      {/* Grouped Sections */}
      <div className="space-y-3">
        {sections.map((section, sectionIndex) => {
          const config = SECTION_CONFIG[section.key];
          const rows = section.bills.map((bill, i) => (
            <BillRow
              key={bill.id}
              bill={bill}
              onMarkPaid={markBillPaid}
              isLast={i === section.bills.length - 1}
            />
          ));

          return (
            <div
              key={section.key}
              className="bill-section-enter"
              style={{ animationDelay: `${(sectionIndex + 1) * 80}ms` }}
            >
              {config.useCard ? (
                <Card variant="glass" padding="sm" className={config.cardOpacity || ''}>
                  <p className={config.headerClass}>{section.label}</p>
                  {rows}
                </Card>
              ) : (
                <div className={config.wrapperClass}>
                  <p className={config.headerClass}>{section.label}</p>
                  {rows}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
