import { z } from 'zod';

export const PATRON_TIERS = ['plain', 'sparkly', 'glowing', 'ethereal'] as const;
export type PatronTier = (typeof PATRON_TIERS)[number];

export const DISPLAY_NAME_MAX = 40;
export const MESSAGE_MAX = 120;

/**
 * Opaque reference into the consent record kept OUTSIDE this public repo.
 * Deliberately narrow: an email, name or billing id will not fit this shape.
 */
export const consentRefSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'consentRef must be an opaque token');

export const patronSchema = z.object({
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX),
  message: z.string().trim().max(MESSAGE_MAX).optional(),
  tier: z.enum(PATRON_TIERS),
  /** ISO date the patron joined, e.g. 2026-10-17. */
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/, 'since must be an ISO date'),
  /** Jonathan's curation gate: false never renders. */
  approved: z.boolean(),
  /** Opaque pointer to the explicit public-display consent record (stored outside the repo). */
  consentRef: consentRefSchema,
}).strict(); // unknown keys (email, billing, ...) are rejected, never carried along

export const patronsFileSchema = z.array(patronSchema);

export type Patron = z.infer<typeof patronSchema>;
