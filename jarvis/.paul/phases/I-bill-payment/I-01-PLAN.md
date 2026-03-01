---
phase: I-bill-payment
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/executive/types.ts
  - src/lib/jarvis/executive/BriefingBuilder.ts
  - src/lib/jarvis/stores/personalStore.ts
  - src/lib/jarvis/hooks/useJarvisFetch.ts
  - src/components/jarvis/personal/BillsList.tsx
  - src/lib/jarvis/intelligence/tools.ts
  - src/lib/jarvis/notion/schemas.ts
  - src/lib/jarvis/notion/toolExecutor.ts
  - src/lib/jarvis/intelligence/ClaudeClient.ts
autonomous: false
---

<objective>
## Goal
Complete bill management and payment pipeline — thread payment links from Notion to the UI, add "Pay Now" buttons, enable bill editing and payment navigation through chat.

## Purpose
Jonathan's Notion Subscriptions database has a `Service Link` property (URL to each bill's payment portal), but this data is dropped in the pipeline — it never reaches the UI or chat responses. There's also no way to edit existing bills (change amount, add a payment link, update due date) or navigate to a payment portal from chat. The result: Jarvis can show you a bill exists, but provides no path to actually paying it.

His wife will also use this system. It must be immediately obvious and polished — "Pay Now" button, one tap, payment portal opens. No hunting, no confusion.

## Output
- **`serviceLink` threaded end-to-end** — Notion `Service Link` property flows through BriefingBuilder → BillSummary type → personalStore → useJarvisFetch → BillsList UI
- **"Pay Now" button** on every bill that has a Service Link (opens portal in new tab, visually prominent cyan)
- **`update_bill` tool** — edit any bill property (amount, due date, frequency, category, service_link) via chat
- **`navigate_to_payment` tool** — "pay my Netflix" in chat opens the payment portal in a new tab
- **Payment links in chat** — `query_bills` and `formatBillResults()` output includes `[Pay here](url)` for bills with Service Links
- **`create_bill` enhanced** — can now accept `service_link` at creation time ("add Netflix $22.99/month, payment at https://...")

## Design Decisions
- **Chat-first bill management over UI form** — `update_bill` covers all edit needs without building form state/validation/API routes. UI form deferred.
- **`navigate_to_payment` follows `open_notion_panel` pattern** — returns JSON `{ action: 'open_payment', url, title }`, ClaudeClient handler calls `window.open()`. Proven pattern (toolExecutor.ts:630, ClaudeClient.ts:134).
- **Inline property extraction in navigate_to_payment** — `extractUrl`/`extractTitle` exist as private functions in schemas.ts and BriefingBuilder.ts. Adding 2-line inline casts in the executor avoids modifying export surfaces.
- **"Pay Now" as visually distinct primary action** — cyan background tint (`bg-cyan-500/10`) distinguishes it from the secondary ghost "Mark Paid" button. Wife should see it instantly.
- **Playwright automation rejected** — Playwright MCP runs locally not on Vercel. Payment portals require MFA/CAPTCHAs. Autopay handles automation; Jarvis monitors.
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Source Files (verified line numbers as of commit c8ca7ac)
@src/lib/jarvis/executive/types.ts — BillSummary interface at line 79-84
@src/lib/jarvis/executive/BriefingBuilder.ts — extractTitle/extractDate/extractNumber at lines 58-84; SUBSCRIPTION_PROPS imported at line 40; parseBillResults() at line 387; bills.map() at lines 398-411; filtered.map() at lines 425-430
@src/lib/jarvis/stores/personalStore.ts — PersonalBill interface at lines 23-30
@src/lib/jarvis/hooks/useJarvisFetch.ts — transformBills() at line 166; return object at lines 181-188
@src/components/jarvis/personal/BillsList.tsx — BillRow component at line 53; Mark Paid button at lines 94-104
@src/lib/jarvis/intelligence/tools.ts — notionTools array; mark_bill_paid at line 150; get_subscriptions at line 312; create_bill at line 100 (no service_link); getAllTools() at line 420
@src/lib/jarvis/notion/schemas.ts — SUBSCRIPTION_PROPS at line 157 (serviceLink: 'Service Link' at line 162); buildBillPaidUpdate() at line 875; buildBillProperties() at line 889 (no service_link); formatBillResults() at line 572; extractUrl() at line 1141
@src/lib/jarvis/notion/toolExecutor.ts — imports from schemas at lines 12-41 (NOTE: SUBSCRIPTION_PROPS NOT imported — must add); mark_bill_paid case at line 355; create_bill case at line 243; get_subscriptions case at line 571; open_notion_panel case at line 630; cacheQueryResults() local function at line 682; summarizeNotionContext() at line 116
@src/lib/jarvis/intelligence/ClaudeClient.ts — WRITE_TOOLS array at lines 14-24; open_notion_panel handler at line 134; close_notion_panel handler at lines 149-151; start_lesson handler at line 152
@src/lib/jarvis/notion/NotionClient.ts — updatePage() and retrievePage() already imported in toolExecutor.ts line 10
@src/lib/jarvis/notion/recentResults.ts — findBillByTitle() already imported in toolExecutor.ts line 45
</context>

