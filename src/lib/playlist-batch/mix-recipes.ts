import phaseTwoRecipe from '../../../data/waia-mixer-spike/recipe.json';
import { canonicalSha256, type PlaylistRightsBasis } from './schema';

export type ResolvedMixSource = {
  assetId: string;
  sourceUrl: string;
  rightsBasis: PlaylistRightsBasis;
  rightsEvidence: string;
  attribution?: string;
};

export type ResolvedMixRecipe = {
  recipeId: string;
  version: number;
  fingerprint: string;
  sources: ResolvedMixSource[];
};

function classifyRights(evidence: string): PlaylistRightsBasis {
  if (/^cc0\b/i.test(evidence)) return 'cc0';
  if (/^public-domain\b/i.test(evidence)) return 'public-domain';
  throw new Error(`Unsupported rights basis in authoritative mix recipe: ${evidence}`);
}

const phaseTwoSources = [
  ...phaseTwoRecipe.sources,
  phaseTwoRecipe.musicBed,
].map((source) => ({
  assetId: source.assetId,
  sourceUrl: source.sourceUrl,
  rightsBasis: classifyRights(source.rightsBasis),
  rightsEvidence: source.rightsBasis,
  attribution: 'attribution' in source ? source.attribution : undefined,
}));

const PHASE_TWO_RECIPE: ResolvedMixRecipe = {
  recipeId: `data/waia-mixer-spike/recipe.json@v${phaseTwoRecipe.version}`,
  version: phaseTwoRecipe.version,
  fingerprint: canonicalSha256(phaseTwoRecipe),
  sources: phaseTwoSources,
};

/**
 * ponytail: Phase 3 has one ratified mix artifact, so a static registry is the
 * smallest trustworthy resolver. Upgrade to a durable recipe registry when
 * Phase 4 opens additional recipes.
 */
export function resolveMixRecipe(recipeId: string): ResolvedMixRecipe | undefined {
  return recipeId === PHASE_TWO_RECIPE.recipeId ? structuredClone(PHASE_TWO_RECIPE) : undefined;
}
