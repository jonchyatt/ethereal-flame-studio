import { FULL_NAME, nameProblems } from '@/lib/creator/shorts/captions';

/**
 * HB-8 check for words a viewer reads on a thumbnail or in a title: no vlog, no Jonathan narration,
 * no engagement bait, no Crit Fail tone, no outcome claims. Returns the reasons; empty when clean.
 * It cannot judge tone, so a pass means "no known violation", not "approved".
 */
export function soulProblems(text: string): string[] {
  const t = text.trim();
  const problems = [...nameProblems(t)];
  const rules: Array<[RegExp, string]> = [
    [/\b(vlog|day in (the|my) life|story ?time|my (journey|story|morning))\b/i, 'vlog framing'],
    [/\b(i|i'm|i've|i'll|my|me|we|our)\b/i, 'first-person narration'],
    [/\b(you won'?t believe|shocking|insane|mind[- ]?blowing|gone wrong|must[- ]watch|secret they|exposed)\b/i, 'clickbait wording'],
    [/\b(like|subscribe|smash|comment below|hit the bell|share this|don'?t forget)\b/i, 'engagement bait'],
    [/[!?]{2,}|!/, 'shouting punctuation'],
    [/\b(crit(ical)? fail|nat(ural)? 1|rekt|owned|wrecked|destroyed)\b/i, 'Crit Fail tone'],
    [/\b(cure[sd]?|heal(s|ed)?|guarantee[sd]?|miracle|get rich|manifest (money|wealth)|cancer|anxiety|depression)\b/i, 'outcome or health claim'],
    [/\b(\d+\s*(hours?|min(ute)?s?)\s*(of|to)|top\s*\d+|#1)\b/i, 'listicle or superlative bait'],
  ];
  for (const [re, why] of rules) if (re.test(t)) problems.push(why);
  const words = t.split(/\s+/).filter((w) => /[A-Za-z]{3,}/.test(w));
  const caps = words.filter((w) => w === w.toUpperCase());
  if (words.length >= 3 && caps.length / words.length > 0.5) problems.push('shouting in capitals');
  return problems;
}

/** Checks a title as it would read with the channel suffix, since that is what the viewer sees. */
export function titleSoulProblems(title: string): string[] {
  const head = title.replace(new RegExp(`\\s*\\|\\s*${FULL_NAME}\\s*$`), '');
  return soulProblems(head);
}
