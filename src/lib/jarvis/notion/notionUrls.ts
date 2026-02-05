/**
 * Notion URL Mapping for all Life OS databases and dashboard pages.
 *
 * Maps every discovered database (38 primary) and dashboard page (21)
 * to their Notion URLs for use in the NotionPanel deep-link overlay.
 *
 * Organized into 6 functional clusters matching the Life OS template.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClusterName =
  | 'daily_action'
  | 'financial'
  | 'knowledge'
  | 'tracking'
  | 'planning'
  | 'business';

export interface NotionDatabaseEntry {
  /** Human-readable label */
  label: string;
  /** data_source_id (for queries) */
  dataSourceId: string;
  /** database_id (for creates) — only known for some databases */
  databaseId?: string;
  /** Direct Notion URL */
  notionUrl: string;
  /** Functional cluster */
  cluster: ClusterName;
}

export interface NotionPageEntry {
  label: string;
  pageId: string;
  notionUrl: string;
}

export interface CurriculumCluster {
  id: ClusterName;
  label: string;
  icon: string;
  databases: string[]; // keys into NOTION_URLS
  order: number;
}

// ─── Helper: build notion.so URL from an ID ─────────────────────────────────

/** Build a direct Notion URL from any page or database ID. */
export function getNotionPageUrl(id: string): string {
  return `https://notion.so/${id.replace(/-/g, '')}`;
}

// Internal alias so all existing call sites still work
const notionUrl = getNotionPageUrl;

// ─── Database URL Map ────────────────────────────────────────────────────────