<acceptance_criteria>

## AC-1: serviceLink Flows from Notion to UI
```gherkin
Given a bill in Notion has a Service Link URL set
When the BriefingBuilder fetches bills via parseBillResults()
Then BillSummary includes serviceLink field
And useJarvisFetch.transformBills() passes serviceLink to PersonalBill
And BillsList renders a "Pay Now" button for that bill

Given a bill in Notion has NO Service Link
When it renders in BillsList
Then only the "Mark Paid" button appears (full width, no layout shift)
```

## AC-2: "Pay Now" Button Opens Payment Portal
```gherkin
Given a bill with serviceLink is displayed in BillsList
When the user taps "Pay Now"
Then a new browser tab opens to the service link URL
And the original Jarvis tab remains open
And "Mark Paid" button remains available alongside "Pay Now"
And "Pay Now" is visually prominent (cyan tint, ExternalLink ↗ icon, distinct from ghost "Mark Paid")
```

## AC-3: update_bill Tool Modifies Bills
```gherkin
Given a bill "Netflix" exists in Notion Subscriptions database
When the user says "update my Netflix to $22.99 monthly"
Then Jarvis calls update_bill with bill_id="Netflix", amount=22.99, frequency="Monthly"
And the Notion page properties are updated via updatePage()
And the dashboard refreshes (WRITE_TOOLS triggers refetch)
And Jarvis confirms 'Updated "Netflix": amount to $22.99, frequency to Monthly.'

Given the user says "add payment link for Netflix to https://netflix.com/account"
When Jarvis calls update_bill with bill_id="Netflix", service_link="https://netflix.com/account"
Then the Notion Service Link property is updated
And subsequent queries and UI refreshes show the payment link
```

## AC-4: navigate_to_payment Opens Portal via Chat
```gherkin
Given the user says "pay my Netflix" in chat
When Jarvis calls navigate_to_payment with bill_name="Netflix"
Then toolExecutor looks up the subscription via findBillByTitle()
And retrieves the full page via retrievePage() to get Service Link
And returns JSON { action: "open_payment", url: "...", title: "Netflix" }
And ClaudeClient handler calls window.open() with the URL
And Jarvis says something like "Opening Netflix payment portal for you."

Given the subscription has no Service Link
When navigate_to_payment is called
Then it returns: 'Found "Netflix" but it doesn't have a payment link saved. You can say "update Netflix payment link to https://..." to add one.'
And no browser tab is opened
```

## AC-5: Chat Bill Queries Include Payment Links
```gherkin
Given bills in Notion have Service Link URLs
When the user asks "what bills do I have this week?"
And Jarvis calls query_bills
Then formatBillResults() output includes "[Pay here](url)" for each bill with a link
And Claude renders these as clickable markdown links
And bills without links show normally (no broken link text)
```

