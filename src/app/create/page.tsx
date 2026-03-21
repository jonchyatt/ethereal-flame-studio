'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NavShell } from '@/components/nav/NavShell';
import { OUTPUT_FORMATS, CATEGORY_LABELS, type OutputCategory } from '@/lib/render/renderApi';

type RenderEngine = 'webgl' | 'blender';
type RenderState = 'idle' | 'submitting' | 'queued' | 'rendering' | 'complete' | 'error';

interface BlenderStatus {
  connected: boolean;
  scene: Record<string, unknown> | null;
  hint?: string;
}

const BLENDER_TEMPLATES = [
  {
    id: 'fire',
    name: 'Mantaflow Fire',
    description: 'Volumetric fire simulation with Principled Volume material and Blackbody temperature coloring. Multi-scale turbulence, three-point lighting, cinematic DOF.',
    quality: 'Cinema',
    bakeRequired: true,
    estimateMinutes: { preview: 5, production: 45 },
    color: 'from-orange-600 to-red-600',
    borderColor: 'border-orange-500/30',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
  {
    id: 'water',
    name: 'Ocean Water',
    description: 'Ocean Modifier water surface with Glass BSDF refraction. Realistic wave dynamics, underwater caustics, foam generation.',
    quality: 'Cinema',
    bakeRequired: false,
    estimateMinutes: { preview: 3, production: 30 },
    color: 'from-blue-600 to-cyan-600',
    borderColor: 'border-blue-500/30',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  {
    id: 'combo',
    name: 'Fire Over Water',
    description: 'Fire orb hovering above reflective water surface with caustics, foam, and HDRI environment lighting. The signature Ethereal Flame look.',
    quality: 'Cinema+',
    bakeRequired: true,
    estimateMinutes: { preview: 8, production: 60 },
    color: 'from-purple-600 to-orange-600',
    borderColor: 'border-purple-500/30',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 20h18" />
      </svg>
    ),
  },
  {
    id: 'edm',
    name: 'EDM Light Show',
    description: 'Concert-venue volumetric lasers, LED grids, and beat-synced strobes in total darkness. No bake needed — instant setup.',
    quality: 'Cinema',
    bakeRequired: false,
    estimateMinutes: { preview: 2, production: 20 },
    color: 'from-pink-600 to-violet-600',
    borderColor: 'border-pink-500/30',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'luminous',
    name: 'Luminous Being',
    description: 'Transform a person silhouette into a glowing being of light with 4 effect layers. Requires mask sequence from video segmentation.',
    quality: 'Cinema+',
    bakeRequired: true,
    estimateMinutes: { preview: 10, production: 90 },
    color: 'from-amber-500 to-yellow-400',
    borderColor: 'border-amber-500/30',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function CreatePage() {
  const [engine, setEngine] = useState<RenderEngine>('blender');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('fire');
  const [blenderStatus, setBlenderStatus] = useState<BlenderStatus | null>(null);
  const [blenderChecking, setBlenderChecking] = useState(false);
  const [quality, setQuality] = useState<'draft' | 'preview' | 'production'>('preview');

  // WebGL state
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['flat-1080p-landscape']);
  const [renderState, setRenderState] = useState<RenderState>('idle');

  const checkBlender = useCallback(async () => {
    setBlenderChecking(true);
    try {
      const res = await fetch('/api/blender/status');
      const data = await res.json();
      setBlenderStatus(data);
    } catch {
      setBlenderStatus({ connected: false, scene: null, hint: 'Failed to check status' });
    } finally {
      setBlenderChecking(false);
    }
  }, []);

  useEffect(() => {
    checkBlender();
  }, [checkBlender]);

  const toggleFormat = (value: string) => {
    setSelectedFormats(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const categories = Object.keys(CATEGORY_LABELS) as OutputCategory[];
  const activeTemplate = BLENDER_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <NavShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Video</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Choose your render engine, pick a template, and produce publication-ready video.
          </p>
        </div>

        {/* Engine Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setEngine('webgl')}
            className={`
              relative rounded-xl border p-5 text-left transition-all
              ${engine === 'webgl'
                ? 'bg-white/8 border-emerald-500/40 ring-1 ring-emerald-500/20'
                : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${engine === 'webgl' ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                <svg className={`w-5 h-5 ${engine === 'webgl' ? 'text-emerald-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-white">Instant Preview</div>
                <div className="text-xs text-zinc-400">Three.js / WebGL</div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Real-time browser rendering. Good for previews, quick iterations. Seconds to render.
            </p>
            {engine === 'webgl' && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setEngine('blender')}
            className={`
              relative rounded-xl border p-5 text-left transition-all
              ${engine === 'blender'
                ? 'bg-white/8 border-orange-500/40 ring-1 ring-orange-500/20'
                : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${engine === 'blender' ? 'bg-orange-500/20' : 'bg-white/5'}`}>
                <svg className={`w-5 h-5 ${engine === 'blender' ? 'text-orange-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-white">Cinema Quality</div>
                <div className="text-xs text-zinc-400">Blender / Cycles</div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Photorealistic volumetric rendering. Fire, water, VFX, luminous beings. Minutes to hours.
            </p>
            {engine === 'blender' && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-orange-400" />
            )}
          </button>
        </div>

        {/* Blender Engine */}
        {engine === 'blender' && (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className={`
              rounded-xl border p-4 flex items-center justify-between
              ${blenderStatus?.connected
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
              }
            `}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${blenderStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <div>
                  <div className="text-sm font-medium text-white">
                    {blenderChecking ? 'Checking...' : blenderStatus?.connected ? 'Blender Connected' : 'Blender Not Connected'}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {blenderStatus?.connected
                      ? 'MCP bridge active — ready to render'
                      : blenderStatus?.hint || 'Open Blender with the MCP addon to enable cinema renders'
                    }
                  </div>
                </div>
              </div>
              <button
                onClick={checkBlender}
                disabled={blenderChecking}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {blenderChecking ? 'Checking...' : 'Refresh'}
              </button>
            </div>

            {/* Template Selection */}
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Cinema Templates</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {BLENDER_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`
                      relative rounded-xl border p-4 text-left transition-all
                      ${selectedTemplate === template.id
                        ? `bg-white/8 ${template.borderColor} ring-1 ring-white/10`
                        : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                        bg-gradient-to-br ${template.color} opacity-80
                      `}>
                        <div className="text-white">{template.icon}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white text-sm">{template.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">
                            {template.quality}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                          {template.bakeRequired && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                              Bake required
                            </span>
                          )}
                          <span>~{template.estimateMinutes.preview}m preview</span>
                          <span>~{template.estimateMinutes.production}m production</span>
                        </div>
                      </div>
                    </div>
                    {selectedTemplate === template.id && (
                      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white/60" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selector */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
              <h3 className="text-sm font-medium text-white">Render Settings</h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-16">Quality:</span>
                {(['draft', 'preview', 'production'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                      ${quality === q
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-white/5 text-zinc-400 border border-transparent hover:bg-white/8'
                      }
                    `}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {activeTemplate && (
                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2 border-t border-white/5">
                  <span>Template: <span className="text-zinc-300">{activeTemplate.name}</span></span>
                  <span>Est. time: <span className="text-zinc-300">
                    ~{quality === 'production'
                      ? activeTemplate.estimateMinutes.production
                      : activeTemplate.estimateMinutes.preview
                    } min
                  </span></span>
                  {activeTemplate.bakeRequired && (
                    <span className="text-amber-400/70">Simulation bake required</span>
                  )}
                </div>
              )}

              {/* Render Button */}
              <button
                disabled={!blenderStatus?.connected}
                className={`
                  w-full px-6 py-3.5 rounded-xl text-sm font-medium transition-all
                  ${blenderStatus?.connected
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/20'
                    : 'bg-white/8 text-zinc-500 cursor-not-allowed'
                  }
                `}
              >
                {blenderStatus?.connected
                  ? `Render ${activeTemplate?.name || 'Template'} (${quality})`
                  : 'Connect Blender to render'
                }
              </button>
              {!blenderStatus?.connected && (
                <p className="text-xs text-zinc-600 text-center">
                  Start Blender with the MCP addon, then click Refresh above
                </p>
              )}
            </div>
          </div>
        )}

        {/* WebGL Engine */}
        {engine === 'webgl' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
              <h3 className="text-sm font-medium text-white">WebGL Render</h3>
              <p className="text-xs text-zinc-400">
                Uses the Three.js engine from the Studio canvas. Design your look in the{' '}
                <a href="/" className="text-blue-400 hover:text-blue-300 underline">Studio designer</a>,
                then come back here to render.
              </p>

              {/* Output Formats */}
              <div className="space-y-3">
                {categories.map((category) => {
                  const formats = OUTPUT_FORMATS.filter(f => f.category === category);
                  if (formats.length === 0) return null;
                  return (
                    <div key={category}>
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                        {CATEGORY_LABELS[category]}
                      </h4>
                      <div className="space-y-1">
                        {formats.map((fmt) => (
                          <label
                            key={fmt.value}
                            className={`
                              flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm
                              ${selectedFormats.includes(fmt.value)
                                ? 'bg-white/8 text-white'
                                : 'text-zinc-400 hover:bg-white/4'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFormats.includes(fmt.value)}
                              onChange={() => toggleFormat(fmt.value)}
                              className="accent-emerald-500"
                            />
                            <span className="flex-1">{fmt.label}</span>
                            <span className="text-zinc-500 text-xs font-mono">{fmt.resolution}</span>
                            <span className="text-zinc-600 text-xs">~{fmt.estimateMinutes}m</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={selectedFormats.length === 0}
                className={`
                  w-full px-6 py-3.5 rounded-xl text-sm font-medium transition-all
                  ${selectedFormats.length > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-white/8 text-zinc-500 cursor-not-allowed'
                  }
                `}
              >
                {selectedFormats.length > 0
                  ? `Render ${selectedFormats.length} format${selectedFormats.length > 1 ? 's' : ''} (WebGL)`
                  : 'Select at least one format'
                }
              </button>
              <p className="text-xs text-zinc-600 text-center">
                Audio must be loaded in the Studio designer first
              </p>
            </div>
          </div>
        )}

        {/* Comparison */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <h3 className="text-sm font-medium text-white mb-3">Engine Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-white/5">
                  <th className="text-left py-2 pr-4 font-medium">Feature</th>
                  <th className="text-left py-2 px-4 font-medium">WebGL (Three.js)</th>
                  <th className="text-left py-2 pl-4 font-medium">Cinema (Blender)</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                <tr className="border-b border-white/3">
                  <td className="py-2 pr-4 text-zinc-300">Render time</td>
                  <td className="py-2 px-4 text-emerald-400">Seconds</td>
                  <td className="py-2 pl-4 text-amber-400">Minutes to hours</td>
                </tr>
                <tr className="border-b border-white/3">
                  <td className="py-2 pr-4 text-zinc-300">Fire quality</td>
                  <td className="py-2 px-4">Particle shader</td>
                  <td className="py-2 pl-4 text-emerald-400">Mantaflow volumetric</td>
                </tr>
                <tr className="border-b border-white/3">
                  <td className="py-2 pr-4 text-zinc-300">Water</td>
                  <td className="py-2 px-4">Reflective plane</td>
                  <td className="py-2 pl-4 text-emerald-400">Ocean sim + caustics</td>
                </tr>
                <tr className="border-b border-white/3">
                  <td className="py-2 pr-4 text-zinc-300">Lighting</td>
                  <td className="py-2 px-4">Basic</td>
                  <td className="py-2 pl-4 text-emerald-400">Path-traced + HDRI</td>
                </tr>
                <tr className="border-b border-white/3">
                  <td className="py-2 pr-4 text-zinc-300">VR output</td>
                  <td className="py-2 px-4 text-emerald-400">Yes (cubemap)</td>
                  <td className="py-2 pl-4 text-emerald-400">Yes (stereo equirect)</td>
                </tr>
                <tr className="border-b border-white/3">
                  <td className="py-2 pr-4 text-zinc-300">Audio reactive</td>
                  <td className="py-2 px-4 text-emerald-400">Real-time FFT</td>
                  <td className="py-2 pl-4 text-emerald-400">Keyframe mapping</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-zinc-300">Special effects</td>
                  <td className="py-2 px-4">Bloom, particles</td>
                  <td className="py-2 pl-4 text-emerald-400">Volumetric, lasers, luminous being</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </NavShell>
  );
}