export const NOTION_URLS: Record<string, NotionDatabaseEntry> = {
  // ── Cluster 1: Daily Action ──────────────────────────────────────────────
  tasks: {
    label: 'Tasks',
    dataSourceId: '81802093-f0b3-82f0-908a-076bdd2c9a71',
    databaseId: '26d02093-f0b3-8223-a854-015e521cbd7d',
    notionUrl: notionUrl('26d02093-f0b3-8223-a854-015e521cbd7d'),
    cluster: 'daily_action',
  },
  projects: {
    label: 'Projects',
    dataSourceId: '45602093-f0b3-83e7-8364-07221234b542',
    notionUrl: notionUrl('45602093-f0b3-83e7-8364-07221234b542'),
    cluster: 'daily_action',
  },
  habits: {
    label: 'Habits',
    dataSourceId: '23402093-f0b3-82ca-ac92-878c6561ea22',
    notionUrl: notionUrl('23402093-f0b3-82ca-ac92-878c6561ea22'),
    cluster: 'daily_action',
  },
  areas: {
    label: 'Areas',
    dataSourceId: '84902093-f0b3-8256-bac7-0782995e45c3',
    notionUrl: notionUrl('84902093-f0b3-8256-bac7-0782995e45c3'),
    cluster: 'daily_action',
  },
  daily_habits: {
    label: 'Daily Habits',
    dataSourceId: '80a02093-f0b3-83a9-8e22-075ade03b260',
    notionUrl: notionUrl('80a02093-f0b3-83a9-8e22-075ade03b260'),
    cluster: 'daily_action',
  },

  // ── Cluster 2: Financial ─────────────────────────────────────────────────
  budgets: {
    label: 'Budgets',
    dataSourceId: '0ab02093-f0b3-8219-99da-8722861f036b',
    notionUrl: notionUrl('0ab02093-f0b3-8219-99da-8722861f036b'),
    cluster: 'financial',
  },
  subscriptions: {
    label: 'Subscriptions',
    dataSourceId: '2e802093-f0b3-830e-b600-0711d4fa493f',
    notionUrl: notionUrl('2e802093-f0b3-830e-b600-0711d4fa493f'),
    cluster: 'financial',
  },
  income: {
    label: 'Income',
    dataSourceId: 'b7c02093-f0b3-83be-b564-0744bb7ba4ba',
    notionUrl: notionUrl('b7c02093-f0b3-83be-b564-0744bb7ba4ba'),
    cluster: 'financial',
  },
  expenditure: {
    label: 'Expenditure',
    dataSourceId: '0a502093-f0b3-8354-ba76-87841a6c232e',
    notionUrl: notionUrl('0a502093-f0b3-8354-ba76-87841a6c232e'),
    cluster: 'financial',
  },
  financial_years: {
    label: 'Financial Years',
    dataSourceId: '87c02093-f0b3-835d-8e7e-07cab3931e2c',
    notionUrl: notionUrl('87c02093-f0b3-835d-8e7e-07cab3931e2c'),
    cluster: 'financial',
  },
  invoice_items: {
    label: 'Invoice Items',
    dataSourceId: 'e8d02093-f0b3-8384-bb29-876cd5d8a87d',
    notionUrl: notionUrl('e8d02093-f0b3-8384-bb29-876cd5d8a87d'),
    cluster: 'financial',
  },

  // ── Cluster 3: Knowledge ─────────────────────────────────────────────────
  notes: {
    label: 'Notes & References',
    dataSourceId: 'b2302093-f0b3-8320-954f-8745787162d6',
    notionUrl: notionUrl('b2302093-f0b3-8320-954f-8745787162d6'),
    cluster: 'knowledge',
  },
  journal: {
    label: 'Journal',
    dataSourceId: '67d02093-f0b3-820d-b3a3-87741d069927',
    notionUrl: notionUrl('67d02093-f0b3-820d-b3a3-87741d069927'),
    cluster: 'knowledge',
  },
  crm: {
    label: 'CRM',
    dataSourceId: 'e7102093-f0b3-825b-9b86-8762cef1d754',
    notionUrl: notionUrl('e7102093-f0b3-825b-9b86-8762cef1d754'),
    cluster: 'knowledge',
  },
  topics: {
    label: 'Topics & Resources',
    dataSourceId: 'c7502093-f0b3-8341-a9a6-8708192581bf',
    notionUrl: notionUrl('c7502093-f0b3-8341-a9a6-8708192581bf'),
    cluster: 'knowledge',
  },
  notebooks: {
    label: 'Notebooks',
    dataSourceId: 'ef502093-f0b3-831e-95fc-87a677c6949d',
    notionUrl: notionUrl('ef502093-f0b3-831e-95fc-87a677c6949d'),
    cluster: 'knowledge',
  },
  wish_list: {
    label: 'Wish List',
    dataSourceId: '01302093-f0b3-83c4-a8c4-878122d5f8e0',
    notionUrl: notionUrl('01302093-f0b3-83c4-a8c4-878122d5f8e0'),
    cluster: 'knowledge',
  },

  // ── Cluster 4: Tracking ──────────────────────────────────────────────────
  workout_sessions: {
    label: 'Workout Sessions',
    dataSourceId: '5de02093-f0b3-8259-9143-8707569ceda8',
    notionUrl: notionUrl('5de02093-f0b3-8259-9143-8707569ceda8'),
    cluster: 'tracking',
  },
  weights_log: {
    label: 'Weights Log',
    dataSourceId: '62002093-f0b3-83a4-b2c7-876036bfc0a2',
    notionUrl: notionUrl('62002093-f0b3-83a4-b2c7-876036bfc0a2'),
    cluster: 'tracking',
  },
  cardio_log: {
    label: 'Cardio Log',
    dataSourceId: 'd2602093-f0b3-82ea-b3d8-878d482c846d',
    notionUrl: notionUrl('d2602093-f0b3-82ea-b3d8-878d482c846d'),
    cluster: 'tracking',
  },
  classes_sports: {
    label: 'Classes & Sports',
    dataSourceId: '65402093-f0b3-826e-baea-8745f1557d1c',
    notionUrl: notionUrl('65402093-f0b3-826e-baea-8745f1557d1c'),
    cluster: 'tracking',
  },
  fitness_records: {
    label: 'Fitness Records',
    dataSourceId: 'f7402093-f0b3-839e-8940-079eeb8177aa',
    notionUrl: notionUrl('f7402093-f0b3-839e-8940-079eeb8177aa'),
    cluster: 'tracking',
  },
  meal_plan: {
    label: 'Weekly Meal Plan',
    dataSourceId: '56102093-f0b3-83d5-a18c-07da9a50e696',
    notionUrl: notionUrl('56102093-f0b3-83d5-a18c-07da9a50e696'),
    cluster: 'tracking',
  },
  recipes: {
    label: 'Recipes',
    dataSourceId: '13902093-f0b3-8244-96cd-07f874f9f93d',
    notionUrl: notionUrl('13902093-f0b3-8244-96cd-07f874f9f93d'),
    cluster: 'tracking',
  },
  ingredients: {
    label: 'Ingredients',
    dataSourceId: '0f602093-f0b3-82c2-9343-87252d3c7d1c',
    notionUrl: notionUrl('0f602093-f0b3-82c2-9343-87252d3c7d1c'),
    cluster: 'tracking',
  },
  timesheets: {
    label: 'Timesheets',
    dataSourceId: '17202093-f0b3-826e-a349-07b1fc367393',
    notionUrl: notionUrl('17202093-f0b3-826e-a349-07b1fc367393'),
    cluster: 'tracking',
  },
  days: {
    label: 'Days',
    dataSourceId: '28302093-f0b3-82bd-a1e5-8797e34e412e',
    notionUrl: notionUrl('28302093-f0b3-82bd-a1e5-8797e34e412e'),
    cluster: 'tracking',
  },

  // ── Cluster 5: Planning ──────────────────────────────────────────────────
  goals: {
    label: 'Goals',
    dataSourceId: 'd7a02093-f0b3-839e-829b-87da54174572',
    notionUrl: notionUrl('d7a02093-f0b3-839e-829b-87da54174572'),
    cluster: 'planning',
  },
  years: {
    label: 'Years',
    dataSourceId: 'c5d02093-f0b3-8232-beb7-87b490758850',
    notionUrl: notionUrl('c5d02093-f0b3-8232-beb7-87b490758850'),
    cluster: 'planning',
  },
  wheel_of_life: {
    label: 'Wheel of Life',
    dataSourceId: 'fd702093-f0b3-837f-ba84-072d82325401',
    notionUrl: notionUrl('fd702093-f0b3-837f-ba84-072d82325401'),
    cluster: 'planning',
  },
  fear_setting: {
    label: 'Fear Setting',
    dataSourceId: '8dc02093-f0b3-83b4-984f-07457a8ac5d4',
    notionUrl: notionUrl('8dc02093-f0b3-83b4-984f-07457a8ac5d4'),
    cluster: 'planning',
  },
  dream_setting: {
    label: 'Dream Setting',
    dataSourceId: '24e02093-f0b3-838c-8587-07b80c9ff779',
    notionUrl: notionUrl('24e02093-f0b3-838c-8587-07b80c9ff779'),
    cluster: 'planning',
  },
  significant_events: {
    label: 'Significant Events',
    dataSourceId: 'eea02093-f0b3-83ad-9fa3-8702c305f22f',
    notionUrl: notionUrl('eea02093-f0b3-83ad-9fa3-8702c305f22f'),
    cluster: 'planning',
  },

  // ── Cluster 6: Business ──────────────────────────────────────────────────
  content: {
    label: 'Content',
    dataSourceId: 'c7102093-f0b3-8266-83c9-078526ce3d3b',
    notionUrl: notionUrl('c7102093-f0b3-8266-83c9-078526ce3d3b'),
    cluster: 'business',
  },
  channels: {
    label: 'Channels',
    dataSourceId: '28b02093-f0b3-8368-a098-0735372ca125',
    notionUrl: notionUrl('28b02093-f0b3-8368-a098-0735372ca125'),
    cluster: 'business',
  },
  tweets: {
    label: 'Tweets',
    dataSourceId: 'c2902093-f0b3-8398-a6ea-879a93385a6e',
    notionUrl: notionUrl('c2902093-f0b3-8398-a6ea-879a93385a6e'),
    cluster: 'business',
  },
  client_portal: {
    label: 'Client Portal',
    dataSourceId: '6d502093-f0b3-8330-a254-0752028b5221',
    notionUrl: notionUrl('6d502093-f0b3-8330-a254-0752028b5221'),
    cluster: 'business',
  },
};