## AC-6: create_bill Accepts Service Link
```gherkin
Given the user says "add Netflix subscription $22.99/month, payment at https://netflix.com/account"
When Jarvis calls create_bill with title="Netflix", amount=22.99, frequency="Monthly", service_link="https://netflix.com/account"
Then the Notion page is created with Service Link property set
And Jarvis confirms 'Added bill: "Netflix" for $22.99 with payment link'
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Thread serviceLink Through Data Pipeline</name>
  <files>
    src/lib/jarvis/executive/types.ts,
    src/lib/jarvis/executive/BriefingBuilder.ts,
    src/lib/jarvis/stores/personalStore.ts,
    src/lib/jarvis/hooks/useJarvisFetch.ts,
    src/lib/jarvis/notion/schemas.ts
  </files>
  <action>
    **types.ts — Add serviceLink to BillSummary (line 79-84):**

    ```typescript
    // CURRENT:
    export interface BillSummary {
      id: string;
      title: string;
      amount: number;
      dueDate: string | null;
    }

    // CHANGE TO:
    export interface BillSummary {
      id: string;
      title: string;
      amount: number;
      dueDate: string | null;
      serviceLink?: string | null;
    }
    ```

    ---

    **BriefingBuilder.ts — Extract serviceLink in parseBillResults():**

    Step 1: Add `extractUrl` helper after `extractNumber` (after line 85):
    ```typescript
    /**
     * Extract URL value
     */
    function extractUrl(prop: unknown): string | null {
      const p = prop as { url?: string };
      return p?.url || null;
    }
    ```
    Note: BriefingBuilder already imports `SUBSCRIPTION_PROPS` at line 40. No import change needed.

    Step 2: In `parseBillResults()` bills.map() (lines 398-411), add serviceLink extraction. After `const status = extractSelect(...)` (line 402), add:
    ```typescript
    const serviceLink = extractUrl(p.properties[SUBSCRIPTION_PROPS.serviceLink]);
    ```
    And add `serviceLink,` to the return object (after `status,` at line 409).

    Step 3: In `parseBillResults()` filtered.map() (lines 425-430), pass through serviceLink:
    ```typescript
    // CURRENT:
    return filtered.map((bill) => ({
      id: bill.id,
      title: bill.title,
      amount: bill.amount,
      dueDate: bill.dueDate,
    }));

    // CHANGE TO:
    return filtered.map((bill) => ({
      id: bill.id,
      title: bill.title,
      amount: bill.amount,
      dueDate: bill.dueDate,
      serviceLink: bill.serviceLink,
    }));
    ```

    ---

    **personalStore.ts — Add serviceLink to PersonalBill (lines 23-30):**

    ```typescript
    // CURRENT:
    export interface PersonalBill {
      id: string;
      name: string;
      amount: number;
      dueDate: string;
      status: 'overdue' | 'due_soon' | 'paid' | 'upcoming';
      category: string;
    }

    // CHANGE TO:
    export interface PersonalBill {
      id: string;
      name: string;
      amount: number;
      dueDate: string;
      status: 'overdue' | 'due_soon' | 'paid' | 'upcoming';
      category: string;
      serviceLink?: string | null;
    }
    ```

    ---

    **useJarvisFetch.ts — Thread serviceLink in transformBills() (lines 181-188):**

    ```typescript
    // CURRENT:
    return {
      id: bill.id,
      name: bill.title,
      amount: bill.amount,
      dueDate: bill.dueDate ?? '',
      status,
      category: '',
    };

    // CHANGE TO:
    return {
      id: bill.id,
      name: bill.title,
      amount: bill.amount,
      dueDate: bill.dueDate ?? '',
      status,
      category: '',
      serviceLink: bill.serviceLink,
    };
    ```

    ---

    **schemas.ts — Add [Pay here] link in formatBillResults() (lines 576-599):**

    After `const startDate = extractDate(...)` (line 582), add:
    ```typescript
    const serviceLink = extractUrl(p.properties[SUBSCRIPTION_PROPS.serviceLink]);
    ```
    Note: `extractUrl` already exists in this file at line 1141. No new function needed.

    After the `if (startDate)` block (line 595-596), before the `line += \` [id:${p.id}]\`` (line 597), add:
    ```typescript
    if (serviceLink) {
      line += ` - [Pay here](${serviceLink})`;
    }
    ```
  </action>
  <verify>
    - BillSummary has optional `serviceLink` field
    - parseBillResults extracts serviceLink from SUBSCRIPTION_PROPS.serviceLink
    - parseBillResults passes serviceLink through filtered.map()
    - PersonalBill has optional `serviceLink` field
    - transformBills passes serviceLink from BillSummary to PersonalBill
    - formatBillResults includes `[Pay here](url)` for bills with links
    - No new imports needed (SUBSCRIPTION_PROPS already imported in BriefingBuilder, extractUrl already exists in schemas)
    - TypeScript compiles
  </verify>
  <done>AC-1 satisfied (pipeline), AC-5 satisfied (chat queries include payment links)</done>
