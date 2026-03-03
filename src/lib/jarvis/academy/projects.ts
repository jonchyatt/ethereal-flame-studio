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
  /** data-tutorial-id values for DOM highlighting (same-origin teaching) */
  spotlightTargets?: string[];
  /** Same-origin verification steps for interactive teaching */
  verificationSteps?: Array<{ type: 'route' | 'store' | 'action'; check: string }>;
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
    curriculum: [
      // ── Getting Started (difficulty 1-2) ──────────────────────────
      {
        id: 'dashboard-overview',
        name: 'Batch Dashboard UI',
        category: 'Getting Started',
        difficulty: 1,
        description: 'The Creator Dashboard — per-pack status grid showing render/recut/publish progress, one-click Sync/Recut/Publish actions, and auto-refresh polling. The command center for the entire Creator Workflow pipeline.',
        teachingNotes: 'Start here because the dashboard is where Jonathan interacts with the pipeline most. The page fetches from /api/creator/dashboard and renders a DashboardRow per pack. Each row has a LiveSummary with variant-level status (queued/processing/complete/failed). The aha moment is that the dashboard is a live mirror of the job queue — every status badge maps directly to a job state in the worker. Show how the Sync button triggers a creator-pack-sync job that reconciles render variant status with the job store. The auto-refresh polls every 5 seconds, so status updates flow from worker → job store → API → dashboard without manual refreshing.',
        keyFiles: [
          { path: 'src/app/creator/dashboard/page.tsx', explanation: 'Full dashboard UI — DashboardRow type, status badges, Sync/Recut/Publish action buttons, 5s auto-refresh polling' },
          { path: 'src/lib/creator/sync.ts', explanation: 'Pack sync logic — reads job store to compute CreatorPackSyncSummary with per-variant live status' },
          { path: 'src/lib/creator/store.ts', explanation: 'R2-backed persistence — saveCreatorRenderPack, listCreatorRenderPacks, JSON serialization to creator/packs/ prefix' },
          { path: 'src/lib/creator/types.ts', explanation: 'Zod schemas for every Creator entity — CreatorRenderPack, variants, recut executions, publish tasks' },
        ],
        prerequisites: [],
        conceptsIntroduced: ['creator-render-pack', 'live-summary', 'pack-sync', 'variant-status', 'auto-refresh-polling'],
      },
      {
        id: 'content-library',
        name: 'Content Library & Tagging',
        category: 'Getting Started',
        difficulty: 2,
        description: 'The Content Library — browsing packs, editing mood/BPM/topic/keyword tags, reviewing AI-suggested recut segments with accept/reject workflow, and inspecting auto-generated publish metadata per platform.',
        teachingNotes: 'The library page is the richest UI in Creator Workflow. It loads ContentLibraryItems (not raw packs) — these are the enriched representations with tags, recut plans, thumbnail plans, and publish drafts attached. The page has three tabs: Metadata (tags), Recuts (segment review), and Thumbnails (candidate selection). The aha moment is the data flow: a pack starts as a CreatorRenderPack (just audio + variants), gets synced into a ContentLibraryItem (adding tags, plans, drafts), and the library page reads that enriched version. The recut review workflow is particularly interesting — segments have a reviewStatus (pending/accepted/rejected) that Jonathan sets, and only accepted segments get queued for FFmpeg extraction.',
        keyFiles: [
          { path: 'src/app/creator/library/page.tsx', explanation: 'Library UI — three-tab layout (Metadata, Recuts, Thumbnails), tag editing, segment review with accept/reject' },
          { path: 'src/lib/creator/types.ts', explanation: 'ContentLibraryItem schema — the enriched pack with tags, recutPlans, thumbnailPlans, publishDrafts' },
          { path: 'src/lib/creator/recut.ts', explanation: 'createAutoRecutPlan — generates segment suggestions with scoring based on duration and platform caps' },
          { path: 'src/lib/creator/metadata.ts', explanation: 'generatePublishDrafts — auto-generates titles, descriptions, hashtags per platform from channel presets and tags' },
        ],
        prerequisites: ['dashboard-overview'],
        conceptsIntroduced: ['content-library-item', 'recut-segments', 'review-status', 'publish-drafts', 'tag-enrichment'],
      },
      {
        id: 'thumbnail-planner',
        name: 'Thumbnail Planner & Safe Zones',
        category: 'Getting Started',
        difficulty: 2,
        description: 'Thumbnail planning — auto-picked candidate timestamps with center-biased scoring, manual scrubber, safe-zone overlays for YouTube/Shorts/Square, and frame capture to PNG. How the system accounts for platform-specific UI chrome.',
        teachingNotes: 'Thumbnails are surprisingly complex because each platform has different UI overlay zones. YouTube puts the duration badge bottom-right, Shorts has top/bottom UI bars, Square has centered cropping. The safe zone system defines rectangles as normalized 0-1 coordinates (x, y, width, height) so they scale to any resolution. The aha moment: createThumbnailPlan uses heuristic spacing with center bias — candidates are evenly distributed across the video timeline but scored higher toward the middle (where the visual is typically most interesting). The scoring formula is `1 - normalizedDistance * 0.55`, giving center frames ~1.0 and edge frames ~0.45. The planner page lets Jonathan visually see safe zone overlays on the video frame and pick the best candidate.',
        keyFiles: [
          { path: 'src/app/creator/thumbnail-planner/page.tsx', explanation: 'Thumbnail planner UI — video scrubber, safe zone dropdown, overlay visualization, candidate list with scores' },
          { path: 'src/lib/creator/thumbnail.ts', explanation: 'createThumbnailPlan — candidate timestamp generation with center-biased scoring heuristic' },
          { path: 'src/lib/creator/presets.ts', explanation: 'SAFE_ZONE_PRESETS — normalized rectangle definitions for YouTube 16:9, Shorts 9:16, and Square 1:1' },
        ],
        prerequisites: ['dashboard-overview'],
        conceptsIntroduced: ['safe-zones', 'normalized-coordinates', 'center-bias-scoring', 'platform-ui-chrome', 'candidate-timestamps'],
      },
      // ── Render Pipeline (difficulty 2-4) ──────────────────────────
      {
        id: 'render-pipeline-overview',
        name: 'End-to-End Render Pipeline',
        category: 'Render Pipeline',
        difficulty: 2,
        description: 'The full render flow from audio file to finished video: audio pre-analysis → Puppeteer headless frame capture → FFmpeg encoding → optional VR metadata injection → cleanup. The renderVideo.ts orchestrator that ties everything together.',
        teachingNotes: 'renderVideo.ts is the conductor — it calls each pipeline stage in sequence and reports progress through a unified callback. The 5-stage pipeline maps to progress ranges: analyzing (0-10%), capturing (10-75%), encoding (75-95%), metadata (95-99%), complete (100%). The aha moment is that the SAME scene running in the browser is what Puppeteer captures — it opens the app URL, activates render mode via RenderModeAPI, and captures frame-by-frame with injected audio data. This means the visual you see in the browser IS the video. There are two render paths: local (renderVideo.ts with Puppeteer) and cloud (Modal.com GPU via worker/pipelines/render.ts). Local rendering is deterministic because PreAnalyzer generates all per-frame audio data upfront, and the scene uses fixed time steps instead of real-time deltaTime.',
        keyFiles: [
          { path: 'src/lib/render/renderVideo.ts', explanation: 'Top-level orchestrator — 5-stage pipeline with progress tracking, abort support, and temp file cleanup' },
          { path: 'src/lib/render/PuppeteerRenderer.ts', explanation: 'Puppeteer driver — launches headless Chrome, controls RenderModeAPI, captures frames to disk' },
          { path: 'src/lib/render/FFmpegEncoder.ts', explanation: 'FFmpeg encoding — H.264/H.265 with NVENC support, multi-format output, audio muxing' },
          { path: 'src/lib/render/ExportPipeline.ts', explanation: 'Browser-side export — routes to flat/360-mono/360-stereo pipeline, coordinates analyze→render→encode→metadata' },
        ],
        prerequisites: [],
        conceptsIntroduced: ['render-pipeline', 'stage-based-progress', 'local-vs-cloud-render', 'deterministic-rendering', 'render-mode'],
      },
      {
        id: 'audio-analysis',
        name: 'Audio-Driven Visual Sync',
        category: 'Render Pipeline',
        difficulty: 3,
        description: 'How audio drives the flame/mist visuals. Two analyzers: AudioAnalyzer (real-time Web Audio API for live playback) and PreAnalyzer (offline FFT for frame-accurate rendering). Frequency band separation, beat detection, and the FrameAudioData contract that feeds the Three.js scene.',
        teachingNotes: 'The dual-analyzer architecture is the key insight. AudioAnalyzer is a singleton that wraps Web Audio API AnalyserNode — it provides real-time amplitude, bass, mid, high values that the Three.js scene reads every animation frame. PreAnalyzer does the SAME frequency band math (identical FFT_SIZE=512, same band boundaries: bass 0-3, mids 4-46, highs 47-139) but runs offline over the entire audio file, producing a FrameAudioData array indexed by frame number. Beat detection uses threshold crossing with 80ms cooldown — when bass jumps above previousBass * bias, it is flagged as a beat. The aha moment: during live playback the orb reacts to AudioAnalyzer\'s real-time data, but during rendering Puppeteer injects PreAnalyzer\'s pre-computed data frame-by-frame. Same visual result, deterministic output. The frequency bands directly map to visual parameters: bass → orb scale pulse, mids → particle intensity, highs → color shimmer.',
        keyFiles: [
          { path: 'src/lib/audio/AudioAnalyzer.ts', explanation: 'Real-time analyzer singleton — Web Audio API FFT, frequency band separation, beat detection with cooldown' },
          { path: 'src/lib/audio/PreAnalyzer.ts', explanation: 'Offline pre-analyzer — generates per-frame FrameAudioData array for deterministic rendering, IndexedDB caching' },
          { path: 'src/lib/render/RenderModeAPI.ts', explanation: 'The bridge — window.__renderMode injects pre-analyzed audio data into the scene frame-by-frame during capture' },
        ],
        prerequisites: ['render-pipeline-overview'],
        conceptsIntroduced: ['fft-analysis', 'frequency-bands', 'beat-detection', 'frame-audio-data', 'real-time-vs-offline', 'audio-visual-mapping'],
      },
      {
        id: 'frame-capture',
        name: 'Puppeteer Frame Capture',
        category: 'Render Pipeline',
        difficulty: 4,
        description: 'Puppeteer headless Chrome rendering — launching GPU-accelerated Chrome, controlling the Three.js scene via RenderModeAPI, and capturing frames at target FPS with checkpoint/resume support for long renders.',
        teachingNotes: 'PuppeteerRenderer is the most technically complex module. It launches headless Chrome with GPU flags (--use-gl=egl for Linux, --use-angle=swiftshader for fallback), sets viewport to exact output resolution, and navigates to the app. The scene exposes window.__renderMode as the control surface: init(config), advanceFrame(audioData), captureFrame(). Each call to advanceFrame injects the pre-analyzed audio data and ticks the scene forward by exactly 1/FPS seconds — no real-time deltaTime, purely deterministic. captureFrame() uses page.screenshot() to grab the rendered WebGL canvas. For long renders (thousands of frames), checkpointInterval saves progress every N frames, and startFrame enables resume from a checkpoint. The aha moment: the scene thinks it is running normally — it reads from the audio store and updates at its animation loop. RenderModeAPI intercepts this by overriding the stores with injected data, so existing scene code works unmodified.',
        keyFiles: [
          { path: 'src/lib/render/PuppeteerRenderer.ts', explanation: 'Puppeteer driver — Chrome launch flags, viewport sizing, frame-by-frame capture loop, checkpoint/resume' },
          { path: 'src/lib/render/RenderModeAPI.ts', explanation: 'Browser-side render API — window.__renderMode interface, store overrides, fixed time step injection' },
          { path: 'src/lib/render/SceneStepper.ts', explanation: 'Frame advance logic — deterministic time stepping, scene update orchestration per captured frame' },
          { path: 'src/lib/render/FrameCapture.ts', explanation: 'Frame capture utilities — PNG/JPEG output, canvas readback, CapturedFrame type' },
        ],
        prerequisites: ['audio-analysis', 'render-pipeline-overview'],
        conceptsIntroduced: ['headless-chrome', 'gpu-rendering-flags', 'render-mode-api', 'checkpoint-resume', 'deterministic-time-stepping'],
      },
      {
        id: 'ffmpeg-encoding',
        name: 'FFmpeg Encoding Pipeline',
        category: 'Render Pipeline',
        difficulty: 3,
        description: 'FFmpeg video encoding — frame sequences to H.264/H.265 with optional NVENC GPU acceleration, multi-format output (1080p/4K, landscape/portrait/square, 360), quality presets, audio muxing, and two-pass encoding for higher quality.',
        teachingNotes: 'FFmpegEncoder spawns FFmpeg as a child process and feeds it the frame directory. The OutputFormat type defines 10 formats across flat and 360 — each format maps to specific resolution, bitrate, and codec settings. The quality preset system has three tiers: fast (CRF 28, veryfast), balanced (CRF 23, medium), quality (CRF 18, slow or two-pass). The aha moment: NVENC detection is automatic — getRecommendedCodec() checks the format and system capabilities to pick h264, h264_nvenc, h265, or hevc_nvenc. For 360 video, h265 is preferred because the higher compression handles 4K-8K equirectangular frames much better. The encoder emits progress via FFmpeg stderr parsing (frame count, fps, bitrate), which renderVideo.ts maps to the 75-95% overall progress range. The timeoutMs option kills hung FFmpeg processes — critical for the worker where a stalled encode would block the entire queue.',
        keyFiles: [
          { path: 'src/lib/render/FFmpegEncoder.ts', explanation: 'FFmpeg wrapper — codec selection, quality presets, child process management, progress parsing, NVENC support' },
          { path: 'src/lib/render/renderConfig.ts', explanation: 'Render config schema — Zod validation for CLI config files exported from the web UI' },
          { path: 'src/lib/render/schema/types.ts', explanation: 'OutputFormat enum, JobStatus state machine, branded ID types — the type foundation for the entire pipeline' },
          { path: 'scripts/render-cli.ts', explanation: 'CLI entry point — parses config JSON, auto-starts dev server, orchestrates renderVideo with terminal progress bar' },
        ],
        prerequisites: ['render-pipeline-overview'],
        conceptsIntroduced: ['h264-h265-codecs', 'nvenc-acceleration', 'quality-presets', 'crf-encoding', 'two-pass-encoding', 'audio-muxing'],
      },
      // ── Publishing & Distribution (difficulty 2-3) ────────────────
      {
        id: 'recut-engine',
        name: 'Recut Engine & Segment Extraction',
        category: 'Publishing & Distribution',
        difficulty: 3,
        description: 'AI-powered recut — segment detection with scoring, accept/reject/preview workflow, and FFmpeg segment extraction with aspect ratio adaptation (crop + scale). How full-length renders become platform-appropriate short-form clips.',
        teachingNotes: 'The recut system has two parts: planning (src/lib/creator/recut.ts) and execution (src/lib/creator/ffmpegRecut.ts). createAutoRecutPlan generates segments heuristically — it divides the video into evenly spaced regions, centered within each region, capped to the platform duration limit. The scoring gives the first segment 0.85 and decreases by 0.08 per subsequent segment ("Hook-first teaser cut" scores highest). The aha moment is the FFmpeg extraction: recutVideo() takes a segment (startSec/endSec) and crops + scales it to the target aspect ratio in a single FFmpeg pass. buildCrop() computes the center-crop rectangle with evenFloor() ensuring all dimensions are even (FFmpeg H.264 requires this). For a 16:9 source going to 9:16 Shorts, it crops a narrow vertical strip from the center. The worker pipeline (creator-recut) downloads the source video from R2, runs ffmpegRecut, and uploads the result back.',
        keyFiles: [
          { path: 'src/lib/creator/recut.ts', explanation: 'createAutoRecutPlan — heuristic segment generation with spacing, scoring, and platform duration caps' },
          { path: 'src/lib/creator/ffmpegRecut.ts', explanation: 'recutVideo — FFmpeg segment extraction with crop/scale for aspect ratio adaptation, evenFloor math' },
          { path: 'worker/pipelines/creator-recut.ts', explanation: 'Worker pipeline — downloads source from R2, runs FFmpeg recut, uploads result, updates job status' },
          { path: 'src/lib/creator/queue.ts', explanation: 'Queue orchestration — enqueues recut jobs from accepted segments, resolves source video keys from render jobs' },
        ],
        prerequisites: ['content-library', 'render-pipeline-overview'],
        conceptsIntroduced: ['segment-scoring', 'aspect-ratio-cropping', 'even-floor-dimensions', 'hook-first-scoring', 'segment-extraction'],
      },
      {
        id: 'multi-platform-publish',
        name: 'Multi-Platform Publishing',
        category: 'Publishing & Distribution',
        difficulty: 3,
        description: '7 platform targets with different aspect ratios, durations, and metadata. Channel metadata presets for title/description/hashtag templating. Publish connectors for YouTube (API), TikTok, and Instagram. Draft vs schedule modes.',
        teachingNotes: 'The publish system is three layers: metadata generation, job queueing, and platform connectors. generatePublishDrafts() takes channel preset IDs and tags, then fills title/description templates with {topic}, {mood}, {seconds} placeholders. Each ChannelMetadataPreset defines platform-specific templates (YouTube titles are longer, TikTok titles are hook-driven, Instagram uses more hashtags). The aha moment is the connector architecture: publishConnectors.ts has a dispatching pattern per provider. YouTube uses the googleapis SDK for direct API upload with OAuth2. TikTok and Instagram use the manual-draft pattern — the connector generates a draft manifest JSON with metadata + signed video URL, uploaded to R2, for manual submission. The per-platform env var pattern (CREATOR_PUBLISH_ENABLED_YOUTUBE, CREATOR_PUBLISH_MODE_TIKTOK) lets Jonathan enable/disable each platform independently. The worker pipeline downloads the video, calls the appropriate connector, and records the providerStatus/externalId.',
        keyFiles: [
          { path: 'src/lib/creator/publishConnectors.ts', explanation: 'Platform connectors — YouTube API upload, TikTok/Instagram manual-draft manifest, per-platform env config' },
          { path: 'src/lib/creator/metadata.ts', explanation: 'generatePublishDrafts — template-based metadata generation from channel presets and content tags' },
          { path: 'src/lib/creator/presets.ts', explanation: 'ChannelMetadataPreset definitions — per-platform title templates, hashtag sets, CTA templates, keyword packs' },
          { path: 'worker/pipelines/publish.ts', explanation: 'Publish worker pipeline — downloads video, dispatches to connector, records provider response' },
        ],
        prerequisites: ['content-library'],
        conceptsIntroduced: ['channel-presets', 'metadata-templates', 'publish-connectors', 'draft-manifest', 'per-platform-config'],
      },
      // ── Architecture (difficulty 3-5) ─────────────────────────────
      {
        id: 'presets-system',
        name: 'Layered Presets System',
        category: 'Architecture',
        difficulty: 3,
        description: 'Four layers of presets that compose: bundle presets (content series), export pack presets (format combinations), channel metadata presets (platform publishing), and safe zone presets (thumbnail regions). How they compose and override to produce a complete render-to-publish configuration.',
        teachingNotes: 'The presets system is an elegant composition pattern. At the top: CreatorBundlePreset defines a content series (e.g., "meditation-series") with default export packs, style variants (flame/mist + orb audio preset), and channel preset IDs. One level down: ExportPackPreset defines a set of render variants — "standard-all-core" queues 4 formats (1080p/4K × landscape/portrait). Each variant specifies outputFormat, fps, platformTargets, durationCapSec, and safeZonePresetId. The safe zone presets define normalized rectangles for thumbnail planning. The aha moment: when Jonathan creates a new pack, he picks a bundle preset → that determines the export pack → which determines the render variants → which determines the safe zones for thumbnails AND the platform targets for publish metadata. One choice cascades through the entire pipeline. The orbAudioResponsePresets add another dimension — they tune how the orb responds to audio (meditation is slow/gentle, phonk is aggressive/punchy), and these are tied to style variants within the bundle.',
        keyFiles: [
          { path: 'src/lib/creator/presets.ts', explanation: 'All preset definitions — SAFE_ZONE_PRESETS, EXPORT_PACK_PRESETS, CHANNEL_METADATA_PRESETS, CREATOR_BUNDLE_PRESETS' },
          { path: 'src/lib/creator/types.ts', explanation: 'Schema types for every preset consumer — CreatorStyleVariant, CreatorRenderVariant, CreatorPublishDraft' },
          { path: 'src/lib/creator/orbAudioResponsePresets.ts', explanation: 'Orb audio response tuning — meditation/speech/phonk/cinematic parameter profiles for visual-audio coupling' },
          { path: 'src/lib/creator/metadata.ts', explanation: 'Channel preset consumer — generatePublishDrafts reads preset templates to produce platform-specific metadata' },
        ],
        prerequisites: ['dashboard-overview', 'thumbnail-planner'],
        conceptsIntroduced: ['bundle-presets', 'export-pack-presets', 'channel-presets', 'preset-composition', 'cascading-configuration'],
      },
      {
        id: 'job-queue-worker',
        name: 'Worker Process & Job Queue',
        category: 'Architecture',
        difficulty: 4,
        description: 'Standalone worker process architecture — Turso-backed job store, poll-based processing, 8 pipeline types (ingest/preview/save/render/playlist/creator-recut/publish/creator-pack-sync), heartbeat monitoring, stale job reaping, and graceful shutdown with SIGTERM→SIGKILL escalation.',
        teachingNotes: 'The worker is a standalone Node.js process (worker/index.ts) deployed to Render.com. It polls Turso for pending jobs every 3 seconds and processes them one at a time. process-job.ts is the dispatcher — it pattern-matches on job.type to route to the correct pipeline module. Each pipeline gets a ChildProcess ref for cleanup, a heartbeat interval (5s updates to prevent the reaper from killing active jobs), and cancellation polling (2s checks if the job was cancelled externally). The aha moment is the render pipeline\'s async completion model: unlike other pipelines that run synchronously, the render pipeline dispatches to Modal.com and leaves the job in "dispatched-to-modal" status. A separate webhook from Modal marks the job complete — render-wait.ts handles this polling/webhook pattern. The reaper (worker/reaper.ts) runs every 30 seconds and kills jobs whose heartbeat is stale (worker died mid-job). The SIGTERM→SIGKILL escalation in killChildProcess gives FFmpeg 5 seconds to clean up before force-killing — critical for not leaving orphaned temp files.',
        keyFiles: [
          { path: 'worker/index.ts', explanation: 'Worker entry point — poll loop, reaper timer, graceful shutdown, per-job-type timeout configuration' },
          { path: 'worker/process-job.ts', explanation: 'Job dispatcher — routes by type to pipeline modules, heartbeat, cancellation polling, SIGTERM→SIGKILL cleanup' },
          { path: 'worker/pipelines/render.ts', explanation: 'Render pipeline — R2 audio upload, Modal dispatch, async completion (webhook-driven, not synchronous)' },
          { path: 'worker/reaper.ts', explanation: 'Stale job reaper — detects dead workers by heartbeat staleness, marks orphaned jobs as failed for retry' },
        ],
        prerequisites: ['render-pipeline-overview'],
        conceptsIntroduced: ['poll-based-worker', 'job-dispatch', 'heartbeat-monitoring', 'stale-job-reaping', 'async-completion-model', 'graceful-shutdown'],
      },
      {
        id: 'vr-rendering',
        name: 'Full VR Pipeline',
        category: 'Architecture',
        difficulty: 5,
        description: 'The complete 360/VR rendering pipeline: CubemapCapture → EquirectangularConverter → StereoStacker → SpatialMetadataInjector. How a Three.js scene becomes a YouTube VR-compatible equirectangular video with stereo 3D and spatial metadata.',
        teachingNotes: 'VR rendering is the deepest technical topic in Creator Workflow. The pipeline captures the Three.js scene from all directions simultaneously using CubeCamera (6 faces × N frames), converts each cubemap to a 2:1 equirectangular projection via a fullscreen quad with a custom GLSL shader, optionally creates stereo by offsetting the camera position for left/right eyes and stacking them top/bottom, then injects Google Spatial Media metadata so YouTube/VR headsets recognize the projection. The aha moment is the math: equirectangular projection maps longitude (0-2π) to horizontal pixels and latitude (-π/2 to π/2) to vertical pixels. The fragment shader computes a 3D direction vector from each equirect pixel coordinate, then samples the cubemap at that direction. For stereo, the IPD (inter-pupillary distance) creates the parallax — left eye camera is offset -IPD/2 in X, right eye +IPD/2. StereoStacker composites them into Over/Under format (4096×4096 for 4K stereo: left eye top 4096×2048, right eye bottom 4096×2048). The resolution progression matters: 4K→1024 cube faces, 6K→1536, 8K→2048. Each face is 67MB uncompressed at 8K — memory management is critical.',
        keyFiles: [
          { path: 'src/lib/render/CubemapCapture.ts', explanation: 'CubeCamera wrapper — captures 6 faces per frame, resolution mapping (equirect width / 4 = cube face size)' },
          { path: 'src/lib/render/EquirectangularConverter.ts', explanation: 'Cubemap→equirect shader — fullscreen quad, custom GLSL, direction vector computation from pixel coordinates' },
          { path: 'src/lib/render/StereoStacker.ts', explanation: 'Over/Under compositor — stacks left/right eye equirect frames for YouTube VR 3D format' },
          { path: 'src/lib/render/SpatialMetadataInjector.ts', explanation: 'Google Spatial Media injection — Python tool spawning, equirectangular/top-bottom metadata tags for VR playback' },
        ],
        prerequisites: ['frame-capture', 'ffmpeg-encoding'],
        conceptsIntroduced: ['cubemap-capture', 'equirectangular-projection', 'stereo-over-under', 'spatial-metadata', 'ipd-parallax', 'cube-face-resolution'],
      },
    ],
  },
  jarvis: {
    id: 'jarvis',
    name: 'How to Use Jarvis',
    repo: 'ethereal-flame-studio',
    basePath: 'src',
    description: 'Your personal OS — tasks, habits, bills, calendar, meals, and more. Learn how to navigate Jarvis, manage your daily life, and get the most out of every feature.',
    techStack: 'Next.js (App Router), TypeScript, Tailwind CSS, Zustand stores, Anthropic Claude API, Notion API, glassmorphism dark UI.',
    architecture: 'JarvisShell wraps all pages with DomainRail (desktop sidebar) + BottomTabBar (mobile). Home shows PriorityStack. Personal domain has sub-programs: Tasks, Habits, Bills, Calendar, Meals, Journal, Goals, Health. Chat overlay provides conversational AI with tool-calling brain. Academy teaches about the system itself.',
    workflows: `1. MORNING BRIEFING: Open chat → say "brief me" → Jarvis summarizes tasks, habits, bills, calendar, meals for the day
2. TASK MANAGEMENT: Personal → Tasks → view grouped by urgency → tap to complete → Notion syncs
3. HABIT TRACKING: Personal → Habits → daily check-ins → streak tracking → trend visualization
4. BILL TRACKING: Personal → Bills → urgency-colored due dates → mark paid → payment history
5. CALENDAR: Personal → Calendar → view events → understand schedule
6. MEAL PLANNING: Personal → Meals → weekly meal plan → grocery lists → kitchen intelligence`,
    complexAreas: `- NAVIGATION: Three-layer nav (DomainRail for domains, BottomTabBar for core actions, Command Palette for power users). Mobile collapses rail into bottom tabs.
- CHAT BRAIN: Anthropic Claude with tool-calling. System prompt injected with user context, timezone, active rules. Tools for Notion CRUD, memory search, briefing generation.
- DATA FLOW: Notion API → briefing endpoint → BriefingData → personalStore + homeStore. One fetch populates both stores.
- ACADEMY: Same-origin teaching — Academy reads actual Jarvis source code and can spotlight UI elements for interactive lessons.`,
    curriculum: [
      // ── Tier 0: First Contact ─────────────────────────────────────
      {
        id: 'welcome-tour',
        name: 'Meet Jarvis',
        category: 'First Contact',
        difficulty: 1,
        description: 'What Jarvis is, what it does, and how it is organized. The shell layout, domain rail, bottom tabs, and home screen.',
        teachingNotes: 'Start with the big picture: Jarvis is a personal operating system that connects every area of your life into one dashboard. The shell has three layers: JarvisShell wraps everything, DomainRail on the left (desktop) shows domain icons, BottomTabBar (mobile) provides Home/Chat/Academy quick access. Home shows PriorityStack — the most important items across all domains, sorted by urgency. The user should understand that each domain (Personal, Ethereal Flame, etc.) is a separate world with its own sub-programs, but Home aggregates the most urgent items from all of them. Point out the cyan glow on active nav items and the glassmorphism card style that runs through the entire UI.',
        keyFiles: [
          { path: 'components/jarvis/layout/JarvisShell.tsx', explanation: 'The outermost wrapper — renders DomainRail, BottomTabBar, and page content with proper chrome offsets' },
          { path: 'components/jarvis/layout/DomainRail.tsx', explanation: 'Desktop sidebar — domain icons with active indicator, collapses on mobile' },
          { path: 'components/jarvis/layout/BottomTabBar.tsx', explanation: 'Mobile navigation — Home, Chat, Academy tabs with badge indicators' },
        ],
        prerequisites: [],
        conceptsIntroduced: ['jarvis-shell', 'domain-rail', 'bottom-tabs', 'priority-stack', 'glassmorphism-ui'],
        spotlightTargets: ['domain-rail', 'bottom-tabs', 'home-priority-stack'],
        verificationSteps: [
          { type: 'route', check: '/jarvis/app' },
        ],
      },
      {
        id: 'navigation-basics',
        name: 'Navigation — Rail, Tabs & Command Palette',
        category: 'First Contact',
        difficulty: 1,
        description: 'How to move around Jarvis: Domain Rail for switching domains, Bottom Tabs for core actions, and Command Palette (Cmd+K) for power users.',
        teachingNotes: 'Navigation has three tiers designed for different usage patterns. Domain Rail (desktop left sidebar) shows all active domains — click an icon to switch. The Personal domain (violet) is always on. Bottom Tabs (mobile) provide the three most-used actions: Home (priority view), Chat (AI assistant), Academy (learning). Command Palette (Cmd+K or Ctrl+K) is the power-user shortcut — type to search any page, domain, or action. The aha moment: you never need to memorize where things are, because Command Palette can find anything. Teach the user to try Cmd+K and type "tasks" or "bills" to jump directly. On mobile, the bottom tabs replace the domain rail entirely — the rail is hidden and domains are accessed through Home cards instead.',
        keyFiles: [
          { path: 'components/jarvis/layout/DomainRail.tsx', explanation: 'Desktop domain switching — icon list with active state, domain color indicators' },
          { path: 'components/jarvis/layout/BottomTabBar.tsx', explanation: 'Mobile core navigation — Home/Chat/Academy with unread badges' },
          { path: 'components/jarvis/layout/CommandPalette.tsx', explanation: 'Power-user search — Cmd+K overlay, fuzzy search across pages and actions' },
        ],
        prerequisites: ['welcome-tour'],
        conceptsIntroduced: ['domain-switching', 'command-palette', 'mobile-navigation', 'desktop-rail'],
        spotlightTargets: ['domain-rail-personal', 'bottom-tab-home', 'bottom-tab-chat', 'bottom-tab-academy'],
        verificationSteps: [
          { type: 'action', check: 'User can identify Domain Rail on desktop or Bottom Tabs on mobile' },
        ],
      },
      // ── Tier 1: Your First Day ────────────────────────────────────
      {
        id: 'tasks-basics',
        name: 'Tasks — View, Complete & Create',
        category: 'Your First Day',
        difficulty: 1,
        description: 'How to view your tasks grouped by urgency, mark them complete, and understand how tasks flow from Notion into Jarvis.',
        teachingNotes: 'Tasks are the most-used Personal sub-program. TasksList.tsx groups tasks by urgency: overdue (red), due today (amber), upcoming (default). Each task shows its title, due date, and project. Completing a task calls the Notion API to update the checkbox — this is one of the few write-back mutations that actually works. The data flows from Notion → /api/jarvis/briefing → personalStore.tasks. The user should understand that tasks come from their Notion Life OS and Jarvis is a window into that data. The urgency grouping uses getToday() for date comparison (fixed in the L4 audit — was hardcoded). Show the user how to tap a task to see details and hit the complete button.',
        keyFiles: [
          { path: 'components/jarvis/personal/TasksList.tsx', explanation: 'Task list UI — urgency grouping, completion toggle, empty state handling' },
          { path: 'lib/jarvis/stores/personalStore.ts', explanation: 'Tasks state — populated from BriefingData, provides task items to the UI' },
        ],
        prerequisites: ['navigation-basics'],
        conceptsIntroduced: ['task-completion', 'urgency-grouping', 'notion-sync', 'personal-sub-programs'],
        spotlightTargets: ['home-domain-card-personal', 'personal-subprogram-tasks'],
        verificationSteps: [
          { type: 'route', check: '/jarvis/app/personal' },
          { type: 'store', check: 'personalStore.tasks.length > 0' },
        ],
      },
      {
        id: 'habits-basics',
        name: 'Habits — Track Daily & Build Streaks',
        category: 'Your First Day',
        difficulty: 1,
        description: 'How to track daily habits, view your streaks, and understand the habit check-in workflow.',
        teachingNotes: 'Habits are the second key Personal sub-program. HabitsList.tsx shows each habit with its current streak count and a daily check-in button. Streaks are the motivational core — seeing a number go up each day creates the "don\'t break the chain" effect. The data comes from Notion habit databases via the briefing endpoint. Each habit has a name, streak count, and last-completed date. The user should understand that checking in a habit records today\'s completion. Show how the streak number increments and how missing a day resets it. The habits widget on the Home screen shows the top streak habits as a quick glance.',
        keyFiles: [
          { path: 'components/jarvis/personal/HabitsList.tsx', explanation: 'Habit list UI — streak display, daily check-in button, trend visualization' },
          { path: 'lib/jarvis/stores/personalStore.ts', explanation: 'Habits state — populated from BriefingData, provides habit items with streaks' },
        ],
        prerequisites: ['navigation-basics'],
        conceptsIntroduced: ['habit-streaks', 'daily-check-in', 'streak-motivation'],
        spotlightTargets: ['personal-subprogram-habits'],
        verificationSteps: [
          { type: 'route', check: '/jarvis/app/personal' },
        ],
      },
      {
        id: 'bills-basics',
        name: 'Bills — Track Payments & Urgency Colors',
        category: 'Your First Day',
        difficulty: 2,
        description: 'How to track bills, understand urgency color coding (overdue/due soon/upcoming), mark bills as paid, and view payment history.',
        teachingNotes: 'Bills are color-coded by urgency — this is the key visual language. Red means overdue (past due date), amber means due within 3 days, default means upcoming. BillsList.tsx renders each bill with its name, amount, due date, and a "Mark Paid" button. The urgency colors match the task system for consistency. Bills come from Notion via the briefing endpoint. The user should understand that marking a bill paid records the payment date but the bill will reappear next cycle (recurring bills). The Home screen bill widget shows total amount due this week as a financial awareness glance. Teach the user to check bills at the start of each week.',
        keyFiles: [
          { path: 'components/jarvis/personal/BillsList.tsx', explanation: 'Bill list UI — urgency color coding, mark paid action, amount display' },
          { path: 'lib/jarvis/stores/personalStore.ts', explanation: 'Bills state — populated from BriefingData, provides bill items with due dates and amounts' },
        ],
        prerequisites: ['navigation-basics'],
        conceptsIntroduced: ['bill-urgency-colors', 'mark-paid', 'recurring-bills', 'financial-awareness'],
        spotlightTargets: ['personal-subprogram-bills'],
        verificationSteps: [
          { type: 'route', check: '/jarvis/app/personal' },
        ],
      },
      {
        id: 'calendar-basics',
        name: 'Calendar — View Events & Understand Your Schedule',
        category: 'Your First Day',
        difficulty: 1,
        description: 'How to view your calendar events, understand the timeline view, and see what is coming up today and this week.',
        teachingNotes: 'CalendarView.tsx shows events from Google Calendar via the Notion integration. Events display with time, title, and optional location. The view is timeline-based — events are ordered chronologically with visual time blocks. The user should understand that calendar data is read-only in Jarvis (no write-back to Google Calendar). The morning briefing includes today\'s events as part of the daily summary. Teach the user to use the calendar as a reference alongside tasks — "what meetings do I have today, and what tasks need to fit around them?" The formatTime function handles both 24h and pre-formatted time strings (fixed in L4 audit).',
        keyFiles: [
          { path: 'components/jarvis/personal/CalendarView.tsx', explanation: 'Calendar UI — timeline view, event cards with time/title/location, time formatting' },
          { path: 'lib/jarvis/stores/personalStore.ts', explanation: 'Calendar state — populated from BriefingData, provides event items with times' },
        ],
        prerequisites: ['navigation-basics'],
        conceptsIntroduced: ['calendar-timeline', 'event-display', 'schedule-awareness'],
        spotlightTargets: ['personal-subprogram-calendar'],
        verificationSteps: [
          { type: 'route', check: '/jarvis/app/personal' },
        ],
      },
      {
        id: 'meals-basics',
        name: 'Meals — Planning, Groceries & Kitchen Intelligence',
        category: 'Your First Day',
        difficulty: 2,
        description: 'How to view your meal plan, check grocery lists, and use kitchen intelligence features for recipe suggestions and pantry management.',
        teachingNotes: 'Meals is the newest Personal sub-program (v4.2). MealsView.tsx shows the weekly meal plan from Notion, with each day\'s meals listed. The grocery list aggregates ingredients across the week\'s meals. Kitchen intelligence uses the chat brain — you can ask Jarvis "what should I cook tonight?" and it considers what\'s in your pantry, your meal plan, and your preferences. The user should understand that meal data comes from Notion databases and the grocery list is auto-generated from planned meals. Teach the user to check meals at the start of the week for planning, and use the chat for spontaneous meal ideas. The meal planning pipeline was built in v4.2 with full Notion integration.',
        keyFiles: [
          { path: 'components/jarvis/personal/MealsView.tsx', explanation: 'Meals UI — weekly plan display, grocery list, meal cards with recipe info' },
          { path: 'lib/jarvis/stores/personalStore.ts', explanation: 'Meals state — populated from BriefingData, provides meal plan and grocery items' },
        ],
        prerequisites: ['navigation-basics'],
        conceptsIntroduced: ['meal-planning', 'grocery-lists', 'kitchen-intelligence', 'weekly-plan'],
        spotlightTargets: ['personal-subprogram-meals'],
        verificationSteps: [
          { type: 'route', check: '/jarvis/app/personal' },
        ],
      },
      {
        id: 'morning-briefing',
        name: 'Morning Briefing — "Brief Me"',
        category: 'Your First Day',
        difficulty: 1,
        description: 'How to ask Jarvis for your daily executive summary — tasks, habits, bills, calendar, and meals in one concise briefing.',
        teachingNotes: 'The morning briefing is Jarvis\'s signature feature. Open the chat (bottom tab or Cmd+K → "chat") and type "brief me" or "good morning." The brain\'s briefing tool aggregates data from all Personal sub-programs into a concise executive summary: overdue tasks, today\'s tasks, habit streaks, bills due, calendar events, and meal plan. The briefing is generated by the /api/jarvis/briefing endpoint which fetches from Notion, then the brain formats it conversationally. The user should make this their daily ritual — open Jarvis, say "brief me," scan the summary, then dive into specific areas that need attention. The briefing respects timezone (client → system prompt) so "today" is always correct. This is the entry point to a productive day with Jarvis.',
        keyFiles: [
          { path: 'app/api/jarvis/briefing/route.ts', explanation: 'Briefing API endpoint — fetches from Notion APIs, aggregates tasks/habits/bills/calendar/meals into structured BriefingData' },
          { path: 'components/jarvis/layout/ChatOverlay.tsx', explanation: 'Chat UI — bottom sheet (mobile) or side panel (desktop), message input, streaming responses' },
        ],
        prerequisites: ['tasks-basics'],
        conceptsIntroduced: ['morning-briefing', 'executive-summary', 'chat-brain', 'daily-ritual'],
        spotlightTargets: ['bottom-tab-chat', 'chat-input'],
        verificationSteps: [
          { type: 'route', check: '/jarvis/app' },
          { type: 'action', check: 'User opens chat and sends "brief me"' },
        ],
      },
    ],
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
