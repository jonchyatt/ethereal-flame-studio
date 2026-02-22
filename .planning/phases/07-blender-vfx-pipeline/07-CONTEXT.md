# Phase 7: Blender VFX Production Pipeline - Context

**Gathered:** 2026-02-19
**Status:** Deferred — ship current product first

<domain>
## Phase Boundary

Full VFX production capability with physics simulations, VR compositing, depth-aware rendering, and EDM visual effects. Blender augments the existing Three.js pipeline — it does NOT replace it.

**CRITICAL CONSTRAINT:** Phase 7 is explicitly deferred until the YouTube channel is live and publishing regularly. No Blender work until 3+ videos are published with the existing Three.js pipeline.

</domain>

<decisions>
## Implementation Decisions

### Hybrid Architecture (LOCKED)
- Three.js remains the interactive runtime for live preview, audio reactivity, and user controls
- Blender is for reference renders, 8K final output, pre-rendered loops, and raytraced water reflections
- All current Three.js functionality must be preserved — no regressions

### Particle Pass Strategy (NEEDS DECISION)
- Three options identified by Codex:
  - Option A: Import particle positions from Three.js into Blender
  - Option B: Recreate particles in Blender Geometry Nodes
  - Option C: Render particles separately and composite in Blender/post
- Decision deferred to planning phase

### Audio-to-VFX Creative Mapping (USER DIRECTION)
- User's content is meditation/inspirational audio with ethereal starfield visuals
- Audio features should drive effects naturally: bass → fire intensity, beats → strobes, spectral brightness → color temperature
- Specific creative mappings to be decided during planning
- Must work with the meditation/ambient aesthetic (not aggressive EDM)

### Output Workflow Integration
- Blender renders must flow into existing automation pipeline (Google Drive sync, YouTube upload via n8n)
- Start with flat 1080p/4K output only — 360/VR is secondary
- Blender rendering should be queueable alongside existing Three.js renders

### Visual Quality Targets
- Fire-over-water aesthetic from reference images is the primary target
- Blender output should be visibly superior to Three.js particle system
- Codex recommendation: use Blender renders as visual targets for Three.js quality calibration
- Visual parity validation gates between Three.js preview and Blender finals

### Scene Scale Alignment (FROM CODEX)
- Blender base scene template must align to web scene scale
- Water plane Y position parity target: Y = -0.8
- Reusable lighting/camera presets for 360 stereo output

### Claude's Discretion
- Technical implementation of MCP integration
- Specific Mantaflow simulation parameters
- Compositor node tree design
- Depth extraction method choice (MiDaS vs Depth Anything)
- Blender render engine choice per effect (Cycles vs Eevee)

</decisions>

<specifics>
## Specific Ideas

- User wants to preserve the ethereal starfield aesthetic that's working in production
- Meditation/inspirational content is the market — not aggressive EDM visuals
- The existing Codex checklist (docs/BLENDER_MIGRATION_INTEGRATION_CHECKLIST.md) should be used as the orchestration layer
- 6 research documents already completed in this directory — comprehensive technical foundation
- Near-term Three.js water improvements (normal maps, Fresnel) should happen before or alongside Blender work

## User's Critical Insight (2026-02-19)
"I keep improving my product but I think it might be because I'm afraid to put a product out."
- The current product IS good enough to publish
- Phase 7 is a quality upgrade, not a launch requirement
- Ship first, enhance later

</specifics>

<deferred>
## Deferred Ideas

- Abraham Hicks audio content: copyright risk, use only as secondary content line with full credit
- Multi-platform posting (TikTok, Instagram Reels): belongs in Phase 6
- Cloud rendering (Modal, RunPod): evaluate if local rendering proves unreliable
- 360/VR content: secondary format after flat videos establish the channel

</deferred>

---

*Phase: 07-blender-vfx-pipeline*
*Context gathered: 2026-02-19*
