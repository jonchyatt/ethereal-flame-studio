# Phase 2 Research: Template System

**Project:** Ethereal Flame Studio
**Phase:** 02-Templates
**Researched:** 2026-01-27
**Overall Confidence:** HIGH

---

## Executive Summary

This research covers the template/preset system for Ethereal Flame Studio, addressing state serialization, persistence storage, thumbnail generation, and UI patterns. The existing codebase uses Zustand 5.x for state management with a well-defined `VisualModeConfig` type that maps cleanly to a serializable template format.

**Key findings:**
- Zustand's `persist` middleware with `partialize` is ideal for selective state serialization
- localStorage is sufficient for template storage (templates are small JSON, well under 5MB limit)
- Canvas screenshots require `preserveDrawingBuffer: true` on the WebGL renderer
- Grid-based card layouts with thumbnails are the standard UI pattern for template selectors

---

## 1. Zustand State Serialization Patterns

### Current State Structure Analysis

The existing `visualStore.ts` has this serializable state:

```typescript
interface VisualState {
  intensity: number;
  layers: ParticleLayerConfig[];
  skyboxPreset: StarNestPreset;
  skyboxRotationSpeed: number;
  currentMode: VisualMode;
  modeConfigs: Record<VisualMode, VisualModeConfig>;
  waterEnabled: boolean;
  waterColor: string;
  waterReflectivity: number;
  // ... actions (functions - NOT serializable)
}
```

**Serialization-safe fields:** All state values are primitives, arrays of primitives, or objects with primitive values. The `ParticleLayerConfig` and `StarNestPreset` types use numbers, strings, and arrays - all JSON-serializable.

**Non-serializable:** Actions (functions) must be excluded from templates.

### Recommended Template Schema

```typescript
interface VisualTemplate {
  id: string;                          // UUID
  name: string;                        // User-defined name
  description?: string;                // Optional description
  createdAt: number;                   // Unix timestamp
  updatedAt: number;                   // Unix timestamp
  thumbnail?: string;                  // Base64 data URL (JPEG, ~10-30KB)

  // Visual state (serializable subset)
  settings: {
    intensity: number;
    layers: ParticleLayerConfig[];
    skyboxPreset: StarNestPreset;
    skyboxRotationSpeed: number;
    currentMode: VisualMode;
    waterEnabled: boolean;
    waterColor: string;
    waterReflectivity: number;
  };
}
```

### Zustand Persist Middleware Pattern

**Confidence: HIGH** (verified via official Zustand documentation)

For template storage, create a separate store rather than persisting the main visual store:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TemplateStore {
  templates: VisualTemplate[];
  activeTemplateId: string | null;

  // Actions
  saveTemplate: (name: string, settings: TemplateSettings, thumbnail?: string) => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  updateTemplate: (id: string, updates: Partial<VisualTemplate>) => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],
      activeTemplateId: null,

      saveTemplate: (name, settings, thumbnail) => {
        const newTemplate: VisualTemplate = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          thumbnail,
          settings,
        };
        set((state) => ({
          templates: [...state.templates, newTemplate]
        }));
      },

      loadTemplate: (id) => {
        const template = get().templates.find(t => t.id === id);
        if (template) {
          // Apply to visualStore (external call)
          set({ activeTemplateId: id });
        }
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter(t => t.id !== id),
          activeTemplateId: state.activeTemplateId === id ? null : state.activeTemplateId,
        }));
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        }));
      },
    }),
    {
      name: 'ethereal-flame-templates',
      storage: createJSONStorage(() => localStorage),
      // partialize not needed - all state is serializable
    }
  )
);
```

### Partialize for Selective Persistence

If you want to persist only certain fields (excluding `activeTemplateId` for example):

```typescript
{
  name: 'ethereal-flame-templates',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ templates: state.templates }),
}
```

**Source:** [Zustand Persisting Store Data](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)

### Extracting Serializable State

To capture current visual state for a template:

```typescript
// In visualStore.ts, add a selector
export const selectSerializableState = (state: VisualState): TemplateSettings => ({
  intensity: state.intensity,
  layers: state.layers,
  skyboxPreset: state.skyboxPreset,
  skyboxRotationSpeed: state.skyboxRotationSpeed,
  currentMode: state.currentMode,
  waterEnabled: state.waterEnabled,
  waterColor: state.waterColor,
  waterReflectivity: state.waterReflectivity,
});