</task>

<task type="auto">
  <name>Task 2: "Pay Now" Button in BillsList</name>
  <files>
    src/components/jarvis/personal/BillsList.tsx
  </files>
  <action>
    **BillsList.tsx — Replace single button with Pay Now + Mark Paid (lines 94-104):**

    ```tsx
    // CURRENT (lines 94-104):
    {!isPaid && (
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2"
        onClick={() => onMarkPaid(bill.id)}
        data-tutorial-id={markPaidTutorialId}
      >
        Mark Paid
      </Button>
    )}

    // CHANGE TO (also add import at top of file):
    // ADD to imports: import { ExternalLink } from 'lucide-react';

    {!isPaid && (
      <div className="flex gap-2 mt-2">
        {bill.serviceLink && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
            onClick={() => window.open(bill.serviceLink!, '_blank', 'noopener,noreferrer')}
          >
            Pay Now <ExternalLink className="w-3 h-3 ml-1 inline" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={bill.serviceLink ? 'flex-1' : 'w-full'}
          onClick={() => onMarkPaid(bill.id)}
          data-tutorial-id={markPaidTutorialId}
        >
          Mark Paid
        </Button>
      </div>
    )}
    ```

    **Design rationale for wife UX:**
    - "Pay Now" has cyan background tint (`bg-cyan-500/10`) — visually distinct primary action
    - ExternalLink icon (↗) signals "opens in new tab" without needing explanation
    - "Mark Paid" remains ghost — secondary action
    - When no service link: "Mark Paid" takes full width (no layout change from current behavior)
    - When service link exists: both buttons share the row equally (`flex-1`)
    - `noopener,noreferrer` prevents opener reference leaks
    - Original Jarvis tab stays open — user can mark paid after paying
  </action>
  <verify>
    - ExternalLink imported from lucide-react
    - Bills WITH serviceLink show both "Pay Now ↗" (cyan) and "Mark Paid" side by side
    - Bills WITHOUT serviceLink show only "Mark Paid" (full width)
    - "Pay Now" opens new tab, original tab stays open
    - ExternalLink icon (↗) visually signals "opens externally"
    - Paid bills show neither button (existing behavior preserved)
    - No layout shift between bills with/without payment links
  </verify>
  <done>AC-2 satisfied (Pay Now button opens payment portal)</done>
</task>

