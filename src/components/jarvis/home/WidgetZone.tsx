'use client';

import { Plus } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';
import { Button } from '@/components/jarvis/primitives';
import { useHomeStore } from '@/lib/jarvis/stores/homeStore';
import { getWidgetById } from '@/lib/jarvis/widgets/registry';
import { getDomainById, DOMAIN_COLORS } from '@/lib/jarvis/domains';

export function WidgetZone() {
  const pinnedWidgets = useHomeStore((s) => s.pinnedWidgets);

  if (pinnedWidgets.length === 0) {
    return (
      <Card variant="glass" padding="md">
        <div className="flex items-center gap-3 text-white/50">
          <Plus className="w-5 h-5" />
          <span className="text-sm">Add widgets to your Home</span>
        </div>
      </Card>
    );
  }

  const sorted = [...pinnedWidgets].sort((a, b) => a.position - b.position);

  return (
    <div className="grid grid-cols-2 gap-3">
      {sorted.map((pinned) => {
        const widget = getWidgetById(pinned.widgetId);
        if (!widget) return null;

        const domain = getDomainById(widget.domain);
        const colors = domain ? DOMAIN_COLORS[domain.color] : null;
        const isWide = widget.defaultSize === 'wide';

        return (
          <Card
            key={widget.id}
            variant="glass"
            padding="sm"
            className={isWide ? 'col-span-2' : ''}
          >
            <div className="space-y-1.5">
              {/* Widget title with domain color accent */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${colors?.text ?? 'text-white/60'}`}>
                  {widget.name}
                </span>
              </div>

              {/* Metric placeholder */}
              <p className="text-lg font-semibold text-white/80">--</p>

              {/* Quick action */}
              {widget.quickActionLabel && (
                <Button variant="ghost" size="sm" className="text-xs px-0">
                  {widget.quickActionLabel}
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      {/* Add widget hint when fewer than 4 */}
      {pinnedWidgets.length < 4 && (
        <Card variant="glass" padding="sm" className="border-dashed">
          <div className="flex items-center justify-center h-full min-h-[60px] text-white/30">
            <Plus className="w-5 h-5" />
          </div>
        </Card>
      )}
    </div>
  );
}
