# Ethereal Flame Studio

**Phone to published video - 360° VR visual meditation creator**

## Overview

Create immersive 360° visual meditation videos with audio-reactive particle systems and skybox shaders. Phone-first workflow for on-the-go creation, server-side 8K rendering for VR headset quality.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **Three.js** - 3D rendering engine
- **React Three Fiber v9** - React renderer for Three.js
- **Drei v10** - Useful helpers for R3F
- **Zustand** - Lightweight state management
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components (TBD)
├── lib/              # Utilities and helpers (TBD)
└── types/            # TypeScript type definitions
```

## Development

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Type check**: `npx tsc --noEmit`

## License

MIT
