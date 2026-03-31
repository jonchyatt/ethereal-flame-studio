'use client';

import { useState } from 'react';

type Section = 'overview' | 'engines' | 'automation' | 'presets' | 'features' | 'cloud' | 'roadmap';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'engines', label: 'Render Engines' },
  { id: 'automation', label: 'Automation Flow' },
  { id: 'presets', label: 'Presets' },
  { id: 'features', label: 'Features' },
  { id: 'cloud', label: 'Cloud Rendering' },
  { id: 'roadmap', label: 'Roadmap' },
];

function StatusBadge({ status }: { status: 'live' | 'built' | 'planned' | 'idea' }) {
  const colors = {
    live: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    built: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    planned: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    idea: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

export default function PipelinePage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Production Pipeline</h1>
          <p className="text-zinc-400">
            How Ethereal Flame Studio creates, renders, and publishes VR content.
            This is a living document — updated as we build.
          </p>
          <p className="text-zinc-500 text-sm mt-1">Last updated: 2026-03-30</p>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                activeSection === section.id
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeSection === 'overview' && <OverviewSection />}
          {activeSection === 'engines' && <EnginesSection />}
          {activeSection === 'automation' && <AutomationSection />}
          {activeSection === 'presets' && <PresetsSection />}
          {activeSection === 'features' && <FeaturesSection />}
          {activeSection === 'cloud' && <CloudSection />}
          {activeSection === 'roadmap' && <RoadmapSection />}
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <>
      <SectionCard title="The Vision">
        <p className="text-zinc-300">
          Audio goes in. Published VR video comes out. Zero manual intervention.
        </p>
        <p className="text-zinc-400 text-sm">
          Bots scrape inspirational content, generate audio, feed it to the render pipeline,
          which produces 360 VR videos, uploads them to YouTube with metadata,
          posts to social media, and engages with the audience — all while Jonathan
          is in the operating room.
        </p>
      </SectionCard>

      <SectionCard title="Three-Engine Architecture">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-400 font-semibold">Unity</span>
              <StatusBadge status="live" />
            </div>
            <p className="text-sm text-zinc-400">
              Production video renderer. Real-time 360 VR capture.
              15-minute videos in hours, not weeks. Audio-reactive orbs,
              starfield, water. The proven pipeline since 2017.
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-semibold">Blender</span>
              <StatusBadge status="live" />
            </div>
            <p className="text-sm text-zinc-400">
              Hero stills and short clips. Cycles ray tracing for photorealistic
              quality. 24 pipeline scripts, MCP-controlled.
              Utah desktop (RTX 2060) handles renders.
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-400 font-semibold">Three.js</span>
              <StatusBadge status="live" />
            </div>
            <p className="text-sm text-zinc-400">
              Real-time web preview. The production website runs Three.js
              for interactive flame visualization. Preview what renders
              will look like before committing GPU time.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Infrastructure">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 w-32 shrink-0">Virginia (laptop)</span>
            <span className="text-zinc-300">Brain. Plans, writes code, pushes to GitHub. Runs web dev, audio editing, content review.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 w-32 shrink-0">Utah (nepalt)</span>
            <span className="text-zinc-300">Hands. RTX 2060, Blender 4.5.8, Unity 2021.2.8f1. Pulls from GitHub, executes renders, uploads to R2.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 w-32 shrink-0">Vercel</span>
            <span className="text-zinc-300">Web hosting. Auto-deploys from GitHub master push. Production site.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 w-32 shrink-0">Cloudflare R2</span>
            <span className="text-zinc-300">Video storage. Rendered videos too large for git. Served to production site.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-zinc-500 w-32 shrink-0">Cloud GPU (planned)</span>
            <span className="text-zinc-300">On-demand rendering for large jobs. Unity batch mode on cloud VMs.</span>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function EnginesSection() {
  return (
    <>
      <SectionCard title="Unity — Video Production Engine">
        <div className="space-y-3 text-sm text-zinc-300">
          <p>Unity 2021.2.8f1 with real-time rendering. The scene plays in real-time while Unity Recorder captures every frame. This is orders of magnitude faster than offline ray tracing.</p>

          <h4 className="text-white font-medium mt-4">Scene Components</h4>
          <ul className="space-y-1 text-zinc-400 ml-4 list-disc">
            <li><strong className="text-zinc-300">StarNest Skybox</strong> — Procedural volumetric starfield shader (Shadertoy port). Params: iterations, volsteps, dark matter, scroll, rotation.</li>
            <li><strong className="text-zinc-300">Audio-Reactive Orbs</strong> — Particle systems (simple_rainbow, additive_rainbow, etc.) driven by FFT beat detection.</li>
            <li><strong className="text-zinc-300">Water4Advanced</strong> — Gerstner wave displacement with planar reflections.</li>
            <li><strong className="text-zinc-300">Unity Recorder</strong> — 360 equirectangular capture, stereo 65mm IPD, 8K output, audio included.</li>
          </ul>

          <h4 className="text-white font-medium mt-4">Audio Analysis (AudioAnalyzer.cs)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {[
              { band: 'Sub-bass', range: '20-60 Hz', drives: 'Background pulse' },
              { band: 'Bass', range: '60-250 Hz', drives: 'Orb scale' },
              { band: 'Low-mid', range: '250-500 Hz', drives: 'Color warmth' },
              { band: 'Mid', range: '500-2kHz', drives: 'Particle rate' },
              { band: 'Upper-mid', range: '2-4 kHz', drives: 'Glow intensity' },
              { band: 'Presence', range: '4-6 kHz', drives: 'Starfield speed' },
              { band: 'Brilliance', range: '6-12 kHz', drives: 'Sparkle' },
              { band: 'Air', range: '12-20 kHz', drives: 'Shimmer' },
            ].map((b) => (
              <div key={b.band} className="bg-white/5 rounded p-2">
                <div className="text-xs text-orange-400">{b.band}</div>
                <div className="text-xs text-zinc-500">{b.range}</div>
                <div className="text-xs text-zinc-400">{b.drives}</div>
              </div>
            ))}
          </div>

          <h4 className="text-white font-medium mt-4">Recording Modes</h4>
          <ul className="space-y-1 text-zinc-400 ml-4 list-disc">
            <li><strong className="text-zinc-300">360 Stereo</strong> — Full VR. YouTube VR + Meta Quest. Top-bottom eye layout, 65mm separation.</li>
            <li><strong className="text-zinc-300">360 Mono</strong> — 360 without stereo depth. Smaller files, still immersive.</li>
            <li><strong className="text-zinc-300">Flat</strong> — Standard 16:9 video. YouTube, social media.</li>
          </ul>
        </div>
      </SectionCard>

      <SectionCard title="Blender — Stills and Hero Clips">
        <div className="space-y-2 text-sm text-zinc-400">
          <p>Cycles GPU ray tracing on Utah (RTX 2060). Beautiful but slow — reserved for stills, thumbnails, and short showcase clips (under 10 seconds).</p>
          <p>24 pipeline scripts, 10 quality presets, MCP-controlled via Claude Code. Templates: fire, water, EDM, aurora, neon, solar, mist.</p>
        </div>
      </SectionCard>

      <SectionCard title="Three.js — Web Preview">
        <div className="space-y-2 text-sm text-zinc-400">
          <p>The production website at whatamiappreciatingnow.com runs real-time Three.js visualization. Same aesthetic concepts as Unity, running in the browser.</p>
          <p>Modes: Ethereal Flame, Mist, Solar Breath. Interactive — responds to user input in real-time.</p>
        </div>
      </SectionCard>
    </>
  );
}

function AutomationSection() {
  return (
    <>
      <SectionCard title="The Pipeline">
        <div className="space-y-4">
          {/* Flow diagram */}
          <div className="flex flex-col gap-2">
            {[
              { step: '1', label: 'Content Source', desc: 'Audio file arrives (manual, TTS, bot-generated)', status: 'planned' as const },
              { step: '2', label: 'render.sh', desc: './render.sh --audio file.wav --preset meditation --mode 360stereo', status: 'built' as const },
              { step: '3', label: 'Unity Batch Render', desc: 'Unity opens headless, loads preset, configures scene, plays audio, records video, exits', status: 'built' as const },
              { step: '4', label: 'ffmpeg Post-Process', desc: 'Inject VR spatial metadata (spherical=true, stereo_mode=top_bottom)', status: 'built' as const },
              { step: '5', label: 'Upload to R2', desc: 'Video stored in Cloudflare R2 cloud storage', status: 'planned' as const },
              { step: '6', label: 'YouTube Publish', desc: 'Upload via API/Chrome MCP with title, description, tags, thumbnail', status: 'planned' as const },
              { step: '7', label: 'Social Distribution', desc: 'Cross-post to platforms, generate engagement', status: 'idea' as const },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{item.label}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Key Scripts">
        <div className="space-y-3 text-sm">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-orange-400">AutoRecorder.cs</code>
              <StatusBadge status="built" />
            </div>
            <p className="text-zinc-400 text-xs">Unity Editor script. Headless batch recorder. Parses CLI args, loads audio from external path, configures Recorder API programmatically, enters Play Mode, records for audio duration, exits.</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-orange-400">AudioAnalyzer.cs</code>
              <StatusBadge status="built" />
            </div>
            <p className="text-zinc-400 text-xs">8-band FFT spectrum analyzer. Replaces single-bin AudioSpectrum. Sub-bass through air frequencies, onset detection, asymmetric smoothing (fast attack / slow decay).</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-orange-400">SceneConfigurator.cs</code>
              <StatusBadge status="planned" />
            </div>
            <p className="text-zinc-400 text-xs">Reads preset JSON, configures scene at runtime: swaps prefabs, materials, skybox, adjusts beat sensitivity, enables/disables water, positions extra objects.</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-orange-400">render.sh</code>
              <StatusBadge status="built" />
            </div>
            <p className="text-zinc-400 text-xs">Pipeline orchestrator. Chains: Unity batch render, ffmpeg VR metadata injection, output. One command = audio in, VR video out.</p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function PresetsSection() {
  const presets = [
    { name: 'meditation', desc: 'Soft orbs, slow pulse, calm starfield, gentle water', skybox: '1DarkWorld1', orb: 'simple_rainbow', water: true, sensitivity: 'Low', status: 'planned' as const },
    { name: 'edm', desc: 'Additive orbs, high beat sensitivity, CrazyFractal skybox', skybox: 'CrazyFractal_Hueshift', orb: 'additive_rainbow', water: true, sensitivity: 'High', status: 'planned' as const },
    { name: 'ambient', desc: 'Minimal orbs, deep space, no water, slow drift', skybox: 'HighQuality_Scroll', orb: 'simple_white', water: false, sensitivity: 'Minimal', status: 'planned' as const },
    { name: 'fire_cinema', desc: 'Warm palette, intense reactions, dramatic lighting', skybox: 'HighQuality', orb: 'additive_rainbow', water: true, sensitivity: 'Medium', status: 'planned' as const },
    { name: 'binaural_nature', desc: 'Birds with spatial audio, natural environment', skybox: '1DarkWorld1', orb: 'simple_rainbow', water: true, sensitivity: 'Low', status: 'idea' as const },
    { name: 'patreon_showcase', desc: 'Supporter names in firework particles behind viewer', skybox: 'HighQuality_Scroll', orb: 'textured_stylized', water: false, sensitivity: 'Medium', status: 'idea' as const },
  ];

  return (
    <>
      <SectionCard title="Visual Presets">
        <p className="text-sm text-zinc-400 mb-4">
          Each preset is a JSON file that controls the entire scene configuration.
          Pass <code className="text-orange-400">--preset name</code> to render.sh and
          SceneConfigurator applies it before recording starts.
        </p>
        <div className="space-y-3">
          {presets.map((p) => (
            <div key={p.name} className="bg-white/5 rounded-lg p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-orange-400 font-semibold">{p.name}</code>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-zinc-400 mb-3">{p.desc}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-zinc-500">Skybox:</span> <span className="text-zinc-300">{p.skybox}</span></div>
                <div><span className="text-zinc-500">Orb:</span> <span className="text-zinc-300">{p.orb}</span></div>
                <div><span className="text-zinc-500">Water:</span> <span className="text-zinc-300">{p.water ? 'Yes' : 'No'}</span></div>
                <div><span className="text-zinc-500">Sensitivity:</span> <span className="text-zinc-300">{p.sensitivity}</span></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Preset JSON Structure">
        <pre className="text-xs text-zinc-300 bg-black/30 rounded-lg p-4 overflow-x-auto">
{`{
  "name": "meditation",
  "orb_prefab": "simple_rainbow",
  "skybox_material": "1DarkWorld1",
  "water_enabled": true,
  "beat_sensitivity": 0.5,
  "color_palette": ["#00ffff", "#8b5cf6", "#ffffff"],
  "camera": { "mode": "static", "height": 1.6 },
  "audio_bands": {
    "bass_to_scale": 1.0,
    "mid_to_color": 0.8,
    "high_to_particles": 0.5
  },
  "recording": {
    "mode": "360stereo",
    "resolution": 4096,
    "framerate": 30,
    "stereo_separation": 0.065
  }
}`}
        </pre>
      </SectionCard>
    </>
  );
}

function FeaturesSection() {
  const features = [
    { name: 'Audio-Reactive Orbs', desc: 'Particle systems pulse with music. 8-band FFT drives scale, color, emission rate.', status: 'live' as const, engine: 'Unity' },
    { name: 'StarNest Skybox', desc: 'Procedural volumetric starfield. Multiple material presets (dark worlds, fractals, scrolling).', status: 'live' as const, engine: 'Unity' },
    { name: 'Water4 Ocean', desc: 'Gerstner wave displacement with planar reflections. Reflects orbs and skybox.', status: 'live' as const, engine: 'Unity' },
    { name: '360 VR Recording', desc: 'Equirectangular stereo capture via Unity Recorder. YouTube VR and Meta Quest compatible.', status: 'live' as const, engine: 'Unity' },
    { name: 'Headless Batch Render', desc: 'AutoRecorder.cs — CLI-driven, no GUI needed. Audio in, video out.', status: 'built' as const, engine: 'Unity' },
    { name: '8-Band Audio Analyzer', desc: 'AudioAnalyzer.cs — sub-bass through air, onset detection, asymmetric smoothing.', status: 'built' as const, engine: 'Unity' },
    { name: 'VR Metadata Injection', desc: 'ffmpeg tags videos with spherical/stereo metadata for headset players.', status: 'built' as const, engine: 'ffmpeg' },
    { name: 'Scene Preset System', desc: 'JSON presets configure entire scene: orbs, skybox, water, sensitivity, camera.', status: 'planned' as const, engine: 'Unity' },
    { name: 'Binaural Spatial Audio', desc: 'Unity 3D audio sources positioned in space. Sounds follow objects (birds, instruments).', status: 'planned' as const, engine: 'Unity' },
    { name: 'Flying Birds + Sound', desc: 'Bird prefabs on bezier path animations with spatial audio sources attached.', status: 'planned' as const, engine: 'Unity' },
    { name: 'Patreon Supporter Wall', desc: 'Look behind you: supporter names in firework particle effects, scaled by tier.', status: 'idea' as const, engine: 'Unity' },
    { name: '360 Video Projection', desc: 'Project pre-recorded 360 footage onto inverted sphere. Overlay CG elements.', status: 'idea' as const, engine: 'Unity' },
    { name: 'Cloud GPU Rendering', desc: 'Unity batch mode on cloud VMs for massive render jobs.', status: 'idea' as const, engine: 'Cloud' },
    { name: 'Auto YouTube Upload', desc: 'Chrome MCP or YouTube API for automated publishing with metadata.', status: 'planned' as const, engine: 'Jarvis' },
    { name: 'Content Bot Pipeline', desc: 'Bots scrape quotes/meditations, TTS generates audio, feeds render pipeline.', status: 'idea' as const, engine: 'Jarvis' },
  ];

  return (
    <SectionCard title="Feature Tracker">
      <div className="space-y-2">
        {features.map((f) => (
          <div key={f.name} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-medium">{f.name}</span>
                <StatusBadge status={f.status} />
                <span className="text-xs text-zinc-600">{f.engine}</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function CloudSection() {
  return (
    <>
      <SectionCard title="Can Unity Run on a Cloud VM?">
        <p className="text-sm text-zinc-300 mb-4">
          <strong className="text-white">Yes.</strong> Unity supports <code className="text-orange-400">-batchmode -nographics</code> which
          runs headless on any machine with a GPU. No monitor needed. This is exactly how game studios
          run build farms and render servers.
        </p>
        <div className="space-y-3">
          {[
            { provider: 'AWS EC2 g4dn.xlarge', gpu: 'NVIDIA T4 (16GB)', cost: '~$0.53/hr', note: 'Most popular for game dev. Spot instances can be $0.16/hr.' },
            { provider: 'Google Cloud (GCP)', gpu: 'NVIDIA T4/L4/A100', cost: '~$0.35-3.67/hr', note: 'T4 cheapest, A100 for massive jobs.' },
            { provider: 'Paperspace', gpu: 'Various (A4000, A5000)', cost: '~$0.45-1.10/hr', note: 'Built for GPU workloads. Simple setup.' },
            { provider: 'Vast.ai', gpu: 'Community GPUs', cost: '~$0.10-0.50/hr', note: 'Cheapest option. Marketplace model — rent idle GPUs.' },
            { provider: 'Lambda Cloud', gpu: 'A10, A100, H100', cost: '~$0.50-2.49/hr', note: 'AI-focused but works for Unity batch.' },
          ].map((p) => (
            <div key={p.provider} className="bg-white/5 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
              <div><span className="text-white font-medium">{p.provider}</span></div>
              <div className="text-zinc-400">{p.gpu}</div>
              <div className="text-emerald-400">{p.cost}</div>
              <div className="text-zinc-500 text-xs">{p.note}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Cost Estimate">
        <div className="text-sm text-zinc-300 space-y-2">
          <p>A 15-minute VR 360 video on a cloud T4 GPU: <strong className="text-white">~1-3 hours = $0.50-$1.60</strong></p>
          <p>Same video on Utah (RTX 2060, free): <strong className="text-white">~2-4 hours = $0</strong> but ties up the machine.</p>
          <p className="text-zinc-400">Cloud makes sense for: batch jobs (10+ videos), time-critical renders, or when Utah is busy with other work.</p>
        </div>
      </SectionCard>
    </>
  );
}

function RoadmapSection() {
  const phases = [
    { phase: '1', name: 'Foundation', desc: 'Unity project in git, AutoRecorder, AudioAnalyzer, render.sh', status: 'live' as const },
    { phase: '2', name: 'Preset System', desc: 'SceneConfigurator.cs + JSON presets. One command configures entire scene.', status: 'planned' as const },
    { phase: '3', name: 'Audio Wiring', desc: 'Wire AudioAnalyzer bands to visual elements. Replace AudioSpectrum in scene.', status: 'planned' as const },
    { phase: '4', name: 'Batch Mode Testing', desc: 'Validate AutoRecorder works headless on Utah. End-to-end test.', status: 'planned' as const },
    { phase: '5', name: 'New Visual Modes', desc: 'EDM preset, ambient preset, fire cinema. Skybox material swaps + color palettes.', status: 'planned' as const },
    { phase: '6', name: 'Spatial Audio', desc: 'Binaural setup. Bird flock prefab with path animation + 3D audio.', status: 'planned' as const },
    { phase: '7', name: 'Patreon Wall', desc: 'Supporter name particles. Read from JSON, position behind viewer.', status: 'idea' as const },
    { phase: '8', name: 'YouTube Automation', desc: 'Auto-upload with metadata, thumbnails, scheduling.', status: 'planned' as const },
    { phase: '9', name: 'Content Bot', desc: 'Scrape quotes/meditations, TTS audio generation, auto-feed pipeline.', status: 'idea' as const },
    { phase: '10', name: 'Cloud GPU', desc: 'Unity batch mode on cloud VMs for massive parallel rendering.', status: 'idea' as const },
  ];

  return (
    <SectionCard title="Implementation Roadmap">
      <div className="space-y-2">
        {phases.map((p) => (
          <div key={p.phase} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
            <div className="w-8 h-8 rounded-full bg-white/10 text-zinc-300 flex items-center justify-center text-sm font-bold shrink-0">
              {p.phase}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{p.name}</span>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
