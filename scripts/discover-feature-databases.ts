#!/usr/bin/env npx tsx
/**
 * Discover properties for Feature Pack databases
 * Uses the same approach as discover-notion-databases.ts
 */

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Search terms for feature databases
const FEATURE_DATABASES = {
  recipes: ['Recipes', 'Recipe'],
  meal_plan: ['Weekly Meal Plan', 'Meal Days'],
  subscriptions: ['Subscriptions', 'Subscription'],
  ingredients: ['Ingredients', 'Ingredient'],
};

async function searchDatabase(searchTerms: string[]): Promise<{ id: string; title: string } | null> {
  for (const term of searchTerms) {
    console.log(`  Searching for "${term}"...`);

    try {
      const response = await notion.search({
        query: term,
        filter: { value: 'data_source', property: 'object' },
      });

      if (response.results && response.results.length > 0) {
        // Find exact match preferred
        const exactMatch = response.results.find((db) => {
          if (db.object !== 'data_source') return false;
          const dbTitle = (db as any).title?.[0]?.plain_text?.toLowerCase();
          return dbTitle === term.toLowerCase();
        });

        const db = exactMatch || response.results[0];
        if (db.object !== 'data_source') continue;

        const dbTyped = db as any;
        const title = dbTyped.title?.[0]?.plain_text || 'Untitled';
        const id = dbTyped.id;

        return { id, title };
      }
    } catch (err) {
      console.log(`    Error: ${(err as Error).message}`);
    }
  }

  return null;
}

async function queryAndShowProperties(dataSourceId: string): Promise<void> {
  try {
    // Query the data source to get a sample page with properties
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 1,
    });

    if (response.results.length > 0) {
      const page = response.results[0] as any;
      console.log(`  Sample page properties:`);

      if (page.properties) {
        const props = Object.entries(page.properties).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [propName, propValue] of props) {
          const prop = propValue as any;
          console.log(`    "${propName}": ${prop.type}`);
        }
      }
    } else {
      console.log(`  (no pages in database to inspect)`);
    }
  } catch (err) {
    console.log(`  Query error: ${(err as Error).message}`);
  }
}

async function main() {
  console.log('Discovering Feature Pack Databases...');
  console.log('=====================================\n');

  const results: Record<string, { id: string; title: string } | null> = {};

  for (const [dbType, searchTerms] of Object.entries(FEATURE_DATABASES)) {
    console.log(`\n[${dbType.toUpperCase()}]`);
    const db = await searchDatabase(searchTerms);

    if (db) {
      results[dbType] = db;
      console.log(`  FOUND: "${db.title}" (${db.id})`);
      await queryAndShowProperties(db.id);
    } else {
      results[dbType] = null;
      console.log(`  NOT FOUND`);
    }
  }

  // Print summary
  console.log('\n\n========================================');
  console.log('SUMMARY - Add to .env.local');
  console.log('========================================\n');

  for (const [dbType, db] of Object.entries(results)) {
    const envVar = `NOTION_${dbType.toUpperCase()}_DATA_SOURCE_ID`;
    if (db) {
      console.log(`${envVar}=${db.id}`);
    } else {
      console.log(`# ${envVar}=  # Not found`);
    }
  }

  console.log('\n\nDone!');
}

main().catch(console.error);
