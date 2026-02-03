#!/usr/bin/env npx tsx
/**
 * Notion Database Discovery Script
 *
 * One-time utility to discover ALL Life OS Bundle database IDs.
 * Searches for: Tasks, Bills, Projects, Goals, Habits
 *
 * Usage: npm run discover-notion
 *
 * Output:
 * - Database IDs for .env.local
 * - Property schema mappings for schemas.ts
 * - Instructions for sharing databases with integration
 *
 * Uses Direct Notion SDK (not MCP) for Vercel serverless compatibility.
 */

import { searchNotion, isNotionConfigured } from '../src/lib/jarvis/notion/NotionClient';
import { Client } from '@notionhq/client';

// Database search terms (common names in Life OS templates)
const LIFE_OS_DATABASES = {
  tasks: ['Tasks', 'To-Do', 'To Do', 'Action Items', 'Task List'],
  bills: ['Bills', 'Finances', 'Budget', 'Payments', 'Expenses'],
  projects: ['Projects', 'Project List', 'Active Projects'],
  goals: ['Goals', 'Objectives', 'Targets', 'OKRs'],
  habits: ['Habits', 'Routines', 'Trackers', 'Daily Habits'],
};

interface DatabaseInfo {
  id: string;
  title: string;
  properties: Record<string, { type: string; name: string }>;
}

interface DiscoveryResult {
  found: Record<string, DatabaseInfo | null>;
  notFound: string[];
}

// Singleton Notion client for discovery
let notionClient: Client | null = null;

function getNotionClient(): Client {
  if (notionClient) return notionClient;

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    throw new Error('NOTION_TOKEN environment variable is required');
  }

  notionClient = new Client({ auth: notionToken });
  return notionClient;
}

/**
 * Search for a database by name using Direct Notion SDK
 */
