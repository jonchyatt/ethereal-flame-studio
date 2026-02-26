---
phase: E-mobile-ui
plan: 03
type: research
status: COMPLETE
started: 2026-02-25
completed: 2026-02-25
---

# E-03 Summary: UI System Design

## What Was Built

Complete UI system design document:
`jarvis/.paul/research/phase-e-ui-system-design.md` (v1.0, ~900 lines)

### 9 Sections

1. **Design Tokens** — Colors (4 surface layers + 3 glass + 8 domain colors), typography scale, spacing, surfaces (glassmorphism recipe, radii, shadows)
2. **Component Architecture** — 8 primitives + 8 composites + 7 layout components, all with variant/size/class definitions
3. **Layout System** — Responsive grid (1→2→3 col), scroll regions, section spacing
4. **Responsive Strategy** — ASCII wireframes for all screen types at mobile + desktop. Added lg: breakpoint.
5. **The Orb Decision** — Option B: Miniaturize to 32px in header. Full-screen as opt-in Classic Mode.
6. **Animation System** — 4 timing tokens, spring easing, micro-interactions, reduced-motion fallback
7. **Icon System** — Adopt lucide-react, 5 size tiers, domain icon assignments, status icon pairings
8. **Accessibility** — WCAG AA+ contrast, focus rings, keyboard nav, semantic HTML, 44px touch targets
9. **File Organization** — primitives/ composites/ layout/ domains/ legacy/ structure

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Mini-orb (32px) in header, not archived | Preserves Jarvis identity without consuming viewport |
| lucide-react for icons | Already installed, tree-shakeable, 1500+ icons |
| No UI libraries (hand-built Tailwind) | User constraint — taste and craft |
| Dark theme only | Consistent with existing aesthetic, no light mode |
| 3 breakpoints (mobile/tablet/desktop) | Extends current md: with lg: for 3-column grids |
| Glassmorphism as signature surface | Formalized from existing ad-hoc patterns |
| Domain colors (8 unique) | Visual identity per domain in rail and cards |
| useReducedMotion hook | Accessibility-first animation system |

## Files Created

- `jarvis/.paul/research/phase-e-ui-system-design.md` (v1.0)

## Next

E-04: Build Wave 1 — Shell + Personal (Foundation)
- Onboarding flow, JarvisShell, DomainRail, Header, BottomTabBar
- Priority Home, Personal dashboard + tasks + habits + bills
- Primitives (Button, Card, Input, etc.), ChatOverlay, Settings
- Empty/error state patterns, data freshness model
