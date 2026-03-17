# Entity & Website Optimization — Phase 16 Scope Note

**Created:** 2026-03-17
**Context:** Jonathan flagged that entity optimization and website optimization must be part of the research system.

## What This Means

The Phase 16 research tools + entity profiles aren't just for grant applications — they're the infrastructure for tracking and optimizing ALL entity health:

### Entity Optimization (domain='entity-optimization')
- **Registrations:** DUNS number, SAM.gov, state filings, EIN verification per entity
- **Compliance:** 501(c)(3) annual filings, registered agent status, good standing certificates
- **Credit building:** D&B profile, business credit cards, trade references, Experian business profile
- **Banking:** Business bank accounts, payment processing, separate finances per entity

### Website Optimization (domain='website-optimization')
- **Grant-readiness:** Mission statement visible, programs listed, 501(c)(3)/EIN in footer, donate page
- **Credibility signals:** SSL, professional design, team/board page, annual report/impact data
- **SEO:** Entity name searchable, social proof, media mentions
- **Per-entity tracking:** satoriliving.org (done 2026-03-17), ethereal flame studio, reset biology, etc.

## How Phase 16 Enables This

1. **Phase 16-01** (research tools): Researcher agent can store findings with `domain='entity-optimization'` or `domain='website-optimization'`
2. **Phase 16-02** (entity profiles): Loader imports current entity state, flags [FILL] fields as confidence='low' — these are the optimization gaps
3. **Phase 16.1** (research intelligence): Expiry monitoring flags stale registrations, cross-domain inference links entity health to grant/credit eligibility

## Example Researcher Tasks After Phase 16

- "Research what Satori Living needs for SAM.gov registration"
- "Check if all entities have current DUNS numbers"
- "Audit satoriliving.org for grant-readiness gaps"
- "What business credit cards accept new LLCs with no revenue history?"

All findings stored as structured research_entries, searchable, with confidence and expiry tracking.

## Implementation Note for 16-02 Entity Profile Loader

When parsing entity profiles, also create entries for KNOWN optimization gaps:
- Missing DUNS → research_entry(domain='entity-optimization', topic='Satori Living', fieldName='duns_status', fieldValue='not_registered', confidence='high')
- Website not audited → research_entry(domain='website-optimization', topic='satoriliving.org', fieldName='last_audit', fieldValue='none', confidence='high')

This seeds the optimization tracking from day one.
