'use client';

import { useState } from 'react';
import {
  CURRICULUM_CLUSTERS,
  NOTION_URLS,
} from '@/lib/jarvis/notion/notionUrls';
import { useNotionPanelStore } from '@/lib/jarvis/stores/notionPanelStore';

export function CurriculumCard() {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const openPanel = useNotionPanelStore((s) => s.openPanel);

  const toggleCluster = (id: string) => {
    setExpandedCluster((prev) => (prev === id ? null : id));
  };

  const handleDatabaseTap = (dbKey: string) => {
    const entry = NOTION_URLS[dbKey];
    if (!entry) return;
    openPanel(entry.notionUrl, entry.label, 'view', entry.cluster);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-white/60 text-xs uppercase tracking-wide">
        Notion Databases
      </h3>

      <div className="space-y-1">
        {CURRICULUM_CLUSTERS.map((cluster) => {
          const isExpanded = expandedCluster === cluster.id;

          return (
            <div key={cluster.id}>
              {/* Cluster header */}
              <button
                onClick={() => toggleCluster(cluster.id)}
                className="w-full flex items-center gap-2 px-2 py-2 -mx-2 rounded-lg
                  hover:bg-white/5 active:bg-white/10 transition-colors text-left"
              >
                <span className="text-base">{cluster.icon}</span>
                <span className="flex-1 text-white/80 text-sm">{cluster.label}</span>
                <span className="text-white/30 text-xs">{cluster.databases.length}</span>
                <svg
                  className={`w-3.5 h-3.5 text-white/40 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded database list */}
              {isExpanded && (
                <div className="ml-7 mb-1 space-y-0.5">
                  {cluster.databases.map((dbKey) => {
                    const entry = NOTION_URLS[dbKey];
                    if (!entry) return null;

                    return (
                      <button
                        key={dbKey}
                        onClick={() => handleDatabaseTap(dbKey)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm text-white/60
                          hover:text-white/90 hover:bg-white/5 active:bg-white/10
                          transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3 h-3 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