<task type="auto">
  <name>Task 3: Chat Tools — update_bill, navigate_to_payment, create_bill Enhancement</name>
  <files>
    src/lib/jarvis/intelligence/tools.ts,
    src/lib/jarvis/notion/schemas.ts,
    src/lib/jarvis/notion/toolExecutor.ts,
    src/lib/jarvis/intelligence/ClaudeClient.ts
  </files>
  <action>
    **tools.ts — Add update_bill tool definition (after mark_bill_paid, line 162):**

    Insert before the `// ===` separator comment at line 163:
    ```typescript
    {
      name: 'update_bill',
      description: 'Update an existing bill or subscription. Use when user wants to change a bill\'s amount, due date, frequency, category, payment link, or name.',
      input_schema: {
        type: 'object',
        properties: {
          bill_id: {
            type: 'string',
            description: 'The bill name or Notion ID to update'
          },
          title: {
            type: 'string',
            description: 'New name for the bill'
          },
          amount: {
            type: 'number',
            description: 'New amount in dollars'
          },
          due_date: {
            type: 'string',
            description: 'New due date in YYYY-MM-DD format'
          },
          frequency: {
            type: 'string',
            description: 'Payment frequency',
            enum: ['Monthly', 'Yearly', 'Weekly', 'Quarterly']
          },
          category: {
            type: 'string',
            description: 'Bill category (e.g., Utilities, Entertainment, Insurance, Healthcare)'
          },
          service_link: {
            type: 'string',
            description: 'URL to the payment portal where user can pay this bill'
          }
        },
        required: ['bill_id']
      }
    },
    ```

    **tools.ts — Add navigate_to_payment tool definition (after get_subscriptions, line 324):**

    Insert before `create_recurring_task` at line 325:
    ```typescript
    {
      name: 'navigate_to_payment',
      description: 'Open a bill\'s payment portal in the user\'s browser. Use when user says "pay my [bill]", "go pay [bill]", or "open payment for [bill]".',
      input_schema: {
        type: 'object',
        properties: {
          bill_name: {
            type: 'string',
            description: 'The bill or subscription name to pay'
          }
        },
        required: ['bill_name']
      }
    },
    ```

    **tools.ts — Add service_link to create_bill tool definition (line 100-128):**

    Add `service_link` property to the existing `create_bill` properties object (after `frequency` at line 125):
    ```typescript
    service_link: {
      type: 'string',
      description: 'URL to the bill\'s payment portal (e.g., https://netflix.com/account)'
    }
    ```

    **tools.ts — Update header comments (lines 6-8):**

    Change:
    ```
    * - 6 Write tools: create_task, create_bill, update_task_status, mark_bill_paid, pause_task, add_project_item
    ```
    To:
    ```
    * - 8 Write tools: create_task, create_bill, update_task_status, mark_bill_paid, update_bill, navigate_to_payment, pause_task, add_project_item
    ```

    Also update the duplicate comment at lines 37-38 to match.

    ---

    **schemas.ts — Add buildBillUpdateProperties helper (after buildBillPaidUpdate at line 883):**

    Insert before `buildBillProperties()` at line 885:
    ```typescript

    /**
     * Build Notion properties for updating an existing bill/subscription.
     * Only includes properties that are provided (partial update).
     */
    export function buildBillUpdateProperties(input: {
      title?: string;
      amount?: number;
      due_date?: string;
      frequency?: string;
      category?: string;
      service_link?: string;
    }): Record<string, unknown> {
      const properties: Record<string, unknown> = {};

      if (input.title !== undefined) {
        properties[SUBSCRIPTION_PROPS.title] = {
          title: [{ text: { content: input.title } }],
        };
      }
      if (input.amount !== undefined) {
        properties[SUBSCRIPTION_PROPS.fees] = {
          number: input.amount,
        };
      }
      if (input.due_date !== undefined) {
        properties[SUBSCRIPTION_PROPS.startDate] = {
          date: { start: input.due_date },
        };
      }
      if (input.frequency !== undefined) {
        properties[SUBSCRIPTION_PROPS.frequency] = {
          select: { name: input.frequency },
        };
      }
      if (input.category !== undefined) {
        properties[SUBSCRIPTION_PROPS.category] = {
          select: { name: input.category },
        };
      }
      if (input.service_link !== undefined) {
        properties[SUBSCRIPTION_PROPS.serviceLink] = {
          url: input.service_link,
        };
      }

      return properties;
    }
    ```

    **schemas.ts — Add service_link to buildBillProperties (line 889-932):**

    Add `service_link?: string;` to the function signature (after `frequency?: string;` at line 894).

    Add handling block before the status block (before line 926):
    ```typescript
    if (input.service_link) {
      properties[SUBSCRIPTION_PROPS.serviceLink] = {
        url: input.service_link,
      };
    }
    ```

    ---

    **toolExecutor.ts — CRITICAL: Add missing imports (lines 12-41):**

    Add `SUBSCRIPTION_PROPS` and `buildBillUpdateProperties` to the import from `./schemas`:
    ```typescript
    // After line 28 (buildBillProperties):
    buildBillProperties,
    buildBillUpdateProperties,    // NEW
    // After line 40 (SHOPPING_LIST_PROPS):
    SHOPPING_LIST_PROPS,
    SUBSCRIPTION_PROPS,           // NEW — needed for navigate_to_payment
    ```

    **toolExecutor.ts — Improve mark_bill_paid response (lines 355-388):**

    Save original name before resolution (add after line 357):
    ```typescript
    case 'mark_bill_paid': {
      // If bill_id looks like a title (not UUID), try to find it
      const originalBillName = input.bill_id as string;  // NEW — save for response
      let billId = originalBillName;                       // CHANGED — was input.bill_id as string
    ```

    Update response (line 387):
    ```typescript
    // CURRENT: return 'Marked the bill as paid.';
    // CHANGE TO:
    return `Marked "${originalBillName}" as paid.`;
    ```

    ---

    **toolExecutor.ts — Add update_bill executor case (after mark_bill_paid, line 388):**

    Insert before `case 'pause_task'` at line 390:
    ```typescript

    case 'update_bill': {
      const originalName = input.bill_id as string;
      let billId = originalName;

      if (!isValidUUID(billId)) {
        let foundId = findBillByTitle(billId);

        if (!foundId) {
          console.log('[ToolExecutor] Bill not in cache, auto-querying subscriptions to populate cache');
          const dataSourceId = LIFE_OS_DATABASES.subscriptions;
          if (dataSourceId) {
            const result = await queryDatabase(dataSourceId, {});
            cacheQueryResults(result, 'bill');
            foundId = findBillByTitle(billId);
          }
        }

        if (!foundId) {
          return `I couldn't find a bill matching "${billId}". Try the exact name as it appears in Notion.`;
        }
        billId = foundId;
      }

      const properties = buildBillUpdateProperties({
        title: input.title as string | undefined,
        amount: input.amount as number | undefined,
        due_date: input.due_date as string | undefined,
        frequency: input.frequency as string | undefined,
        category: input.category as string | undefined,
        service_link: input.service_link as string | undefined,
      });

      if (Object.keys(properties).length === 0) {
        return 'No changes specified. Tell me what to update (amount, due date, frequency, category, or payment link).';
      }

      await updatePage(billId, properties);

      const changes: string[] = [];
      if (input.title) changes.push(`name to "${input.title}"`);
      if (input.amount !== undefined) changes.push(`amount to $${(input.amount as number).toFixed(2)}`);
      if (input.due_date) changes.push(`due date to ${input.due_date}`);
      if (input.frequency) changes.push(`frequency to ${input.frequency}`);
      if (input.category) changes.push(`category to ${input.category}`);
      if (input.service_link) changes.push('payment link updated');

      return `Updated "${originalName}": ${changes.join(', ')}.`;
    }
    ```

    **toolExecutor.ts — Add navigate_to_payment executor case (after get_subscriptions, line 584):**

    Insert before `case 'create_recurring_task'` at line 586:
    ```typescript

    case 'navigate_to_payment': {
      const billName = input.bill_name as string;
      const dataSourceId = LIFE_OS_DATABASES.subscriptions;
      if (!dataSourceId) {
        return 'Subscriptions database is not configured. Please set NOTION_SUBSCRIPTIONS_DATA_SOURCE_ID.';
      }

      let foundId = findBillByTitle(billName);
      if (!foundId) {
        console.log('[ToolExecutor] Bill not in cache, auto-querying subscriptions');
        const result = await queryDatabase(dataSourceId, {});
        cacheQueryResults(result, 'bill');
        foundId = findBillByTitle(billName);
      }

      if (!foundId) {
        return `I couldn't find a subscription matching "${billName}". Try the exact name as it appears in your Notion subscriptions.`;
      }

      const page = await retrievePage(foundId);
      const props = (page as { properties: Record<string, unknown> }).properties;

      const urlProp = props[SUBSCRIPTION_PROPS.serviceLink] as { url?: string } | undefined;
      const serviceLink = urlProp?.url || null;
      const titleProp = props[SUBSCRIPTION_PROPS.title] as { title?: Array<{ plain_text?: string }> } | undefined;
      const title = titleProp?.title?.[0]?.plain_text || billName;

      if (!serviceLink) {
        return `Found "${title}" but it doesn't have a payment link saved. You can say "update ${title} payment link to https://..." to add one.`;
      }

      return JSON.stringify({
        action: 'open_payment',
        url: serviceLink,
        title,
      });
    }
    ```
    Note: `retrievePage` already imported at line 10. `findBillByTitle` at line 45. `LIFE_OS_DATABASES` at line 13. `SUBSCRIPTION_PROPS` added to import above.

    **toolExecutor.ts — Thread service_link in create_bill case (line 243-270):**

    Add `service_link` to the `buildBillProperties` call at line 250-256:
    ```typescript
    const properties = buildBillProperties({
      title,
      amount: input.amount as number | undefined,
      due_date: input.due_date as string | undefined,
      category: input.category as string | undefined,
      frequency: input.frequency as string | undefined,
      service_link: input.service_link as string | undefined,  // NEW
    });
    ```

    Add to the response builder (after the `if (input.due_date)` block at line 267):
    ```typescript
    if (input.service_link) {
      response += ' with payment link';
    }
    ```

    **toolExecutor.ts — Update summarizeNotionContext (line 116-137):**

    Add cases for the new tools (after `case 'mark_bill_paid'` at line 128):
    ```typescript
    case 'update_bill':
      return `Updated bill "${input.bill_id}"`;
    case 'navigate_to_payment':
      return `Opening payment for "${input.bill_name}"`;
    ```

    ---

    **ClaudeClient.ts — Add update_bill to WRITE_TOOLS (lines 14-24):**

    ```typescript
    // CURRENT:
    const WRITE_TOOLS = [
      'create_task',
      'update_task_status',
      'mark_bill_paid',
      'pause_task',
      'add_project_item',
      'open_notion_panel',
      'close_notion_panel',
      'start_lesson',
      'complete_lesson',
    ];

    // CHANGE TO:
    const WRITE_TOOLS = [
      'create_task',
      'update_task_status',
      'mark_bill_paid',
      'update_bill',
      'pause_task',
      'add_project_item',
      'open_notion_panel',
      'close_notion_panel',
      'start_lesson',
      'complete_lesson',
    ];
    // NOTE: navigate_to_payment is NOT in WRITE_TOOLS — it opens a browser tab,
    // doesn't modify Notion data. Its ClaudeClient handler runs independently
    // via toolName check (line 134 pattern). Adding it here would waste an API
    // call to triggerRefresh() every time the user says "pay my Netflix".
    ```

    **ClaudeClient.ts — Add navigate_to_payment handler (after close_notion_panel handler, line 151):**

    Insert before `} else if (toolName === 'start_lesson' && isSuccess)` at line 152:
    ```typescript
    } else if (toolName === 'navigate_to_payment' && isSuccess) {
      try {
        const parsed = JSON.parse(result);
        if (parsed.action === 'open_payment') {
          console.log('[ClaudeClient] Opening payment portal:', parsed.title);
          window.open(parsed.url, '_blank', 'noopener,noreferrer');
        }
      } catch {
        // Not JSON — tool returned an error string (e.g., no payment link), skip
      }
    ```
  </action>
  <verify>
    - `update_bill` tool definition in notionTools array with all 7 optional properties
    - `navigate_to_payment` tool definition in notionTools array
    - `create_bill` tool definition includes `service_link` property
    - `buildBillUpdateProperties` exported from schemas.ts with partial update support
    - `buildBillProperties` accepts and handles `service_link`
    - `SUBSCRIPTION_PROPS` imported in toolExecutor.ts (BUILD-BREAKING BUG FIXED)
    - `buildBillUpdateProperties` imported in toolExecutor.ts
    - `update_bill` case follows exact `mark_bill_paid` pattern (name resolution, cache fallback)
    - `navigate_to_payment` case follows `open_notion_panel` JSON action pattern
    - `navigate_to_payment` uses inline property extraction (no export surface changes)
    - `create_bill` passes `service_link` to `buildBillProperties`
    - `summarizeNotionContext` includes new tool cases
    - `WRITE_TOOLS` includes `update_bill` (NOT `navigate_to_payment` — no data mutation)
    - `navigate_to_payment` ClaudeClient handler parses JSON and calls `window.open()`
    - Error case (no payment link) returns coaching message, NOT JSON (handler skips gracefully)
    - `navigate_to_payment` error message coaches user ("Try the exact name...")
    - `mark_bill_paid` response includes original bill name (not generic)
    - Header comments updated (8 Write tools)
    - TypeScript compiles
  </verify>
  <done>AC-3 satisfied (update_bill), AC-4 satisfied (navigate_to_payment), AC-6 satisfied (create_bill with service_link)</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/google/* — Google Calendar integration is stable
- src/lib/jarvis/memory/* — Memory system is stable
- src/lib/jarvis/intelligence/chatProcessor.ts — Tool routing already handles notionTools; new tools are in notionTools array and route through existing executeNotionTool path
- src/lib/jarvis/resilience/* — Resilience utilities are stable
- src/lib/jarvis/intelligence/sdkBrain.ts — Brain module is stable
- src/middleware.ts — No changes needed

## SCOPE LIMITS
- No bill edit form UI — chat-based editing via `update_bill` covers all needs
- No Playwright browser automation — payment portals require MFA/CAPTCHAs, autopay handles automation
- No NudgeOverlay payment action — would require threading serviceLink through NudgeEvent/NudgeState chain
- No bill autopay detection — would need a new Notion property
- No BillsSummary dashboard changes — summary card shows aggregates, not individual bill actions

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero type errors
- [ ] BillSummary type has optional serviceLink field
- [ ] PersonalBill type has optional serviceLink field
- [ ] parseBillResults extracts serviceLink via extractUrl + SUBSCRIPTION_PROPS.serviceLink
- [ ] parseBillResults passes serviceLink through filtered.map()
- [ ] transformBills passes serviceLink from BillSummary to PersonalBill
- [ ] ExternalLink imported from lucide-react in BillsList.tsx
- [ ] BillsList renders "Pay Now ↗" (cyan, bg-cyan-500/10) + "Mark Paid" for bills WITH serviceLink
- [ ] BillsList renders only "Mark Paid" (full width) for bills WITHOUT serviceLink
- [ ] "Pay Now" calls window.open() with noopener,noreferrer
- [ ] ExternalLink icon visible on Pay Now button (signals "opens externally")
- [ ] formatBillResults includes `[Pay here](url)` for bills with Service Links
- [ ] update_bill tool definition has 7 optional properties + required bill_id
- [ ] update_bill executor follows mark_bill_paid pattern (name resolution, cache fallback)
- [ ] buildBillUpdateProperties handles all 6 property types with SUBSCRIPTION_PROPS mapping
- [ ] navigate_to_payment tool definition in notionTools array
- [ ] navigate_to_payment executor uses retrievePage to get Service Link
- [ ] navigate_to_payment returns JSON { action: 'open_payment' } for ClaudeClient
- [ ] navigate_to_payment returns coaching message when no payment link (NOT JSON — handler skips)
- [ ] ClaudeClient handler for navigate_to_payment follows open_notion_panel pattern
- [ ] WRITE_TOOLS includes update_bill (dashboard refreshes after bill edits)
- [ ] navigate_to_payment is NOT in WRITE_TOOLS (opens browser tab, doesn't modify data)
- [ ] mark_bill_paid response includes bill name (was generic "Marked the bill as paid.")
- [ ] SUBSCRIPTION_PROPS imported in toolExecutor.ts (critical import fix)
- [ ] buildBillUpdateProperties imported in toolExecutor.ts
- [ ] create_bill tool definition includes service_link property
- [ ] buildBillProperties accepts and maps service_link to SUBSCRIPTION_PROPS.serviceLink
- [ ] create_bill executor passes service_link to buildBillProperties
- [ ] summarizeNotionContext includes update_bill and navigate_to_payment cases
- [ ] Header comments in tools.ts updated (8 Write tools)
- [ ] No new npm dependencies
</verification>

<success_criteria>
- All 3 tasks completed
- All 28 verification checks pass
- serviceLink flows end-to-end: Notion → BriefingBuilder → types → stores → hooks → UI
- "Pay Now ↗" button is visually prominent with ExternalLink icon — immediately obvious to a non-technical user
- Chat bill management works: update properties, navigate to payment portals, create with links
- Error messages coach the user toward resolution (not dead ends)
- mark_bill_paid response includes the bill name (e.g., "Marked "Netflix" as paid.")
- navigate_to_payment does NOT trigger wasteful dashboard refresh (not in WRITE_TOOLS)
- Existing bill functionality (mark_bill_paid, create_bill, query_bills, get_subscriptions) improved, not broken
- Zero new npm dependencies
</success_criteria>

<what_not_to_build>

## Bill Edit Form UI
Chat-based editing via `update_bill` covers all needs. A form would require: new API route, form component, validation, error states, loading states. Deferred to future phase.

## Playwright Browser Automation (Level 4-5)
Playwright MCP runs locally (npx @playwright/mcp@latest), not on Vercel serverless. Payment portals require MFA, CAPTCHAs, and interactive auth. Each portal has unique form layouts. Cost is months. For automation, use autopay on each service — Jarvis monitors, autopay executes.

## NudgeOverlay Payment Action
Would require threading serviceLink through NudgeEvent → NudgeState type chain. Low value — user can dismiss nudge, open Bills page, and use Pay Now from there. Future phase.

## Bill Autopay Detection
Detecting which bills have autopay enabled vs manual payment. Would need a new Notion property. Nice-to-have for v4.2.

</what_not_to_build>

<output>
After completion, create `.paul/phases/I-bill-payment/I-01-SUMMARY.md`
</output>