// ─── Dashboard Page URLs ─────────────────────────────────────────────────────

export const NOTION_PAGE_URLS: Record<string, NotionPageEntry> = {
  calendars: {
    label: 'My Calendars',
    pageId: '43c02093-f0b3-8323-88a2-81de91017f95',
    notionUrl: notionUrl('43c02093-f0b3-8323-88a2-81de91017f95'),
  },
  goal_setting: {
    label: 'Goal Setting & Yearly Planner',
    pageId: '11902093-f0b3-8278-b669-01d547659a91',
    notionUrl: notionUrl('11902093-f0b3-8278-b669-01d547659a91'),
  },
  year_summaries: {
    label: 'Year Summaries',
    pageId: 'b4c02093-f0b3-8219-a882-01f0dfd2fe0e',
    notionUrl: notionUrl('b4c02093-f0b3-8219-a882-01f0dfd2fe0e'),
  },
  para_dashboard: {
    label: 'P.A.R.A Dashboard',
    pageId: 'e5202093-f0b3-8241-bdcd-81e941a3300a',
    notionUrl: notionUrl('e5202093-f0b3-8241-bdcd-81e941a3300a'),
  },
  tasks_action: {
    label: 'Tasks & Action View',
    pageId: '06e02093-f0b3-83c3-ba22-0160dc7e87b5',
    notionUrl: notionUrl('06e02093-f0b3-83c3-ba22-0160dc7e87b5'),
  },
  life_areas: {
    label: 'Life Areas',
    pageId: '10e02093-f0b3-8332-9a7c-0101c5b55a70',
    notionUrl: notionUrl('10e02093-f0b3-8332-9a7c-0101c5b55a70'),
  },
  projects_page: {
    label: 'Projects',
    pageId: 'b6202093-f0b3-8247-9b29-816658134677',
    notionUrl: notionUrl('b6202093-f0b3-8247-9b29-816658134677'),
  },
  portfolio: {
    label: 'My Website Portfolio',
    pageId: '25002093-f0b3-8382-9765-81df1fe32f93',
    notionUrl: notionUrl('25002093-f0b3-8382-9765-81df1fe32f93'),
  },
  client_content_os: {
    label: 'Client & Content OS',
    pageId: '0de02093-f0b3-82f7-a59b-81a9c75f2b60',
    notionUrl: notionUrl('0de02093-f0b3-82f7-a59b-81a9c75f2b60'),
  },
  knowledge_base: {
    label: 'Knowledge Base',
    pageId: '36c02093-f0b3-829c-8866-017811ccd6bc',
    notionUrl: notionUrl('36c02093-f0b3-829c-8866-017811ccd6bc'),
  },
  journal_page: {
    label: 'Journal',
    pageId: '27702093-f0b3-8387-8514-818754defb06',
    notionUrl: notionUrl('27702093-f0b3-8387-8514-818754defb06'),
  },
  topics_resources: {
    label: 'Topics & Resources',
    pageId: '5e702093-f0b3-8251-8b06-81866761bf4d',
    notionUrl: notionUrl('5e702093-f0b3-8251-8b06-81866761bf4d'),
  },
  notebooks_page: {
    label: 'Notebooks',
    pageId: '54102093-f0b3-83cf-8e04-81b58718b6a2',
    notionUrl: notionUrl('54102093-f0b3-83cf-8e04-81b58718b6a2'),
  },
  wish_list_page: {
    label: 'Wish List',
    pageId: 'e6902093-f0b3-83db-a0c5-81ebf29e999f',
    notionUrl: notionUrl('e6902093-f0b3-83db-a0c5-81ebf29e999f'),
  },
  crm_page: {
    label: 'CRM',
    pageId: 'c7002093-f0b3-8219-a50a-01a983579e38',
    notionUrl: notionUrl('c7002093-f0b3-8219-a50a-01a983579e38'),
  },
  budgets_subs: {
    label: 'Budgets & Subscriptions',
    pageId: 'ab202093-f0b3-828b-8c91-8124057691e4',
    notionUrl: notionUrl('ab202093-f0b3-828b-8c91-8124057691e4'),
  },
  habit_tracker: {
    label: 'Habit Tracker',
    pageId: '3cf02093-f0b3-827f-8a94-81f2df387675',
    notionUrl: notionUrl('3cf02093-f0b3-827f-8a94-81f2df387675'),
  },
  workout_tracker: {
    label: 'Workout Tracker',
    pageId: '4ee02093-f0b3-83c8-b409-01e2185f3b75',
    notionUrl: notionUrl('4ee02093-f0b3-83c8-b409-01e2185f3b75'),
  },
  meal_planner: {
    label: 'Meal Planner',
    pageId: '6de02093-f0b3-8346-85b3-81405306bd89',
    notionUrl: notionUrl('6de02093-f0b3-8346-85b3-81405306bd89'),
  },
  perspectives: {
    label: 'Perspectives',
    pageId: '25d02093-f0b3-83c2-9fb8-81e06ca04f47',
    notionUrl: notionUrl('25d02093-f0b3-83c2-9fb8-81e06ca04f47'),
  },
  timesheets_page: {
    label: 'My Timesheets',
    pageId: '76602093-f0b3-8284-a563-8118944fc46b',
    notionUrl: notionUrl('76602093-f0b3-8284-a563-8118944fc46b'),
  },
};

