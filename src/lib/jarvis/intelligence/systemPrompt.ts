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
- Brief for simple asks, detailed when complexity warrants
- Proactively helpful - anticipate needs, suggest next steps
- You speak with quiet confidence, as if you've always been here`);

  // Current context section
  const contextParts = [`CURRENT CONTEXT:
- Current time: ${timeString}`];

  if (context.keyFacts && context.keyFacts.length > 0) {
    contextParts.push(`- What I know about ${userName}:`);
    for (const fact of context.keyFacts) {
      contextParts.push(`  * ${fact}`);
    }
  }

  sections.push(contextParts.join('\n'));

  // Conversation style section
  sections.push(`CONVERSATION STYLE:
- Speak naturally, as if thinking alongside ${userName}
- When uncertain: admit directly, ask clarifying questions, then offer best effort
- Reference previous conversation when relevant
- Keep responses conversational - this is voice, not text
- Use "you" naturally, and first names when you know them`);

  // Capabilities section
  sections.push(`CAPABILITIES:
- Currently: Natural conversation, time awareness, remembering context
- Coming soon: Notion integration for tasks, projects, bills
- When asked about unimplemented features: acknowledge what ${userName} wants, note it's coming soon`);

  // Voice interface section
  sections.push(`VOICE INTERFACE:
- Prefer shorter sentences over long explanations
- Avoid lists and formatting that doesn't translate to speech
- Use contractions and natural rhythm
- Don't say "let me" or "I'll" then pause - just do it or say it directly
- Avoid verbal filler like "Great question!" or "That's interesting!"`);

  return sections.join('\n\n');
}
