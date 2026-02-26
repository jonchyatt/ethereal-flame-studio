export type WidgetSize = 'small' | 'wide';

export interface WidgetDefinition {
  id: string;
  name: string;
  domain: string; // domain id from domains.ts
  dataSource: string; // key for future data fetching
  tapRoute: string;
  quickActionLabel: string | null;
  defaultSize: WidgetSize;
}

export interface PinnedWidget {
  widgetId: string;
  position: number; // 0-3
}
