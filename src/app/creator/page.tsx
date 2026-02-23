export default function CreatorHomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Creator Workflow</h1>
          <p className="text-sm text-zinc-400">
            Library, metadata drafts, recut planning, and thumbnail safe-zone tooling for multi-platform publishing.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="/creator/dashboard"
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-zinc-700 transition-colors"
          >
            <h2 className="text-lg font-medium">Batch Dashboard</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Live per-pack status rollups for render, recut, and publish jobs with one-click queue actions.
            </p>
          </a>

          <a
            href="/creator/library"
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-zinc-700 transition-colors"
          >
            <h2 className="text-lg font-medium">Content Library</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Browse creator packs, edit mood/BPM/topic tags, review auto recut segment plans, and inspect publish metadata drafts.
            </p>
          </a>

          <a
            href="/creator/thumbnail-planner"
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-zinc-700 transition-colors"
          >
            <h2 className="text-lg font-medium">Thumbnail Planner</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Auto-pick candidate timestamps, scrub manually, and preview text-safe zones for YouTube, Shorts, and square feeds.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
