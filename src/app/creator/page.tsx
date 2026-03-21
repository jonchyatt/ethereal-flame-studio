import { NavShell } from '@/components/nav/NavShell';

export default function CreatorHomePage() {
  return (
    <NavShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Creator Workflow</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Library, metadata drafts, recut planning, and thumbnail safe-zone tooling.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <a
            href="/creator/dashboard"
            className="rounded-xl border border-white/8 bg-white/3 p-5 hover:border-white/15 hover:bg-white/5 transition-all"
          >
            <h2 className="text-base font-medium text-white">Batch Dashboard</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Live per-pack status rollups for render, recut, and publish jobs.
            </p>
          </a>

          <a
            href="/creator/library"
            className="rounded-xl border border-white/8 bg-white/3 p-5 hover:border-white/15 hover:bg-white/5 transition-all"
          >
            <h2 className="text-base font-medium text-white">Content Library</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Browse packs, edit tags, review recut plans, inspect publish metadata.
            </p>
          </a>

          <a
            href="/creator/thumbnail-planner"
            className="rounded-xl border border-white/8 bg-white/3 p-5 hover:border-white/15 hover:bg-white/5 transition-all"
          >
            <h2 className="text-base font-medium text-white">Thumbnail Planner</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Auto-pick timestamps, scrub manually, preview text-safe zones.
            </p>
          </a>
        </div>
      </div>
    </NavShell>
  );
}