async function searchDatabase(
  searchTerms: string[]
): Promise<DatabaseInfo | null> {
  const client = getNotionClient();

  for (const term of searchTerms) {
    console.log(`  Searching for "${term}"...`);

    try {
      // Use Notion SDK search with data_source filter
      // Note: Notion API uses 'data_source' not 'data_source' for newer API versions
      const response = await client.search({
        query: term,
        filter: { value: 'data_source', property: 'object' },
      });

      if (response.results && response.results.length > 0) {
        // Find the best match (exact title match preferred)
        const exactMatch = response.results.find((db) => {
          if (db.object !== 'data_source') return false;
          const dbTitle = (db as { title?: Array<{ plain_text?: string }> }).title?.[0]?.plain_text?.toLowerCase();
          return dbTitle === term.toLowerCase();
        });

        const db = exactMatch || response.results[0];
        if (db.object !== 'data_source') continue;

        const dbTyped = db as { id: string; title?: Array<{ plain_text?: string }>; properties?: Record<string, { type: string }> };
        const title = dbTyped.title?.[0]?.plain_text || 'Untitled';

        // Get detailed database info including properties
        const dbInfo = await getDetailedDatabaseInfo(dbTyped.id);
        if (dbInfo) {
          return { ...dbInfo, title };
        }

        return {
          id: dbTyped.id,
          title,
          properties: {},
        };
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Only log non-"not found" errors
      if (!errMsg.includes('not found') && !errMsg.includes('No results')) {
        console.error(`    Error searching for "${term}":`, errMsg);
      }
    }
  }

  return null;
}

/**
 * Get detailed database information including properties using Direct SDK
 */
async function getDetailedDatabaseInfo(
  databaseId: string
): Promise<DatabaseInfo | null> {
  const client = getNotionClient();

  try {
    const data = await client.databases.retrieve({
      database_id: databaseId,
    });

    const dataTyped = data as {
      id: string;
      title?: Array<{ plain_text?: string }>;
      properties?: Record<string, { type: string }>;
    };

    const title = dataTyped.title?.[0]?.plain_text || 'Untitled';

    // Extract property names and types
    const properties: Record<string, { type: string; name: string }> = {};
    if (dataTyped.properties) {
      for (const [name, prop] of Object.entries(dataTyped.properties)) {
        properties[name] = {
          name,
          type: prop.type || 'unknown',
        };
      }
    }

    return {
      id: dataTyped.id,
      title,
      properties,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`  Error retrieving database ${databaseId}:`, errMsg);
    return null;
  }
}

/**
 * Main discovery function
 */
async function discoverDatabases(): Promise<DiscoveryResult> {
  console.log('\n========================================');
  console.log('   Notion Life OS Database Discovery');
  console.log('========================================\n');

  const result: DiscoveryResult = {
    found: {},
    notFound: [],
  };

  // Check Notion configuration
  console.log('Connecting to Notion via Direct SDK...\n');
  try {
    if (!isNotionConfigured()) {
      throw new Error('NOTION_TOKEN not configured');
    }
    // Test connection with a simple search
    await searchNotion('test');
    console.log('Connected!\n');
  } catch (err) {
    console.error('Failed to connect to Notion:', err);
    console.log('\nTroubleshooting:');
    console.log('1. Verify NOTION_TOKEN is set in .env.local');
    console.log('2. Ensure the Notion integration has access to your workspace');
    console.log(
      '3. Share your databases with the integration in Notion:\n' +
        '   Database > ... > Connections > Add connection > [Your Integration]\n'
    );
    process.exit(1);
  }

  // Search for each database type
  for (const [dbType, searchTerms] of Object.entries(LIFE_OS_DATABASES)) {
    console.log(`\n[${dbType.toUpperCase()}] Searching...`);
    const db = await searchDatabase(searchTerms);

    if (db) {
      result.found[dbType] = db;
      console.log(`  FOUND: "${db.title}" (${db.id})`);

      // Show properties
      const propNames = Object.keys(db.properties);
      if (propNames.length > 0) {
        console.log(`  Properties (${propNames.length}):`);
        for (const [name, info] of Object.entries(db.properties)) {
          console.log(`    - ${name} (${info.type})`);
        }
      }
    } else {
      result.notFound.push(dbType);
      console.log(`  NOT FOUND`);
      console.log(`  Searched for: ${searchTerms.join(', ')}`);
    }
  }

  return result;
}

/**
 * Generate environment variable output
 */
function generateEnvOutput(result: DiscoveryResult): void {
  console.log('\n========================================');
  console.log('   Environment Variables for .env.local');
  console.log('========================================\n');
  console.log('# Life OS Bundle Database IDs');
  console.log('# Add these to your .env.local file:\n');

  const dbTypeMap: Record<string, string> = {
    tasks: 'NOTION_TASKS_DATA_SOURCE_ID',
    bills: 'NOTION_BILLS_DATA_SOURCE_ID',
    projects: 'NOTION_PROJECTS_DATA_SOURCE_ID',
    goals: 'NOTION_GOALS_DATA_SOURCE_ID',
    habits: 'NOTION_HABITS_DATA_SOURCE_ID',
  };

  for (const [dbType, envVar] of Object.entries(dbTypeMap)) {
    const db = result.found[dbType];
    if (db) {
      console.log(`${envVar}=${db.id}`);
    } else {
      console.log(`# ${envVar}=  # Not found - search manually`);
    }
  }

  // v2 extension point
  console.log('\n# v2: Client & Content OS (uncomment when ready)');
  console.log('# NOTION_CLIENTS_DATA_SOURCE_ID=');
  console.log('# NOTION_CONTENT_DATA_SOURCE_ID=');
}

/**
 * Generate schema property mapping hints
 */
function generateSchemaMappings(result: DiscoveryResult): void {
  console.log('\n========================================');
  console.log('   Property Mappings for schemas.ts');
  console.log('========================================\n');
  console.log('// Update property names in src/lib/jarvis/notion/schemas.ts');
  console.log('// Property names are CASE-SENSITIVE!\n');

  const propMappings: Record<string, Record<string, string>> = {
    tasks: {
      title: 'Task',
      status: 'Status',
      dueDate: 'Due Date',
      project: 'Project',
      priority: 'Priority',
    },
    bills: {
      title: 'Bill',
      amount: 'Amount',
      dueDate: 'Due Date',
      paid: 'Paid',
      category: 'Category',
    },
    projects: {
      title: 'Project',
      status: 'Status',
      area: 'Area',
      timeline: 'Timeline',
      priority: 'Priority',
    },
    goals: {
      title: 'Goal',
      status: 'Status',
      targetDate: 'Target Date',
      progress: 'Progress',
      area: 'Area',
    },
    habits: {
      title: 'Habit',
      frequency: 'Frequency',
      streak: 'Streak',
      lastCompleted: 'Last Completed',
      area: 'Area',
    },
  };

  for (const [dbType, expectedProps] of Object.entries(propMappings)) {
    const db = result.found[dbType];
    console.log(`// ${dbType.toUpperCase()}_PROPS:`);

    if (db && Object.keys(db.properties).length > 0) {
      for (const [key, defaultName] of Object.entries(expectedProps)) {
        // Try to find matching property
        const actualProp = Object.keys(db.properties).find(
          (p) => p.toLowerCase() === defaultName.toLowerCase()
        );
        if (actualProp) {
          console.log(`//   ${key}: '${actualProp}'  // matches`);
        } else {
          console.log(
            `//   ${key}: '${defaultName}'  // NOT FOUND - update manually`
          );
        }
      }
    } else {
      console.log(`//   Database not found - using defaults`);
      for (const [key, defaultName] of Object.entries(expectedProps)) {
        console.log(`//   ${key}: '${defaultName}'`);
      }
    }
    console.log('');
  }
}

/**
 * Generate summary report
 */
function generateSummary(result: DiscoveryResult): void {
  const foundCount = Object.values(result.found).filter(Boolean).length;
  const totalCount = Object.keys(LIFE_OS_DATABASES).length;

  console.log('\n========================================');
  console.log('   Summary');
  console.log('========================================\n');
  console.log(`Found: ${foundCount}/${totalCount} databases\n`);

  if (result.notFound.length > 0) {
    console.log('Missing databases:');
    for (const dbType of result.notFound) {
      console.log(`  - ${dbType}`);
    }
    console.log('\nTo fix missing databases:');
    console.log('1. Open Notion and find the database');
    console.log('2. Click "..." > "Connections" > "Add connection"');
    console.log('3. Select your integration');
    console.log('4. Run this script again');
  }

  console.log('\nNext steps:');
  console.log('1. Copy the environment variables to .env.local');
  console.log('2. Update property names in schemas.ts if needed');
  console.log('3. Run `npm run dev` and test Jarvis Notion queries');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const result = await discoverDatabases();

    generateEnvOutput(result);
    generateSchemaMappings(result);
    generateSummary(result);
  } catch (err) {
    console.error('\nDiscovery failed:', err);
    process.exit(1);
  }
}

// Run discovery
main();
