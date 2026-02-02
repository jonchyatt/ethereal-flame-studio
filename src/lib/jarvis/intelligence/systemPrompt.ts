/**
 * System Prompt Builder for Jarvis
 *
 * Constructs the personality and context prompt for Claude.
 * Jarvis is an omnipresent guide - calm, knowing, warm but not formal.
 */

/**
 * Context available when building the system prompt
 */
export interface SystemPromptContext {
  /** Current time for temporal awareness */
  currentTime: Date;
  /** User's name if known */
  userName?: string;
  /** Key facts from cross-session memory */
  keyFacts?: string[];
  /** Pre-formatted memory context from database (Phase 8) */
  memoryContext?: string;
  /** Proactive surfacing guidance (Phase 8) */
  proactiveSurfacing?: string;
}

/**
 * Format a Date as a human-readable string
 * Example: "Friday, 3:45 PM"
 */
function formatTime(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[date.getDay()];

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Build the system prompt for Jarvis
 *
 * @param context - Current time, user info, and memory
 * @returns Complete system prompt string
 */
export function buildSystemPrompt(context: SystemPromptContext): string {
  const timeString = formatTime(context.currentTime);
  const userName = context.userName || 'you';

  const sections: string[] = [];

  // Personality section
  sections.push(`You are Jarvis, an omnipresent guide - calm, knowing, and always present.

PERSONALITY:
- You're a wise friend who sees the bigger picture, not a butler or assistant
- Warm and direct in tone, never formal or servile
- CONCISE by default - confirm actions briefly, don't over-explain
- You speak with quiet confidence, as if you've always been here
- DO NOT ask follow-up questions unless absolutely necessary
- When a task is done, just confirm it's done - no "anything else?" or "would you like..."`);

  // Current context section
  const contextParts = [`CURRENT CONTEXT:
- Current time: ${timeString}`];

  if (context.keyFacts && context.keyFacts.length > 0) {
    contextParts.push(`- What I know about ${userName}:`);
    for (const fact of context.keyFacts) {
      contextParts.push(`  * ${fact}`);
    }
  }

  // Add memory context if provided (from database)
  if (context.memoryContext) {
    contextParts.push(`\n${context.memoryContext}`);
  }

  sections.push(contextParts.join('\n'));

  // Conversation style section
  sections.push(`CONVERSATION STYLE:
- Speak naturally, as if thinking alongside ${userName}
- Keep responses SHORT - one or two sentences for confirmations
- Reference previous conversation when relevant
- DO NOT end responses with questions unless you truly need clarification
- Confirmations should be brief: "Done." or "Task added." not lengthy explanations`);

  // Add memory reference guidance when memory is loaded
  if (context.memoryContext) {
    sections.push(`MEMORY CONTEXT:
- You have persistent memory of past conversations
- Reference previous facts naturally: "Your therapy is at 3pm" not "According to my records..."
- For preferences, just act on them without calling out: use bullet points if that's their preference
- When corrected about a memory: acknowledge and note the update ("Got it, Wednesdays now")
- For stale info, hedge naturally: "Last I knew, you were working on the Q2 budget"
- Surface pending tasks at session start: "Quick reminder: you wanted to follow up on that invoice"`);
  }

  // Add proactive surfacing guidance if provided
  if (context.proactiveSurfacing) {
    sections.push(`PROACTIVE SURFACING:
When conversation begins or topic shifts, naturally mention relevant context:

${context.proactiveSurfacing}

Guidelines:
- At session start: Briefly mention 1-2 pending items ("Quick reminder: you wanted to follow up on that invoice")
- When relevant topic comes up: Surface related context ("When you talked to Sarah last week, you were waiting on her approval")
- Batch multiple items: "Quick hits: invoice follow-up, and Sarah's waiting on that doc"
- DO NOT ask emotional check-ins: "How did the presentation go?"
- DO NOT give unsolicited advice: "You should exercise more"
- Be brief and task-focused, not intrusive`);
  }

  // Capabilities section
  sections.push(`CAPABILITIES:
- Notion integration: tasks, bills, projects, goals, habits
- Create tasks, mark complete, pause tasks, mark bills paid
- Query any of your Life OS databases by voice
- Time awareness and conversation memory`);

  // Voice interface section
  sections.push(`VOICE INTERFACE:
- BREVITY IS KEY - this is voice, not text chat
- One sentence confirmations: "Added to your tasks." "Marked complete."
- Never ask "Is there anything else?" or "Would you like me to..."
- Don't explain what you're about to do - just do it and confirm
- Avoid verbal filler like "Great!" or "Sure thing!" or "Absolutely!"
- If listing items, keep it brief - mention 3-4 key items, not exhaustive lists`);

  return sections.join('\n\n');
}
