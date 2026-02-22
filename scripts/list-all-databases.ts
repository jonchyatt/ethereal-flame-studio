import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function listAllDatabases() {
  console.log("Listing all accessible databases...\n");
  
  let hasMore = true;
  let startCursor: string | undefined;
  let accessible = 0;
  let inaccessible = 0;
  
  while (hasMore) {
    const response = await notion.search({
      filter: { property: 'object', value: 'data_source' },
      start_cursor: startCursor,
      page_size: 100,
    });
    
    for (const result of response.results) {
      const db = result as any;
      const title = db.title?.[0]?.plain_text || 'Untitled';
      const id = db.id;
      
      // Try to retrieve to verify access
      try {
        await notion.databases.retrieve({ database_id: id });
        console.log(`✓ ${title}`);
        console.log(`  ID: ${id}\n`);
        accessible++;
      } catch (e) {
        console.log(`✗ ${title} (not shared)`);
        console.log(`  ID: ${id}\n`);
        inaccessible++;
      }
    }
    
    hasMore = response.has_more;
    startCursor = response.next_cursor || undefined;
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Accessible: ${accessible}`);
  console.log(`Not shared: ${inaccessible}`);
}

listAllDatabases().catch(console.error);