// Usage
const settings = useVisualStore(selectSerializableState);
```

---

## 2. Storage Comparison: localStorage vs IndexedDB

### Recommendation: localStorage

**Confidence: HIGH**

For template storage in Ethereal Flame Studio, **localStorage is the correct choice**.

### Size Analysis

| Storage | Limit | Our Needs |
|---------|-------|-----------|
| localStorage | 5-10MB per origin | ~50-100KB for 20 templates with thumbnails |
| IndexedDB | 50%+ of disk | Overkill for this use case |

**Template size estimate:**
- JSON settings: ~2-3KB per template
- Base64 thumbnail (150x150 JPEG, quality 0.6): ~5-15KB per template
- Total per template: ~10-20KB
- 50 templates: ~500KB-1MB (well under 5MB limit)

### Performance Comparison

| Aspect | localStorage | IndexedDB |
|--------|-------------|-----------|
| API | Synchronous, simple | Asynchronous, complex |
| Read speed | Fast for small data | Overhead for small reads |
| Write speed | Instant | Transaction overhead |
| Setup | None | Database/store creation required |
| Zustand integration | Native support | Requires custom storage |

### When to Consider IndexedDB

IndexedDB would only be needed if:
- Storing 100+ templates
- Storing high-resolution thumbnails (500KB+ each)
- Storing binary assets (audio files, 3D models)

None of these apply to Ethereal Flame Studio templates.

### IndexedDB Pattern (For Reference)

If IndexedDB is ever needed, use `idb-keyval` for simplicity:

```typescript
import { get, set, del } from 'idb-keyval';
import { StateStorage, createJSONStorage } from 'zustand/middleware';

const indexedDBStorage: StateStorage = {
  getItem: async (name) => (await get(name)) || null,
  setItem: async (name, value) => await set(name, value),
  removeItem: async (name) => await del(name),
};

// In persist config:
storage: createJSONStorage(() => indexedDBStorage),
```

**Source:** [idb-keyval GitHub](https://github.com/jakearchibald/idb-keyval) - 295 bytes for get/set, 573 bytes for all methods

**Source:** [LocalStorage vs IndexedDB Comparison](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5)

---

## 3. Canvas Thumbnail Generation

### React Three Fiber Screenshot Capture

**Confidence: HIGH** (verified via R3F discussions and Three.js documentation)

### Required Setup: preserveDrawingBuffer

The Canvas component MUST have `preserveDrawingBuffer: true` to capture screenshots:

```tsx
// In page.tsx or wherever Canvas is rendered
<Canvas
  gl={{
    preserveDrawingBuffer: true,  // CRITICAL for screenshots
    antialias: true,
    alpha: true,
  }}
>
  {/* Scene contents */}
</Canvas>
```

**Why this matters:** WebGL uses double-buffering. Without `preserveDrawingBuffer`, the drawing buffer is cleared after compositing, making `toDataURL()` return a black image.

### Screenshot Capture Hook

```typescript
import { useThree } from '@react-three/fiber';

export function useCanvasScreenshot() {
  const { gl, scene, camera } = useThree();

  const captureScreenshot = (
    width = 150,
    height = 150,
    quality = 0.6
  ): string => {
    // Force a render to ensure current state is drawn
    gl.render(scene, camera);

    // Capture full canvas
    const fullDataUrl = gl.domElement.toDataURL('image/jpeg', quality);

    // Resize to thumbnail dimensions
    return resizeToThumbnail(fullDataUrl, width, height);
  };

  return { captureScreenshot };
}

// Resize using offscreen canvas
function resizeToThumbnail(
  dataUrl: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Center crop to square
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      ctx.drawImage(img, sx, sy, size, size, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });
}
```

### Screenshot Component Pattern

Since `useThree` must be used inside the Canvas tree, create a component:

```tsx
// ScreenshotCapture.tsx
import { useThree } from '@react-three/fiber';
import { useImperativeHandle, forwardRef } from 'react';

export interface ScreenshotCaptureRef {
  capture: () => Promise<string>;
}

export const ScreenshotCapture = forwardRef<ScreenshotCaptureRef>((_, ref) => {
  const { gl, scene, camera } = useThree();

  useImperativeHandle(ref, () => ({
    capture: async () => {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.8);
      return resizeToThumbnail(dataUrl, 150, 150);
    },
  }));

  return null; // Invisible component
});

// Usage in parent:
const screenshotRef = useRef<ScreenshotCaptureRef>(null);

<Canvas gl={{ preserveDrawingBuffer: true }}>
  <ScreenshotCapture ref={screenshotRef} />
  {/* ... scene */}
</Canvas>

