import { getChannelMetadataPreset } from './presets';
import type { CreatorPublishDraft } from './types';

type GenerateMetadataInput = {
  channelPresetIds: string[];
  sourceAudioName: string;
  tags?: {
    moods?: string[];
    topics?: string[];
    keywords?: string[];
    bpm?: number | null;
  };
  durationSec?: number | null;
};

function titleCaseWords(raw: string): string {
  return raw
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(' ');
}

function inferTopicAndMood(input: GenerateMetadataInput): { topic: string; mood: string; keywords: string[] } {
  const sourceBase = input.sourceAudioName.replace(/\.[^.]+$/, '');
  const tagTopic = input.tags?.topics?.[0];
  const tagMood = input.tags?.moods?.[0];
  const topic = titleCaseWords(tagTopic || sourceBase || 'Ambient Visual');
  const mood = titleCaseWords(tagMood || 'Ethereal');
  const inferredKeywords = (input.tags?.keywords || [])
    .filter(Boolean)
    .slice(0, 8)
    .map((k) => k.replace(/^#/, ''));
  return { topic, mood, keywords: inferredKeywords };
}

function fillTemplate(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => replacements[key] ?? '');
}

export function generatePublishDrafts(input: GenerateMetadataInput): CreatorPublishDraft[] {
  const { topic, mood, keywords } = inferTopicAndMood(input);
  const seconds = input.durationSec ? String(Math.round(input.durationSec)) : '60';
  const drafts: CreatorPublishDraft[] = [];

  for (const presetId of input.channelPresetIds) {
    const preset = getChannelMetadataPreset(presetId);
    if (!preset) continue;

    const hashtags = Array.from(new Set(preset.hashtagSets.flat())).slice(0, 12);
    const ctaPrimary = preset.ctaTemplates[0] || 'Follow for more.';
    const keywordString = Array.from(new Set([...preset.keywordPacks, ...keywords])).slice(0, 12).join(', ');
    const replacements = {
      topic,
      mood,
      seconds,
      keywords: keywordString,
      cta_primary: ctaPrimary,
    };

    const titleVariants = preset.titleTemplates
      .map((t) => fillTemplate(t, replacements).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 6);

    const description = fillTemplate(preset.descriptionTemplate, replacements)
      .replace(/\s+\n/g, '\n')
      .trim();

    drafts.push({
      channelPresetId: preset.id,
      platform: preset.platform,
      titleVariants,
      description,
      hashtags,
      ctas: preset.ctaTemplates.slice(0, 4),
      keywordPacks: Array.from(new Set([...preset.keywordPacks, ...keywords])).slice(0, 12),
    });
  }

  return drafts;
}
