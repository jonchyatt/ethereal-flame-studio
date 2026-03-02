/**
 * Academy Project Registry
 *
 * Static configuration for projects Jarvis can teach about.
 * Each project includes teaching context that helps Claude
 * explain the project intelligently, plus optional structured
 * curriculum for systematic teaching.
 */

export interface CurriculumTopic {
  id: string;
  name: string;
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  description: string;
  teachingNotes: string;
  keyFiles: Array<{
    path: string;
    explanation: string;
  }>;
  prerequisites: string[];
  conceptsIntroduced: string[];
}

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
  curriculum?: CurriculumTopic[];
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
    curriculum: [
      // ── Getting Started (difficulty 1-2) ──────────────────────────
      {
        id: 'data-sources',
        name: 'Data Sources & Connection Flow',
        category: 'Getting Started',
        difficulty: 2,
        description: 'How Visopscreen connects to market data. 5 sources, each with a completely different connection flow: Demo (offline Black-Scholes), Yahoo (delayed API), TOS Live (Excel RTD via File System API), Schwab (OAuth2), and Archive (R2 snapshots).',
        teachingNotes: 'Start with Demo mode — it generates synthetic data via Black-Scholes so the user can understand the full pipeline without needing a brokerage account. Then show how Yahoo swaps in real delayed data. The aha moment is that each source plugs into the SAME downstream pipeline (window.optionData) despite wildly different connection mechanics. TOS Live is the most exotic — it reads a live Excel file that ThinkOrSwim writes via RTD, using the File System Access API.',
        keyFiles: [
          { path: 'data-sources.js', explanation: 'Central routing — decides which source module to invoke based on user selection' },
          { path: 'demo-data.js', explanation: 'Black-Scholes synthetic data generator — produces realistic option chains offline' },
          { path: 'yahoo-finance.js', explanation: 'Yahoo Finance integration — delayed quotes via yahoo-finance2' },
          { path: 'tos-integration.js', explanation: 'ThinkOrSwim live data — reads Excel RTD file via File System Access API' },
          { path: 'schwab-integration.js', explanation: 'Schwab OAuth2 flow — real-time data from Schwab API' },
        ],
        prerequisites: [],
        conceptsIntroduced: ['option-chain', 'data-pipeline', 'window.optionData', 'black-scholes', 'file-system-access-api'],
      },
      {
        id: 'strategy-builder-basics',
        name: 'Strategy Builder Fundamentals',
        category: 'Getting Started',
        difficulty: 1,
        description: 'Building option strategies in Visopscreen — adding legs, setting strikes and expirations, viewing the live P&L graph, Greeks display, and trade summary. The foundation everything else builds on.',
        teachingNotes: 'This is where users spend most of their time. The key insight is that a "strategy" is just an array of legs, each with a type (call/put), direction (buy/sell), strike, expiration, and ratio. The P&L graph is computed by summing each leg\'s payoff at every price point. Start by building a simple vertical spread (2 legs), then show how the P&L curve changes as you adjust strikes. The drag-to-adjust option chips are a distinctive UX feature.',
        keyFiles: [
          { path: 'strategy-builder.js', explanation: 'Core builder logic — leg management, strategy state, P&L calculation trigger' },
          { path: 'spread-analyzer.js', explanation: 'Main application file — orchestrates all tabs including the builder' },
          { path: 'pnl-graph.js', explanation: 'Plotly.js P&L curve rendering — computes and draws the payoff diagram' },
          { path: 'greeks-display.js', explanation: 'Greeks calculation and display — delta, gamma, theta, vega per leg and net' },
        ],
        prerequisites: [],
        conceptsIntroduced: ['strategy-legs', 'strikes', 'expirations', 'pnl-curve', 'greeks', 'window.strategy'],
      },
      {
        id: 'ui-navigation',
        name: 'UI Navigation & Tab Structure',
        category: 'Getting Started',
        difficulty: 1,
        description: 'The 5-tab structure (Find Trades, Build Strategy, Analysis, LEAP Cycles, Research), page flow, and user interaction patterns. How the single-page app manages state across tabs.',
        teachingNotes: 'Visopscreen is a single HTML file (spread-analyzer.html) with tab-based navigation. There is no router — tabs show/hide DOM sections. The key insight is that window.* globals are the shared state between tabs. When you load a strategy from Find Trades into Build Strategy, it writes to window.strategy and switches tabs. Understanding this flow prevents confusion about "where does data come from" when looking at any individual tab.',
        keyFiles: [
          { path: 'spread-analyzer.html', explanation: 'The entire app — all tabs, all script tags, all DOM structure in one file' },
          { path: 'spread-analyzer.js', explanation: 'Main orchestrator — tab switching, initialization, event coordination' },
          { path: 'strategy-library.js', explanation: 'Strategy Library panel — 14 templates organized by category, loads into builder' },
        ],
        prerequisites: [],
        conceptsIntroduced: ['tab-navigation', 'dom-sections', 'window-globals', 'strategy-library'],
      },
      // ── Core Concepts (difficulty 2-3) ────────────────────────────
      {
        id: 'pnl-curves',
        name: 'P&L Curve Generation',
        category: 'Core Concepts',
        difficulty: 2,
        description: 'How strikes, premiums, and ratios produce the P&L curve shape. The mathematical foundation of every screener and analysis tool in Visopscreen.',
        teachingNotes: 'The P&L at any price point is: sum of (each leg\'s intrinsic value at that price - premium paid) * ratio * direction. Walk through a bull call spread step by step: long call payoff curve + short call payoff curve = the combined shape. The aha moment is that the SHAPE of this curve (not just max profit/loss) is what the scoring system evaluates. Show how changing one strike by $1 reshapes the entire curve.',
        keyFiles: [
          { path: 'pnl-graph.js', explanation: 'Core P&L computation — iterates price range, sums leg payoffs, feeds Plotly' },
          { path: 'strategy-builder.js', explanation: 'Provides the leg data (strikes, premiums, ratios) that feeds P&L calculation' },
          { path: 'trade-summary.js', explanation: 'Extracts key metrics from the P&L curve — max profit, max loss, breakevens' },
        ],
        prerequisites: ['strategy-builder-basics'],
        conceptsIntroduced: ['payoff-diagram', 'intrinsic-value', 'breakeven-points', 'curve-shape'],
      },
      {
        id: 'ppd-time-value',
        name: 'PPD & Time Value Mechanics',
        category: 'Core Concepts',
        difficulty: 3,
        description: 'Price Per Day (PPD) — time value decay per calendar day. Why far-term options can decay faster than near-term (PPD inversions), and why this counter-intuitive behavior is the core signal for the Option Insanity screener.',
        teachingNotes: 'PPD = extrinsic value / days to expiration. Most people assume near-term options always decay faster (theta). But PPD measures total time value efficiency, not instantaneous decay rate. A 90-DTE option with $9 extrinsic has PPD of $0.10/day. A 30-DTE option with $4 extrinsic has PPD of $0.13/day. The INVERSION is when the far-term PPD exceeds the near-term — meaning you\'re paying MORE per day for MORE time. This is the "insanity" signal. Walk through a real example to make the math tangible.',
        keyFiles: [
          { path: 'ppd-calculator.js', explanation: 'PPD computation — extrinsic value extraction, per-day normalization' },
          { path: 'screeners/option-insanity.js', explanation: 'Uses PPD inversions as primary scoring signal — the main consumer of PPD math' },
          { path: 'leap-cycles.js', explanation: 'LEAP cycle analysis — PPD comparison across multiple expiration cycles' },
        ],
        prerequisites: ['strategy-builder-basics'],
        conceptsIntroduced: ['ppd', 'extrinsic-value', 'time-decay', 'ppd-inversion', 'theta-vs-ppd'],
      },
      {
        id: 'greeks-calculation',
        name: 'Greeks Calculation & Display',
        category: 'Core Concepts',
        difficulty: 3,
        description: 'How Visopscreen calculates and displays delta, gamma, theta, and vega across strategy legs. Per-leg and net Greeks, and how they inform trade decisions.',
        teachingNotes: 'Greeks are computed per-leg then summed for net position. The key insight is that Greeks are DERIVATIVES of the P&L curve — delta is the slope, gamma is the curvature, theta is the time decay rate, vega is sensitivity to volatility. Show how a vertical spread has bounded delta (between 0 and 1) while a naked call has unbounded delta. The display updates live as you drag option chips to adjust strikes.',
        keyFiles: [
          { path: 'greeks-display.js', explanation: 'Per-leg and net Greeks calculation, formatting, and DOM rendering' },
          { path: 'greeks-calculator.js', explanation: 'Mathematical Greeks computation — Black-Scholes partial derivatives' },
          { path: 'strategy-builder.js', explanation: 'Triggers Greeks recalculation when legs change' },
        ],
        prerequisites: ['strategy-builder-basics', 'pnl-curves'],
        conceptsIntroduced: ['delta', 'gamma', 'theta', 'vega', 'net-greeks', 'position-greeks'],
      },
      {
        id: 'shape-scoring',
        name: 'Shape-Based P&L Scoring System',
        category: 'Core Concepts',
        difficulty: 3,
        description: 'The scoring system that evaluates P&L curve SHAPES — hump height, hump width, angle steepness, bisection sharpness. This is what makes Visopscreen unique: it scores trades by geometric properties of the payoff diagram, not just max profit or probability.',
        teachingNotes: 'This is the intellectual core of Visopscreen. Traditional screeners score by expected value or probability of profit. Visopscreen scores by SHAPE. A "hump" is a profit peak in the P&L curve. Hump height = max profit magnitude. Hump width = the price range where profit exceeds a threshold. Angle steepness = how sharply the curve rises/falls at the edges. Bisection sharpness = how symmetric the profit zone is around the current price. The aha moment: two trades can have identical max profit but wildly different shapes — one might have a narrow spike (fragile) while another has a wide plateau (robust). The scoring captures this distinction.',
        keyFiles: [
          { path: 'scoring.js', explanation: 'Core scoring engine — hump detection, width/height/steepness/bisection calculations' },
          { path: 'screeners/screener-base.js', explanation: 'Base screener class — wires scoring into the scan pipeline' },
          { path: 'pnl-graph.js', explanation: 'Generates the P&L data points that scoring analyzes' },
        ],
        prerequisites: ['pnl-curves'],
        conceptsIntroduced: ['hump-detection', 'hump-height', 'hump-width', 'angle-steepness', 'bisection-sharpness', 'shape-score'],
      },
      // ── Screeners (difficulty 3-4) ────────────────────────────────
      {
        id: 'weekly-income-screener',
        name: 'Weekly Income Screener',
        category: 'Screeners',
        difficulty: 3,
        description: 'Screens for weekly income strategies — covered calls, credit spreads, and similar structures optimized for consistent premium collection. Uses shape scoring to find trades with wide, stable profit zones.',
        teachingNotes: 'Weekly income is the most conservative screener category. The goal is strategies that collect premium reliably with limited risk. The scoring emphasizes hump WIDTH over height — a wide, flat profit zone is better than a tall narrow spike for income strategies. Show how the screener filters: first by basic profitability thresholds, then ranks by shape score. The results panel shows the scored strategies sorted by composite score, with visual indicators for each scoring component.',
        keyFiles: [
          { path: 'screeners/weekly-income.js', explanation: 'Weekly income screener — parameter configuration, scoring weights, result filtering' },
          { path: 'scoring.js', explanation: 'Scoring engine called by the screener — hump width weighted heavily here' },
          { path: 'screener-results.js', explanation: 'Results display — sorted strategies with score breakdown, click to load into builder' },
        ],
        prerequisites: ['shape-scoring', 'strategy-builder-basics'],
        conceptsIntroduced: ['income-strategies', 'premium-collection', 'width-weighted-scoring', 'screener-results'],
      },
      {
        id: 'option-insanity-screener',
        name: 'Option Insanity Screener',
        category: 'Screeners',
        difficulty: 4,
        description: 'Screens for PPD inversions — counter-intuitive situations where far-term options decay faster per day than near-term. These are the "insanity" opportunities where time value pricing breaks conventional assumptions.',
        teachingNotes: 'This is the most intellectually interesting screener. Most options education says "sell near-term, buy far-term" for calendar spreads because near-term decays faster. The Insanity screener finds exceptions where the OPPOSITE is true. Walk through the PPD inversion detection: compare PPD across expiration cycles for the same strike. When far-term PPD > near-term PPD, flag it. The scoring combines the magnitude of the inversion with the shape quality of the resulting trade. Emphasize that these inversions are real market anomalies, not bugs.',
        keyFiles: [
          { path: 'screeners/option-insanity.js', explanation: 'Insanity screener — PPD inversion detection, cross-cycle comparison, scoring' },
          { path: 'ppd-calculator.js', explanation: 'PPD computation that feeds the inversion detection' },
          { path: 'scoring.js', explanation: 'Shape scoring applied to inversion-based strategies' },
        ],
        prerequisites: ['ppd-time-value', 'shape-scoring'],
        conceptsIntroduced: ['ppd-inversion-detection', 'cross-cycle-comparison', 'time-value-anomalies'],
      },
      {
        id: 'vega-hedge-screener',
        name: 'Vega Hedge Screener',
        category: 'Screeners',
        difficulty: 4,
        description: 'Screens for volatility plays — strategies that profit from changes in implied volatility rather than directional price movement. Focuses on vega exposure management across legs.',
        teachingNotes: 'Vega hedging is about exploiting the volatility dimension. A strategy can be delta-neutral (no directional bet) but have significant vega exposure (profits if IV rises or falls). The screener looks for structures where vega is the dominant Greek. Show how a long straddle has high positive vega (profits from IV expansion) while an iron condor has negative vega (profits from IV contraction). The shape scoring here weights the P&L curve\'s sensitivity to IV changes, not just the at-expiration payoff.',
        keyFiles: [
          { path: 'screeners/vega-hedge.js', explanation: 'Vega hedge screener — vega exposure analysis, IV sensitivity scoring' },
          { path: 'greeks-calculator.js', explanation: 'Vega computation per leg — the mathematical foundation' },
          { path: 'scoring.js', explanation: 'Shape scoring with vega-weighted components' },
        ],
        prerequisites: ['greeks-calculation', 'shape-scoring'],
        conceptsIntroduced: ['vega-exposure', 'delta-neutral', 'iv-sensitivity', 'volatility-plays'],
      },
      {
        id: 'diagonal-butterfly-screener',
        name: 'Diagonals & Butterflies Screener',
        category: 'Screeners',
        difficulty: 4,
        description: 'Screens for complex multi-leg structures — diagonal spreads (different strikes AND expirations) and butterflies (3 strikes, 4 legs). These produce distinctive P&L shapes with defined risk and profit zones.',
        teachingNotes: 'Diagonals and butterflies are the most complex strategy types. A butterfly has a characteristic "tent" shape — peak profit at one price, losses tapering on both sides. A diagonal combines a vertical spread with a calendar spread. The aha moment is seeing how the scoring system handles these complex shapes: a butterfly\'s narrow peak scores high on hump HEIGHT but low on WIDTH, while a wide iron condor scores the opposite. Show how the screener iterates through strike combinations to find the optimal structure.',
        keyFiles: [
          { path: 'screeners/diagonals.js', explanation: 'Diagonal spread screener — cross-expiration strike selection, calendar component scoring' },
          { path: 'screeners/butterflies.js', explanation: 'Butterfly screener — 3-strike selection, wing width optimization, tent shape scoring' },
          { path: 'scoring.js', explanation: 'Shape scoring handles the multi-peaked P&L curves from complex structures' },
          { path: 'strategy-library.js', explanation: 'Templates for diagonal and butterfly structures — used as starting points' },
        ],
        prerequisites: ['shape-scoring', 'ppd-time-value'],
        conceptsIntroduced: ['diagonal-spreads', 'butterfly-spreads', 'multi-leg-optimization', 'tent-shape', 'wing-width'],
      },
      // ── Analysis & Research (difficulty 3-4) ──────────────────────
      {
        id: 'analysis-tools',
        name: 'Analysis Tools: Grid, Overlay, 3D',
        category: 'Analysis & Research',
        difficulty: 3,
        description: 'The Analysis tab\'s visualization suite — Grid view (strike x expiration matrix), Overlay (multiple P&L curves on one chart), 3D surface (price x time x P&L). Plus the time slider for P&L evolution.',
        teachingNotes: 'Grid view shows how profit changes across a matrix of strike prices and expirations — color-coded cells, green for profit, red for loss. Overlay plots multiple strategies on the same chart for direct comparison. 3D surface adds the time dimension — you can see how the P&L curve evolves from now to expiration. The time slider is the most powerful tool: drag it to see the P&L at any point before expiration. The aha moment is that a losing trade at expiration might be a winner at 50% DTE because of time value. Show the 3D surface rotating to reveal this.',
        keyFiles: [
          { path: 'analysis-grid.js', explanation: 'Grid visualization — strike x expiration P&L matrix with color coding' },
          { path: 'analysis-overlay.js', explanation: 'Overlay mode — multiple P&L curves on shared axes for comparison' },
          { path: 'analysis-3d.js', explanation: '3D surface plot — price x time x P&L using Plotly 3D scatter/mesh' },
          { path: 'time-slider.js', explanation: 'Time dimension control — adjusts DTE for P&L evolution animation' },
        ],
        prerequisites: ['pnl-curves', 'strategy-builder-basics'],
        conceptsIntroduced: ['grid-analysis', 'overlay-comparison', '3d-surface', 'time-slider', 'pnl-evolution'],
      },
      {
        id: 'leap-cycles',
        name: 'LEAP Cycles & Projection',
        category: 'Analysis & Research',
        difficulty: 3,
        description: 'LEAP (Long-Term Equity Anticipation Securities) cycle analysis — intrinsic/extrinsic value breakdown, PPD comparison across cycles, and multi-cycle projection for long-term hedge strategies.',
        teachingNotes: 'LEAPs are options with 1-3 year expirations. The LEAP Cycles tab breaks down each expiration cycle into intrinsic value (what it\'s worth if exercised now) and extrinsic value (time premium). PPD comparison across cycles reveals which expiration gives the best time-value efficiency. Multi-cycle projection shows how rolling a LEAP forward affects cumulative cost. The aha moment: a 2-year LEAP might have LOWER PPD than a 6-month option, meaning you pay less per day for much longer protection.',
        keyFiles: [
          { path: 'leap-cycles.js', explanation: 'LEAP cycle analysis — intrinsic/extrinsic breakdown, PPD per cycle, projection charts' },
          { path: 'ppd-calculator.js', explanation: 'PPD computation — shared with Insanity screener but used here for cycle comparison' },
          { path: 'pnl-graph.js', explanation: 'Rendering the LEAP projection charts' },
        ],
        prerequisites: ['ppd-time-value'],
        conceptsIntroduced: ['leaps', 'intrinsic-extrinsic-breakdown', 'cycle-comparison', 'roll-projection'],
      },
      {
        id: 'regime-detection',
        name: 'Market Regime Detection',
        category: 'Analysis & Research',
        difficulty: 4,
        description: 'Hidden Markov Model (HMM) that classifies market conditions into regimes: compression, trending, elevated volatility, crisis. Regime gates which screeners are recommended and auto-tunes parameters.',
        teachingNotes: 'The regime system is a Python Flask API that runs HMM classification on historical volatility data. It produces 4 states: compression (low vol, mean-reverting), trending (directional movement), elevated (high vol but orderly), crisis (extreme vol, fat tails). The key insight is that different screeners work best in different regimes — weekly income thrives in compression, vega hedges shine in elevated, and nothing works well in crisis (the system warns you to reduce exposure). The regime badge on the main UI updates automatically. Note: this has never been live-tested during market hours.',
        keyFiles: [
          { path: 'api/regime.py', explanation: 'Python Flask API — HMM training, state classification, confidence scoring' },
          { path: 'regime-badge.js', explanation: 'Browser-side regime display — fetches state from API, renders badge with color coding' },
          { path: 'screeners/screener-base.js', explanation: 'Base screener reads regime state to gate recommendations and adjust parameters' },
        ],
        prerequisites: ['shape-scoring'],
        conceptsIntroduced: ['hmm-classification', 'market-regimes', 'regime-gating', 'parameter-auto-tuning'],
      },
      // ── Architecture (difficulty 4-5) ─────────────────────────────
      {
        id: 'dual-architecture',
        name: 'Dual Architecture: Browser + Node.js',
        category: 'Architecture',
        difficulty: 5,
        description: 'How the same calculation code runs in both browser (window.*, DOM) and Node.js (global.*, headless engine). The shims.js bridging layer, headless/engine.js, and the 30+ CLI commands that mirror browser functionality.',
        teachingNotes: 'This is the deepest architectural topic. Visopscreen was built browser-first — everything uses window.* globals and DOM manipulation. Later, a headless engine was added for CLI batch scanning. The bridge is shims.js: it creates window-like globals in Node.js so browser modules can run unmodified. headless/engine.js orchestrates the headless pipeline. The aha moment: when you read a browser module like scoring.js, it writes to window.scoringResults. In headless mode, shims.js makes "window" actually be "global", so the same code works. The 30+ CLI commands in headless/cli/ are the user-facing interface to headless mode. The skills/ modules are reusable operation units that both CLI commands and the main app can invoke.',
        keyFiles: [
          { path: 'headless/engine.js', explanation: 'Headless orchestrator — loads shims, initializes modules, runs scan pipeline without browser' },
          { path: 'headless/shims.js', explanation: 'The bridge layer — creates window.*, document.* stubs so browser modules work in Node.js' },
          { path: 'headless/cli/scan.js', explanation: 'Example CLI command — batch scanning via headless engine, shows the full pipeline' },
          { path: 'spread-analyzer.js', explanation: 'Browser-side orchestrator — contrast with headless/engine.js to see the duality' },
        ],
        prerequisites: ['ui-navigation', 'data-sources'],
        conceptsIntroduced: ['headless-engine', 'shims-bridge', 'cli-commands', 'skills-modules', 'browser-node-duality'],
      },
      {
        id: 'global-state',
        name: 'The 5-Place Price Problem',
        category: 'Architecture',
        difficulty: 5,
        description: 'Where price is stored, why it is stored in 5 different places, why state-access.js exists to solve this but nothing imports it yet, and the reconciliation challenges that result.',
        teachingNotes: 'This is the most honest topic — it teaches a real architectural problem, not a clean abstraction. The current price lives in: (1) window.currentUnderlyingPrice, (2) tosIntegration.currentPrice, (3) DataHeader.currentPrice, (4) DOM #current-price, (5) DOM #header-price. Each was added by a different feature at a different time. They can get out of sync — e.g., switching underlying in the builder updates window.currentUnderlyingPrice but not tosIntegration.currentPrice. state-access.js was built as the canonical single source of truth, but adopting it requires refactoring every consumer. The aha moment: this is what happens in real codebases when global state grows organically. It is not a failure of design — it is a consequence of iterative development. Teach this as a real-world architecture lesson, not a bug to be ashamed of.',
        keyFiles: [
          { path: 'state-access.js', explanation: 'The intended solution — canonical price accessor, but nothing imports it yet' },
          { path: 'tos-integration.js', explanation: 'One of 5 price sources — keeps its own currentPrice from the live TOS feed' },
          { path: 'data-header.js', explanation: 'Another price source — DataHeader.currentPrice used by the header display' },
          { path: 'spread-analyzer.js', explanation: 'Sets window.currentUnderlyingPrice — the most commonly read global' },
        ],
        prerequisites: ['data-sources', 'ui-navigation'],
        conceptsIntroduced: ['global-state-fragmentation', 'state-access-pattern', 'price-reconciliation', 'organic-architecture'],
      },
    ],
  },
  'creator-workflow': {
    id: 'creator-workflow',
    name: 'Creator Workflow \u2014 Video Production Pipeline',
    repo: 'ethereal-flame-studio',
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
    curriculum: [],
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