// On save template:
const thumbnail = await screenshotRef.current?.capture();
```

### Performance Considerations

1. **Use JPEG format** - PNG is larger and unnecessary for thumbnails
2. **Quality 0.6-0.7** - Balances file size (~10-20KB) with visual quality
3. **Resize before storing** - Don't store full-resolution screenshots
4. **Capture on demand** - Don't auto-capture every frame

**Source:** [React Three Fiber Screenshot Discussion](https://github.com/pmndrs/react-three-fiber/discussions/2054)

**Source:** [WebGL Tips - Screenshots](https://webglfundamentals.org/webgl/lessons/webgl-tips.html)

---

## 4. Template UI Best Practices

### Recommended UI Pattern: Grid of Cards with Thumbnails

**Confidence: HIGH** (standard pattern across design systems)

### Component Structure

```
TemplateManager/
  TemplateGallery/        # Grid container
    TemplateCard/         # Individual template with thumbnail
    CreateTemplateCard/   # "New template" button/card
  TemplateEditor/         # Modal for editing template details
  SaveTemplateDialog/     # Modal for saving current state
```

### TemplateGallery Component

```tsx
// TemplateGallery.tsx
interface TemplateGalleryProps {
  templates: VisualTemplate[];
  activeTemplateId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onCreateNew: () => void;
}

export function TemplateGallery({
  templates,
  activeTemplateId,
  onSelect,
  onDelete,
  onEdit,
  onCreateNew,
}: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
      {/* Create New Card */}
      <button
        onClick={onCreateNew}
        className="
          aspect-square rounded-lg
          border-2 border-dashed border-white/30
          hover:border-white/50 hover:bg-white/5
          flex flex-col items-center justify-center gap-2
          text-white/60 hover:text-white/80
          transition-all
        "
      >
        <PlusIcon className="w-8 h-8" />
        <span className="text-sm">Save Current</span>
      </button>

      {/* Template Cards */}
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isActive={template.id === activeTemplateId}
          onSelect={() => onSelect(template.id)}
          onDelete={() => onDelete(template.id)}
          onEdit={() => onEdit(template.id)}
        />
      ))}
    </div>
  );
}
```

### TemplateCard Component

```tsx
// TemplateCard.tsx
interface TemplateCardProps {
  template: VisualTemplate;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function TemplateCard({
  template,
  isActive,
  onSelect,
  onDelete,
  onEdit,
}: TemplateCardProps) {
  return (
    <div
      className={`
        relative aspect-square rounded-lg overflow-hidden
        border-2 transition-all cursor-pointer
        ${isActive
          ? 'border-blue-500 ring-2 ring-blue-500/50'
          : 'border-white/20 hover:border-white/40'
        }
      `}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      {template.thumbnail ? (
        <img
          src={template.thumbnail}
          alt={template.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50" />
      )}

      {/* Overlay with name */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-white text-sm font-medium truncate">
          {template.name}
        </p>
      </div>

      {/* Action buttons */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1 rounded bg-black/50 hover:bg-black/70 text-white"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded bg-black/50 hover:bg-red-600/70 text-white"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-1 left-1 px-2 py-0.5 rounded bg-blue-500 text-white text-xs">
          Active
        </div>
      )}
    </div>
  );
}
```

### Built-in Preset Cards

Built-in presets should be visually distinct:

```tsx
interface BuiltInPreset {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // Static import or bundled asset
  settings: TemplateSettings;
}

// Render built-in presets first, in a separate section
<div className="mb-4">
  <h3 className="text-white/60 text-sm mb-2">Built-in Presets</h3>
  <div className="grid grid-cols-3 gap-2">
    {BUILT_IN_PRESETS.map(preset => (
      <BuiltInPresetCard key={preset.id} preset={preset} />
    ))}
  </div>
</div>

<div>
  <h3 className="text-white/60 text-sm mb-2">Your Templates</h3>
  <TemplateGallery templates={userTemplates} ... />
</div>
```

### Mobile-Friendly Considerations

Following existing `ControlPanel.tsx` patterns:

1. **Touch targets:** Min 44px height/width for buttons
2. **Collapsible panel:** Template gallery in expandable section
3. **Swipe gestures:** Consider horizontal scroll for mobile
4. **Modal dialogs:** Use portals for save/edit dialogs to avoid z-index issues

**Source:** [React Design Patterns 2025](https://www.uxpin.com/studio/blog/react-design-patterns/)

**Source:** [CoreUI React Cards](https://coreui.io/react/docs/components/card/)

---

## 5. Built-in Curated Presets (4-6)

### Recommended Preset Collection

Based on existing `ETHEREAL_FLAME_CONFIG` and `ETHEREAL_MIST_CONFIG`:

| Preset | Description | Based On |
|--------|-------------|----------|
| Ethereal Flame | Default warm fire orb | Existing config |
| Ethereal Mist | Soft cloud-like particles | Existing config |
| Cosmic Void | Deep space, minimal particles | DarkWorld1 skybox, reduced layers |
| Solar Flare | High-energy, reactive | High audioReactivity, warm colors |
| Aurora | Cool blues/greens, flowing | Green/cyan palette, mist-like |
| Neon Pulse | Vibrant, synthwave aesthetic | High saturation, fast response |

### Implementation Approach

```typescript
// presets/builtInPresets.ts
export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    id: 'builtin-ethereal-flame',
    name: 'Ethereal Flame',
    description: 'Fiery orb with warm center and orange edges',
    thumbnail: '/presets/ethereal-flame.jpg', // Static asset
    settings: {
      intensity: 1.0,
      layers: ETHEREAL_FLAME_CONFIG.layers,
      skyboxPreset: STAR_NEST_PRESETS.find(p => p.key === 'darkWorld1')!,
      skyboxRotationSpeed: 0.5,
      currentMode: 'etherealFlame',
      waterEnabled: false,
      waterColor: '#0a1828',
      waterReflectivity: 0.4,
    },
  },
  // ... more presets
];
```

### Generating Preset Thumbnails

During development:
1. Set up each preset manually
2. Capture screenshot using the ScreenshotCapture component
3. Save as static asset in `/public/presets/`
4. Reference in built-in preset definitions

---

## 6. Advanced Parameter Editor

### Recommendation: Collapsible Parameter Groups

```tsx
// AdvancedEditor.tsx
export function AdvancedEditor() {
  return (
    <div className="space-y-2">
      <ParameterGroup title="Particle Layers">
        {layers.map(layer => (
          <LayerEditor key={layer.id} layer={layer} />
        ))}
      </ParameterGroup>

      <ParameterGroup title="Skybox">
        <SkyboxPresetPicker />
        <SliderParam label="Rotation Speed" ... />
      </ParameterGroup>

      <ParameterGroup title="Water">
        <ToggleParam label="Enable Water" ... />
        <ColorParam label="Water Color" ... />
        <SliderParam label="Reflectivity" ... />
      </ParameterGroup>
    </div>
  );
}

