# Jarvis Changelog

## 2026-02-06
- Expanded the Jarvis tutorial framework with a Notion Template Mastery addendum, including setup checklist, practice map, 7-day ramp plan, daily loop, and mastery signals.
- Fixed meal plan creation to use the database ID, link the Recipes relation, and store meal type in Time of Day.
- Expanded recipe search to cover title, tags, and ingredient relations, with ingredient lookups from the Ingredients database.
- Added ingredient list capture and optional shopping list writes when adding meals (requires NOTION_SHOPPING_LIST_DATABASE_ID).
- Weekly recurring task start dates now align to the specified day_of_week on or after the start date.
- Briefing bill summaries now filter by paid flag and due date window client-side.
- Documented new Notion env vars for recipes, meal plan database IDs, ingredients, and shopping list.
- Added Telegram bot upgrades: streaming-style status edits, inline quick actions, task action buttons, and voice note STT with confirmation and retry handling.
