/**
 * Academy Project Registry
 *
 * Static configuration for projects Jarvis can teach about.
 * Each project includes teaching context that helps Claude
 * explain the project intelligently.
 */

export interface ProjectConfig {
  id: string;
  name: string;
  repo: string;
  /** Subdirectory within the repo (for projects sharing a repo) */
  basePath?: string;
  description: string;
  techStack: string;
  architecture: string;
  workflows: string;
  complexAreas: string;
}

export const ACADEMY_PROJECTS: Record<string, ProjectConfig> = {
  visopscreen: {
    id: 'visopscreen',
    name: 'Visopscreen \u2014 Visual Option Screener',
    repo: 'Visopscreen',
    description: 'A comprehensive options screening, analysis, and strategy building tool. Scans option chains for optimal spread trades using shape-based P&L curve analysis. Supports 14 strategy templates across 5 categories (Weekly Income, Option Insanity, Vega Hedge, Diagonals, Butterflies).',
    techStack: 'Vanilla JavaScript (no framework), Plotly.js for charts, SheetJS for Excel parsing, Vercel serverless functions, yahoo-finance2, Schwab OAuth2 API, Cloudflare R2 for data archival, Python Flask for regime detection (Hidden Markov Models), Google Gemini for vision/video learning.',
    architecture: `Browser app loaded via <script> tags in spread-analyzer.html. No module bundler \u2014 all modules communicate through window.* globals and DOM events. Key globals: window.optionData (canonical option chain), window.strategy (current trade), window.currentUnderlyingPrice. 5 tabs: Find Trades, Build Strategy, Analysis, LEAP Cycles, Research. Headless engine (headless/engine.js) mirrors browser modules for Node.js CLI use. 30+ CLI commands in headless/cli/. 12+ agent skill modules in skills/.`,
    workflows: `1. FIND TRADES: Connect data source \u2192 select screener type \u2192 configure parameters \u2192 scan \u2192 view scored results \u2192 load into builder
2. BUILD STRATEGY: Add legs manually or from Strategy Library \u2192 configure strike/expiration/ratio per leg \u2192 view live P&L graph + Greeks + trade summary \u2192 drag option chips to adjust
3. ANALYSIS: Load strategy \u2192 choose Grid/Overlay/3D visualization \u2192 use time slider for P&L evolution \u2192 adjust strike variations
4. LEAP CYCLES: Configure LEAP hedge \u2192 view intrinsic/extrinsic breakdown with PPD \u2192 compare DTE strategies \u2192 multi-cycle projection
5. RESEARCH: Browse calendar heatmap of historical snapshots \u2192 load archived data \u2192 monitor R2 storage
6. REGIME: Market regime badge auto-updates (compression/trending/elevated/crisis) \u2192 gates which screeners are recommended \u2192 auto-tunes parameters`,
    complexAreas: `- GLOBAL STATE: Price stored in 5 places (window.currentUnderlyingPrice, tosIntegration.currentPrice, DataHeader.currentPrice, DOM #current-price, DOM #header-price). state-access.js was built to resolve this but no module imports it yet.
- PPD (Price Per Day): Time value decay per day. PPD inversions (far-term decays faster than near-term) are counter-intuitive but core to Insanity screener.
- SHAPE-BASED SCORING: Screeners analyze P&L curve shapes \u2014 hump height, hump width, angle steepness, bisection sharpness \u2014 not just profitability.
- 5 DATA SOURCES: Demo (offline B-S), Yahoo (delayed), TOS Live (Excel RTD via File System API), Schwab (OAuth2), Archive (R2 snapshots). Each has completely different connection flow.
- REGIME DETECTION: Python HMM classifies market conditions. Flask API \u2192 Vercel serverless \u2192 R2 state. Never been live-tested in market hours.
- DUAL ARCHITECTURE: Same calculation code runs in browser (window.*, DOM) and Node.js (global.*, shims.js). headless/engine.js bridges the gap.`,
  },
  'creator-workflow': {
    id: 'creator-workflow',
    name: 'Creator Workflow \u2014 Video Production Pipeline',
    repo: 'ethereal-flame-studio',
    basePath: '',
    description: 'A content production and multi-platform publishing pipeline for rendered visual content (Ethereal Flame/Mist orb animations set to audio). Covers the full workflow from audio + visual rendering through multi-format output, AI-powered recut suggestions, thumbnail generation with safe zones, and platform-specific publish metadata.',
    techStack: 'Next.js (App Router), TypeScript, Tailwind CSS, Zod schemas, FFmpeg for video processing, Puppeteer for frame capture, Three.js for 360/VR rendering, sharp for image processing. Worker process with job queue. Modal.com for cloud GPU rendering.',
    architecture: `Pages under src/app/creator/ (dashboard, library, thumbnail-planner). API routes under src/app/api/creator/. Core libraries under src/lib/creator/ (types.ts, presets.ts, store.ts, sync.ts, recut.ts, ffmpegRecut.ts, thumbnail.ts, metadata.ts, publishConnectors.ts, jobs.ts, queue.ts). Render pipeline under src/lib/render/ (renderVideo.ts orchestrates: audio analysis \u2192 Puppeteer frame capture \u2192 FFmpeg encoding \u2192 VR metadata injection). Worker pipelines under worker/pipelines/. Scripts under scripts/ (render-cli.ts, start-worker.ts).`,
    workflows: `1. BATCH DASHBOARD (src/app/creator/dashboard): View per-pack render/recut/publish status. One-click Sync, Queue Recuts, Queue Publish. Controls for recut mode, max segments, publish mode (draft/schedule), source selection. Auto-refreshes every 5s.
2. CONTENT LIBRARY (src/app/creator/library): Browse creator packs, edit mood/BPM/topic/keyword tags, review AI-suggested recut segments (accept/reject/preview), inspect auto-generated publish metadata (titles, descriptions, hashtags per platform).
3. THUMBNAIL PLANNER (src/app/creator/thumbnail-planner): Auto-picked candidate timestamps, manual scrubber, safe-zone overlays (YouTube 16:9, Shorts 9:16, Square 1:1), frame capture to PNG.
4. RENDER PIPELINE: Audio pre-analysis \u2192 Puppeteer headless frame capture \u2192 FFmpeg encoding. Supports flat (1080p/4K, landscape/portrait/square) and 360 VR (mono/stereo, 4K/6K/8K).
5. PUBLISH: 7 platform targets \u2014 YouTube, YouTube Shorts, YouTube VR, YouTube VR 3D, TikTok, Instagram Reels, Instagram Feed. Currently manual-draft mode.`,
    complexAreas: `- RENDER PIPELINE: Multi-stage orchestration (PuppeteerRenderer \u2192 FFmpegEncoder \u2192 SpatialMetadata). Understanding the flow from audio analysis through frame capture to final encoding.
- VR RENDERING: CubemapCapture \u2192 EquirectangularConverter \u2192 StereoStacker \u2192 spatial metadata injection. Three.js VideoSkybox with luma/chroma key masking.
- JOB QUEUE: Worker process with multiple pipeline types (render, recut, sync, publish). Understanding which pipeline handles what.
- MULTI-FORMAT OUTPUT: Same content reformatted for 7 platforms with different aspect ratios, durations, and metadata requirements.
- PRESETS SYSTEM: Bundle presets, export pack presets, channel metadata presets, safe zone presets \u2014 layered configuration.`,
  },
};

export function getProject(id: string): ProjectConfig | undefined {
  return ACADEMY_PROJECTS[id];
}

export function getAllProjects(): ProjectConfig[] {
  return Object.values(ACADEMY_PROJECTS);
}

export function getProjectIds(): string[] {
  return Object.keys(ACADEMY_PROJECTS);
}