// ParameterGroup with accordion behavior
function ParameterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex justify-between items-center bg-white/5 hover:bg-white/10"
      >
        <span className="text-white/80 font-medium">{title}</span>
        <ChevronIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Recommendations

### Phase 2 Task Breakdown

| Task | Complexity | Dependencies |
|------|------------|--------------|
| TPL-01: Save template | Low | TemplateStore, ScreenshotCapture |
| TPL-02: Load template | Low | TemplateStore, VisualStore integration |
| TPL-03: Built-in presets | Low | Static assets, preset definitions |
| TPL-04: Advanced editor | Medium | ParameterGroup components, LayerEditor |
| TPL-05: Persistence | Low | Already handled by Zustand persist |
| TPL-06: Template UI | Medium | TemplateGallery, TemplateCard |

### Suggested Order

1. **TPL-05** - Set up TemplateStore with persist middleware (foundation)
2. **TPL-03** - Create built-in presets (provides test data)
3. **TPL-06** - Build TemplateGallery UI (visual feedback)
4. **TPL-01** - Implement save with screenshot capture
5. **TPL-02** - Implement load (apply template to visualStore)
6. **TPL-04** - Advanced editor (enhancement)

### Required Changes to Existing Code

1. **Canvas component** - Add `gl={{ preserveDrawingBuffer: true }}`
2. **ControlPanel** - Add template section/panel
3. **page.tsx** - Add ref for ScreenshotCapture component

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Zustand persist patterns | HIGH | Official docs verified |
| localStorage vs IndexedDB | HIGH | Template size well under limits |
| Canvas screenshot | HIGH | R3F discussions + Three.js docs verified |
| UI patterns | HIGH | Standard React patterns, matches existing code style |
| Built-in presets | MEDIUM | Based on existing configs, needs visual tuning |

---

## Sources

### Zustand
- [Persisting Store Data - Official Docs](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [Persist Middleware - Official Docs](https://zustand.docs.pmnd.rs/middlewares/persist)
- [Zustand GitHub Discussions](https://github.com/pmndrs/zustand/discussions/1721)

### Storage
- [LocalStorage vs IndexedDB Guide](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5)
- [idb-keyval GitHub](https://github.com/jakearchibald/idb-keyval)
- [RxDB Storage Comparison](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)

### Canvas/Screenshots
- [React Three Fiber Canvas Screenshot Discussion](https://github.com/pmndrs/react-three-fiber/discussions/2054)
- [WebGL Fundamentals - Tips](https://webglfundamentals.org/webgl/lessons/webgl-tips.html)
- [MDN toDataURL](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL)

### UI Patterns
- [React Design Patterns 2025 - UXPin](https://www.uxpin.com/studio/blog/react-design-patterns/)
- [CoreUI React Cards](https://coreui.io/react/docs/components/card/)
- [React Grid Gallery](https://benhowell.github.io/react-grid-gallery/)
