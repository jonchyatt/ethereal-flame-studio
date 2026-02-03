/**
 * Notion Direct SDK Client
 *
 * Direct @notionhq/client integration for Vercel serverless deployment.
 * Replaces MCP implementation to avoid child_process spawning.
 *
 * This module provides:
 * - queryDatabase(databaseId, filter?): Query a Notion database (via dataSources API)
 * - createPage(databaseId, properties): Create a new page in a database
 * - updatePage(pageId, properties): Update an existing page
 * - retrievePage(pageId): Get a page by ID
 * - searchNotion(query): Search across all accessible Notion content
 */

import { Client } from '@notionhq/client';
import type {
  QueryDataSourceParameters,
  QueryDataSourceResponse,
  CreatePageParameters,
  UpdatePageParameters,
  SearchParameters,
  SearchResponse,
} from '@notionhq/client/build/src/api-endpoints';

// Singleton Notion client instance
let notionClient: Client | null = null;

/**
 * Get or create the Notion client singleton
 */
function getNotionClient(): Client {
  if (notionClient) {
    return notionClient;
  }

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    throw new Error('NOTION_TOKEN environment variable is required');
  }

  notionClient = new Client({
    auth: notionToken,
  });

  console.log('[Notion] Client initialized');
  return notionClient;
}

// Type for filter from QueryDataSourceParameters
type DataSourceFilter = QueryDataSourceParameters['filter'];
type DataSourceSorts = QueryDataSourceParameters['sorts'];

/**
 * Query a Notion database (using dataSources API)
 *
 * @param dataSourceId - The data source (database) ID to query
 * @param options - Optional filter, sorts, page_size, start_cursor
 * @returns Query results with pages
 */
export async function queryDatabase(
  dataSourceId: string,
  options?: {
    filter?: DataSourceFilter;
    sorts?: DataSourceSorts;
    page_size?: number;
    start_cursor?: string;
  }
): Promise<QueryDataSourceResponse> {
  const client = getNotionClient();

  console.log('[Notion] Querying data source:', dataSourceId);

  const response = await client.dataSources.query({
    data_source_id: dataSourceId,
    filter: options?.filter,
    sorts: options?.sorts,
    page_size: options?.page_size,
    start_cursor: options?.start_cursor,
  });

  console.log(`[Notion] Query returned ${response.results.length} results`);

  return response;
}

// Type for properties from CreatePageParameters
type PageProperties = CreatePageParameters['properties'];

/**
 * Create a new page in a Notion database
 *
 * @param databaseId - The parent database ID
 * @param properties - The page properties
 * @returns The created page
 */
export async function createPage(
  databaseId: string,
  properties: PageProperties
): Promise<unknown> {
  const client = getNotionClient();

  console.log('[Notion] Creating page in database:', databaseId);

  const response = await client.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  console.log('[Notion] Page created:', response.id);

  return response;
}

// Type for properties from UpdatePageParameters
type UpdateProperties = UpdatePageParameters['properties'];

/**
 * Update an existing Notion page
 *
 * @param pageId - The page ID to update
 * @param properties - The properties to update
 * @returns The updated page
 */
export async function updatePage(
  pageId: string,
  properties: UpdateProperties
): Promise<unknown> {
  const client = getNotionClient();

  console.log('[Notion] Updating page:', pageId);

  const response = await client.pages.update({
    page_id: pageId,
    properties,
  });

  console.log('[Notion] Page updated:', response.id);

  return response;
}

/**
 * Retrieve a Notion page by ID
 *
 * @param pageId - The page ID to retrieve
 * @returns The page object
 */
export async function retrievePage(pageId: string): Promise<unknown> {
  const client = getNotionClient();

  console.log('[Notion] Retrieving page:', pageId);

  const response = await client.pages.retrieve({
    page_id: pageId,
  });

  return response;
}

// Types for search parameters
type SearchFilter = SearchParameters['filter'];
type SearchSort = SearchParameters['sort'];

/**
 * Search across all accessible Notion content
 *
 * @param query - The search query string
 * @param options - Optional filter (page or database), sort, page_size
 * @returns Search results
 */
export async function searchNotion(
  query: string,
  options?: {
    filter?: SearchFilter;
    sort?: SearchSort;
    page_size?: number;
    start_cursor?: string;
  }
): Promise<SearchResponse> {
  const client = getNotionClient();

  console.log('[Notion] Searching:', query);

  const response = await client.search({
    query,
    filter: options?.filter,
    sort: options?.sort,
    page_size: options?.page_size,
    start_cursor: options?.start_cursor,
  });

  console.log(`[Notion] Search returned ${response.results.length} results`);

  return response;
}

/**
 * Check if the Notion client is initialized
 * (Always returns true if NOTION_TOKEN is set, since client is lazy-initialized)
 */
export function isNotionConfigured(): boolean {
  return !!process.env.NOTION_TOKEN;
}