// ─── Curriculum Clusters ─────────────────────────────────────────────────────

export const CURRICULUM_CLUSTERS: CurriculumCluster[] = [
  {
    id: 'daily_action',
    label: 'Daily Action',
    icon: '⚡',
    order: 1,
    databases: ['tasks', 'projects', 'habits', 'areas', 'daily_habits'],
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: '💰',
    order: 2,
    databases: ['budgets', 'subscriptions', 'income', 'expenditure', 'financial_years', 'invoice_items'],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: '📚',
    order: 3,
    databases: ['notes', 'journal', 'crm', 'topics', 'notebooks', 'wish_list'],
  },
  {
    id: 'tracking',
    label: 'Tracking',
    icon: '📊',
    order: 4,
    databases: ['workout_sessions', 'weights_log', 'cardio_log', 'classes_sports', 'fitness_records', 'meal_plan', 'recipes', 'ingredients', 'timesheets', 'days'],
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: '🎯',
    order: 5,
    databases: ['goals', 'years', 'wheel_of_life', 'fear_setting', 'dream_setting', 'significant_events'],
  },
  {
    id: 'business',
    label: 'Business',
    icon: '💼',
    order: 6,
    databases: ['content', 'channels', 'tweets', 'client_portal'],
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get the Notion URL for a database by key name.
 * Returns empty string if not found.
 */
export function getNotionUrl(databaseName: string): string {
  // Try exact match first
  const entry = NOTION_URLS[databaseName];
  if (entry) return entry.notionUrl;

  // Try case-insensitive match on label
  const lower = databaseName.toLowerCase();
  for (const [, db] of Object.entries(NOTION_URLS)) {
    if (db.label.toLowerCase() === lower) return db.notionUrl;
  }

  // Try partial match on label
  for (const [, db] of Object.entries(NOTION_URLS)) {
    if (db.label.toLowerCase().includes(lower)) return db.notionUrl;
  }

  return '';
}

/**
 * Find a database entry by key or label.
 * Returns undefined if not found.
 */
export function findNotionDatabase(name: string): NotionDatabaseEntry | undefined {
  // Exact key match
  if (NOTION_URLS[name]) return NOTION_URLS[name];

  // Case-insensitive label match
  const lower = name.toLowerCase();
  for (const [, db] of Object.entries(NOTION_URLS)) {
    if (db.label.toLowerCase() === lower) return db;
  }

  // Partial label match
  for (const [, db] of Object.entries(NOTION_URLS)) {
    if (db.label.toLowerCase().includes(lower)) return db;
  }

  return undefined;
}
