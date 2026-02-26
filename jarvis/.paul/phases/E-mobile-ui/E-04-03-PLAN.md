---
phase: E-mobile-ui
plan: 04-03
type: execute
wave: 1
depends_on: ["E-04-01", "E-04-02"]
files_modified:
  - src/components/jarvis/primitives/Input.tsx
  - src/components/jarvis/primitives/Toggle.tsx
  - src/components/jarvis/primitives/Sheet.tsx
  - src/components/jarvis/primitives/Toast.tsx
  - src/components/jarvis/primitives/index.ts
  - src/components/jarvis/layout/ChatOverlay.tsx
  - src/components/jarvis/layout/ToastContainer.tsx
  - src/components/jarvis/layout/JarvisShell.tsx
  - src/components/jarvis/layout/index.ts
  - src/lib/jarvis/stores/toastStore.ts
autonomous: true
---

<objective>
## Goal
Build the 4 remaining UI primitives (Input, Toggle, Sheet, Toast) with craft-level micro-interactions, and migrate the existing ChatPanel into a beautifully animated responsive ChatOverlay — making Jarvis feel alive and tactile.

## Purpose
The shell (E-04-01) and Priority Home (E-04-02) are visual but static. This plan makes the app *feel* premium: every toggle snaps with satisfying spring physics, the chat overlay glides up with buttery momentum, messages cascade in with staggered reveals, typing pulses with organic rhythm, and toasts slide in with progress countdowns. After this plan, tapping the Chat tab produces a genuinely delightful interaction.

## Output
- 4 primitive components completing the full primitive set (8/8) — each with polished animations
- ChatOverlay responsive component with real drag-to-dismiss, message animations, rich typing indicator
- Toast system with progress bar countdown, swipe-to-dismiss, stacked entrance animations
- JarvisShell updated to mount ChatOverlay + ToastContainer
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work (genuine dependency)
@.paul/phases/E-mobile-ui/E-04-01-SUMMARY.md — Shell layout, primitives pattern, shellStore (isChatOpen, toggleChat)
@.paul/phases/E-mobile-ui/E-04-02-SUMMARY.md — Home composites, homeStore, DomainIcon pattern

## Source Files
@src/components/jarvis/ChatPanel.tsx — Existing chat panel to migrate (SSE logic, message bubbles, quick actions)
@src/lib/jarvis/stores/chatStore.ts — Chat message state (messages, isTyping, activeTool)
@src/lib/jarvis/stores/shellStore.ts — Shell state (isChatOpen, toggleChat, closeChat)
@src/components/jarvis/layout/JarvisShell.tsx — Shell root (mount point for ChatOverlay + ToastContainer)
@src/components/jarvis/layout/BottomTabBar.tsx — Chat tab already wired to shellStore.toggleChat
@src/components/jarvis/primitives/Button.tsx — Pattern reference for primitive structure
@src/components/jarvis/primitives/index.ts — Barrel export to update

## Design Reference
@.paul/research/phase-e-ui-system-design.md — Primitive specs (Input lines 298-307, Toggle 348-353, Sheet 367-373, Toast 401-406)
@.paul/research/phase-e-information-architecture.md — Chat as contextual overlay (Section 6), Z-index layer map
</context>

<acceptance_criteria>

## AC-1: Input primitive is polished and functional
```gherkin
Given the Input component is imported
When rendered with type="text", placeholder, icon, and value/onChange
Then it displays a glassmorphism text field with correct size (sm/md), left icon positioning, and disabled state
When the input receives focus
Then the border transitions to cyan-500/50 with a subtle outer glow (box-shadow ring-2 ring-cyan-500/20) that fades in over 200ms
When the input has an icon and the icon receives a search query
Then the icon color transitions from white/40 to cyan-400 while the input is focused
```

## AC-2: Toggle primitive has spring-physics animation
```gherkin
Given the Toggle component is imported
When toggled from off to on
Then the thumb slides right with spring overshoot easing (cubic-bezier(0.34, 1.56, 0.64, 1)), the track color transitions from zinc-700 to cyan-600, and the thumb briefly scales to 110% at the midpoint before settling
When toggled from on to off
Then the same spring animation plays in reverse
When disabled
Then the toggle is visually muted (opacity-40) and non-interactive
```

## AC-3: Sheet primitive has real gesture support
```gherkin
Given the Sheet component is imported and open=true on mobile
When the user touches the drag handle and drags downward
Then the sheet follows the finger position in real-time (touch tracking via onTouchStart/Move/End)
When the drag exceeds 30% of sheet height (velocity-aware — fast flick also dismisses)
Then the sheet animates closed and onClose is called
When the drag is released below 30% threshold (slow release)
Then the sheet springs back to its open position
When open=true on desktop
Then it displays as a centered modal with scale-up entrance (scale-95 opacity-0 → scale-100 opacity-100) and scrim fade-in
When Escape is pressed or scrim is clicked
Then onClose is called with exit animation playing before unmount
```

## AC-4: Toast system has progress bar and stacking
```gherkin
Given the Toast primitive and toastStore exist
When toastStore.addToast({ variant: 'success', message: 'Task done' }) is called
Then a toast slides down from top-center with spring easing, showing a success icon (green), message, and a thin progress bar at the bottom that animates from 100% to 0% width over the duration
When a second toast is added while the first is visible
Then both toasts stack vertically with 8px gap, the older toast scales down slightly (scale-95, opacity-80) as the new one enters
When a toast's progress bar reaches 0%
Then the toast slides up and fades out with 200ms ease-in
When the user swipes a toast horizontally (touch drag)
Then the toast follows the finger, and if released past 50% viewport width, it flies off-screen and dismisses
```

## AC-5: ChatOverlay opens beautifully from BottomTabBar
```gherkin
Given the user is on any page in the new shell (/jarvis/app/*)
When the Chat tab in BottomTabBar is tapped (mobile)
Then a scrim fades in (200ms) followed by the chat sheet sliding up from bottom with spring easing (300ms cubic-bezier(0.34, 1.56, 0.64, 1)), revealing a drag handle, header, message area, quick actions, and input
When the chat overlay is open and contains no messages
Then quick action chips are displayed centered with staggered fade-in (each chip 50ms after the previous)
When a message is typed and sent
Then the user bubble slides in from the right (200ms), followed by a typing indicator (3 animated bouncing dots with staggered 150ms delays), followed by the assistant response sliding in from the left
When the user drags the drag handle downward past 30% (or flicks quickly)
Then the overlay slides down with momentum-matched easing and isChatOpen becomes false
When the close button (X) is tapped
Then the overlay slides down smoothly (250ms ease-in) and dismisses
```

## AC-6: ChatOverlay works beautifully on desktop
```gherkin
Given the user is on desktop (md+ breakpoint)
When shellStore.toggleChat() is triggered (Cmd+Shift+C or Ctrl+Shift+C)
Then a right sidebar panel (400px) slides in from the right with spring easing (300ms), with a subtle shadow glow on the left edge
When the panel is open
Then main content remains visible and usable alongside the panel (no scrim on desktop)
When messages stream in
Then each message bubble has a subtle fade-slide entrance animation (opacity-0 translateY(8px) → opacity-1 translateY(0))
```

## AC-7: Build compiles without new errors
```gherkin
Given all new files are created and existing files modified
When npx tsc --noEmit is run
Then zero new TypeScript errors are introduced (pre-existing audio-prep errors only)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Build 4 remaining primitives with craft-level polish</name>
  <files>
    src/components/jarvis/primitives/Input.tsx,
    src/components/jarvis/primitives/Toggle.tsx,
    src/components/jarvis/primitives/Sheet.tsx,
    src/components/jarvis/primitives/Toast.tsx,
    src/components/jarvis/primitives/index.ts
  </files>
  <action>
    Create 4 primitive components following the established pattern (see Button.tsx for structure). Each must feel premium.

    **Input.tsx:**
    - Props: type ('text' | 'search' | 'number'), size ('sm' | 'md'), placeholder, icon (ReactNode, left-positioned), suffix (ReactNode, right-positioned), value, onChange, disabled, className
    - Use forwardRef for ref forwarding (other components need to focus the input programmatically)
    - Extend InputHTMLAttributes (omit size to avoid conflict with our size prop)
    - Base: bg-white/5 text-white rounded-xl border border-white/10 placeholder:text-white/30 disabled:opacity-50 w-full
    - sm: px-3 py-2 text-xs | md: px-4 py-2.5 text-sm
    - Icon: absolutely positioned left-3 top-1/2 -translate-y-1/2, default text-white/40; add pl-10 to input when icon present
    - Suffix: absolutely positioned right-3 top-1/2 -translate-y-1/2
    - **Focus polish:** On focus, border transitions to cyan-500/50 AND add a soft outer glow via ring: `focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none`. The transition should feel smooth — use `transition-all duration-200`. The icon (if present) should also transition to text-cyan-400 on input focus — achieve this with a peer pattern: input gets `peer` class, icon wrapper gets `peer-focus:text-cyan-400 transition-colors duration-200`
    - Avoid: uncontrolled input patterns. This is always controlled (value + onChange).

    **Toggle.tsx:**
    - Props: checked, onChange, disabled, size ('sm' | 'md')
    - Render as `<button>` with role="switch" and aria-checked={checked} for accessibility
    - Track: rounded-full, off=bg-zinc-700, on=bg-cyan-600
    - Thumb: rounded-full shadow-md, off=bg-zinc-400, on=bg-white
    - md: track w-10 h-6, thumb w-5 h-5 (inset 0.5 from track edge with absolute positioning) | sm: track w-8 h-5, thumb w-4 h-4
    - **Spring animation:** Use `transition-all duration-200` with `cubic-bezier(0.34, 1.56, 0.64, 1)` as the timing function (spring overshoot). Apply via inline style `transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)` since Tailwind doesn't support custom cubic-bezier natively
    - **Scale pop:** When toggling, the thumb should scale to 110% at midpoint then settle. Achieve with: the thumb gets `scale-110` applied via a brief intermediate state — OR simpler: use the spring cubic-bezier which naturally creates an overshoot effect on the translate, giving the illusion of a pop. The cubic-bezier(0.34, 1.56, 0.64, 1) overshoot IS the pop — no extra scale state needed
    - Thumb position: off = `left-0.5` (or translateX(2px)), on = `left-[calc(100%-1.25rem-2px)]` for md / `left-[calc(100%-1rem-2px)]` for sm. Use translateX for smoother GPU-accelerated animation: off = `translateX(2px)`, on = `translateX(calc(var(--track-w) - var(--thumb-w) - 2px))`. Simplest approach: off = `translate-x-0.5`, on = `translate-x-[1.125rem]` for md / `translate-x-[0.8125rem]` for sm
    - Disabled: opacity-40, pointer-events-none
    - Avoid: checkbox input pattern — button gives us full visual control

    **Sheet.tsx:**
    - Props: open, onClose, size ('sm' | 'md' | 'lg' | 'full'), children, title
    - Uses internal `isVisible` state to manage mount/unmount animation lifecycle — when open goes true, set isVisible=true immediately, then apply enter animation. When open goes false, play exit animation, THEN set isVisible=false to unmount.
    - Use `useEffect` watching `open` to manage animation states with a timeout matching the animation duration

    Mobile (below md breakpoint) — Bottom Sheet:
    - Container: fixed inset-x-0 bottom-0 z-[70] (above scrim)
    - Surface: bg-zinc-900 border-t border-white/10 rounded-t-2xl overflow-hidden
    - Drag handle: `<div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />`
    - Height by size: sm=max-h-[40vh], md=max-h-[60vh], lg=max-h-[80vh], full=h-[90vh]
    - Title (if provided): px-4 pb-3 text-white/90 font-medium text-sm border-b border-white/10
    - Children: overflow-y-auto flex-1
    - Enter: translateY(100%) → translateY(0) over 300ms with cubic-bezier(0.34, 1.56, 0.64, 1) (spring)
    - Exit: translateY(0) → translateY(100%) over 250ms ease-in

    **Real drag-to-dismiss gesture (mobile only):**
    - onTouchStart on drag handle (or entire sheet header area): capture startY = touch.clientY, store in ref
    - onTouchMove: calculate deltaY = currentY - startY. If deltaY > 0 (dragging down), apply `transform: translateY(${deltaY}px)` directly to the sheet element via ref. Set transition to 'none' during drag for instant response. Also scale the scrim opacity proportionally: `opacity = 1 - (deltaY / sheetHeight)`
    - onTouchEnd: calculate velocity (deltaY / time since touchStart). If deltaY > 30% of sheet height OR velocity > 0.5px/ms (fast flick), call onClose() with exit animation. Otherwise, spring back to translateY(0) with 300ms spring easing.
    - Use refs (not state) for touch tracking to avoid re-renders during drag — only update the DOM via element.style

    Desktop (md+ breakpoint) — Centered Modal:
    - Overlay: fixed inset-0 z-[70] flex items-center justify-center
    - Content: bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden
    - Width by size: sm=max-w-sm, md=max-w-md, lg=max-w-lg, full=max-w-2xl
    - Title header: same as mobile
    - Enter: scale(0.95) opacity(0) → scale(1) opacity(1) over 200ms ease-out
    - Exit: scale(1) opacity(1) → scale(0.95) opacity(0) over 150ms ease-in

    Scrim (both):
    - fixed inset-0 bg-black/50 z-[65]
    - Enter: opacity 0 → 1 over 200ms
    - Exit: opacity 1 → 0 over 200ms
    - Click → onClose()

    Accessibility:
    - role="dialog" aria-modal="true" on the content container
    - aria-labelledby pointing to title element (use useId() for unique ID)
    - Escape key closes: useEffect with keydown listener, only when open
    - Focus trap: on open, focus the first focusable element inside; on close, restore focus to previously focused element

    **Toast.tsx:**
    - Props: variant ('success' | 'error' | 'info'), message, action ({ label, onClick }), duration (number, for progress bar), onDismiss
    - This is a PRESENTATIONAL component — positioning and lifecycle managed by ToastContainer
    - Layout: flex items-start gap-3 — icon on left, message + action on right, X dismiss on far right
    - Surface: bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl min-w-[300px] max-w-[420px]
    - Left accent: border-l-4 — success=border-green-500, error=border-red-500, info=border-cyan-500
    - Icons: lucide-react — CheckCircle2 (green-400) for success, AlertCircle (red-400) for error, Info (cyan-400) for info. Size w-5 h-5, mt-0.5 to align with text
    - Message: text-white/90 text-sm leading-relaxed flex-1
    - Action button (optional): text-cyan-400 hover:text-cyan-300 text-sm font-medium ml-auto whitespace-nowrap transition-colors
    - Dismiss X: absolute top-2 right-2, lucide X icon w-3.5 h-3.5 text-white/30 hover:text-white/60 transition-colors
    - **Progress bar:** At the bottom of the toast, a thin (h-0.5) bar that starts at width 100% and animates to 0% over `duration` ms. Color matches variant accent: green-500/error-500/cyan-500 with opacity 40%. Use CSS animation: `@keyframes shrink { from { width: 100% } to { width: 0% } }` applied via inline style `animation: shrink ${duration}ms linear forwards`. Render this as a div absolutely positioned bottom-0 left-0 inside the toast (rounded-b-xl to match container)
    - **Swipe-to-dismiss (touch):** onTouchStart/Move/End on the toast — track horizontal deltaX. Apply translateX(deltaX) during drag. If |deltaX| > 50% of toast width on release, dismiss. Otherwise spring back. Same ref-based approach as Sheet drag.
    - Avoid: managing timers — that's toastStore's responsibility. The progress bar animation is purely visual CSS.

    **Update index.ts barrel:**
    - Add exports: Input, Toggle, Sheet, Toast
    - Final barrel: Button, Card, Badge, Skeleton, Input, Toggle, Sheet, Toast
  </action>
  <verify>npx tsc --noEmit — filter output for new file names, confirm zero errors from these files</verify>
  <done>AC-1, AC-2, AC-3, AC-4 satisfied: All 4 primitives compile with spring animations, drag gestures, progress bars, and focus polish</done>
</task>

<task type="auto">
  <name>Task 2: Build ChatOverlay with message animations + Toast system</name>
  <files>
    src/components/jarvis/layout/ChatOverlay.tsx,
    src/components/jarvis/layout/ToastContainer.tsx,
    src/lib/jarvis/stores/toastStore.ts
  </files>
  <action>
    **ChatOverlay.tsx — The crown jewel of this plan.**
    Migrate chat from ChatPanel.tsx into a responsive overlay that feels like a premium native app.

    **State wiring:**
    - Read `useShellStore(s => s.isChatOpen)` and `useShellStore(s => s.closeChat)` for open/close
    - Import message logic from chatStore: messages, isTyping, activeTool, addMessage, updateMessage, setIsTyping, setActiveTool
    - Import postJarvisAPI from existing api/fetchWithAuth
    - Keep the EXACT same SSE streaming logic from ChatPanel.sendMessage (lines 60-149 of ChatPanel.tsx) — do NOT rewrite the streaming code, copy it faithfully. This is battle-tested.
    - Keep the EXACT same QUICK_ACTIONS array from ChatPanel

    **Mobile layout (below md) — Bottom Sheet Chat:**
    - Scrim: fixed inset-0 bg-black/30 z-[54], fade-in 200ms. Click → closeChat(). Only on mobile.
    - Container: fixed inset-x-0 bottom-0 z-[55], h-[70vh]
    - Surface: bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl
    - Enter: translateY(100%) → translateY(0) over 300ms with cubic-bezier(0.34, 1.56, 0.64, 1)
    - Exit: translateY(0) → translateY(100%) over 250ms ease-in
    - Drag handle: w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2

    **Real drag-to-dismiss (mobile) — same pattern as Sheet:**
    - Touch tracking on the drag handle area (the top ~40px of the overlay)
    - onTouchStart: capture startY, set dragging=true, remove CSS transition during drag
    - onTouchMove: deltaY = currentY - startY. Only track downward (deltaY > 0). Apply translateY(deltaY) to overlay container via ref. Scale scrim opacity: `Math.max(0, 1 - deltaY / (sheetHeight * 0.5))`
    - onTouchEnd: calculate velocity. If deltaY > 30% of height OR velocity > 0.5px/ms → closeChat(). Else spring back with 300ms spring cubic-bezier.
    - Use refs for all touch state. No React state during drag.

    **Desktop layout (md+) — Right Sidebar Panel:**
    - Container: fixed right-0 top-14 bottom-0 w-[400px] z-[55]
    - Surface: bg-zinc-900/95 backdrop-blur-xl border-l border-white/10
    - Enter: translateX(100%) → translateX(0) over 300ms with cubic-bezier(0.34, 1.56, 0.64, 1)
    - Exit: translateX(0) → translateX(100%) over 250ms ease-in
    - Left edge glow: add a subtle `shadow-[-8px_0_24px_-4px_rgba(6,182,212,0.08)]` on the container for a faint cyan bleed
    - NO scrim on desktop — content coexists with the panel

    **Internal structure (top to bottom):**

    1. **Header row:** flex items-center justify-between px-4 py-3 border-b border-white/10
       - "Chat with Jarvis" — text-white/90 text-sm font-medium
       - Close button: lucide X icon, w-5 h-5, text-white/40 hover:text-white/70 transition-colors, onClick=closeChat()

    2. **Message area:** flex-1 overflow-y-auto px-4 py-3 space-y-3
       - Smooth scroll behavior: `scroll-behavior: smooth` on the container
       - Auto-scroll to bottom on new messages (messagesEndRef pattern from ChatPanel)

       **Empty state (no messages):**
       - Centered vertically in the space
       - Subtle Jarvis icon or greeting: text-white/20 text-center
       - "Ask me anything about your tasks, habits, or schedule." — text-white/40 text-sm mb-4
       - Quick action chips with **staggered entrance animation:** each chip fades in and slides up (translateY(8px) → 0, opacity 0 → 1) with a 50ms stagger delay per chip. Implement with inline style `animationDelay: ${index * 50}ms` on each chip, using a CSS keyframe animation.
       - Chip styling: same as ChatPanel (px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-cyan-400/80 rounded-full border border-white/10 transition-colors)

       **Message bubbles with entrance animation:**
       Each message bubble gets a CSS animation on mount:
       - User messages: slide in from right — `opacity: 0; transform: translateX(12px)` → `opacity: 1; transform: translateX(0)` over 200ms ease-out
       - Assistant messages: slide in from left — `opacity: 0; transform: translateX(-12px)` → `opacity: 1; transform: translateX(0)` over 200ms ease-out
       - Use a `data-animate` attribute or className that triggers the animation on first render. The trick: add the animation class in a useEffect after mount, or use CSS `animation` with `animation-fill-mode: both` so it auto-plays once.
       - Bubble styling preserved from ChatPanel: user = bg-cyan-600/80 text-white rounded-2xl rounded-br-md, assistant = bg-white/5 text-white/90 rounded-2xl rounded-bl-md
       - Max width: max-w-[80%]

       **Typing indicator (replaces the plain "..." text):**
       When isTyping is true AND the current streaming message content is empty, show a custom typing indicator:
       - Three dots in a row, each 6px (w-1.5 h-1.5) rounded-full bg-white/40
       - Each dot bounces with a staggered animation: translateY(0) → translateY(-4px) → translateY(0) over 600ms infinite, with 150ms delay between dots
       - Container: inline-flex items-center gap-1 px-3 py-3 bg-white/5 rounded-2xl rounded-bl-md (looks like an assistant bubble)
       - CSS keyframe: `@keyframes bounce { 0%, 60%, 100% { transform: translateY(0) } 30% { transform: translateY(-4px) } }`
       - Dot 1: delay 0ms, Dot 2: delay 150ms, Dot 3: delay 300ms

       **Tool execution indicator (enhanced):**
       When activeTool is set:
       - Show below the typing indicator (or instead of it)
       - lucide Loader2 icon with animate-spin (replaces the raw SVG spinner from ChatPanel)
       - "Using {toolName}..." text, text-white/40 text-xs
       - Subtle pulsing glow on the icon: add `animate-pulse` or a custom animation with opacity cycling

    3. **Quick actions row (when messages exist):**
       - px-4 py-2 flex gap-2 overflow-x-auto border-t border-white/5
       - Horizontally scrollable, each chip shrink-0
       - Same chip styling as empty state
       - Disabled when isTyping (opacity-30)

    4. **Input row:**
       - Form with px-4 py-3 border-t border-white/10
       - Use the new **Input primitive** (type="text", size="md", placeholder="Message Jarvis...")
       - Send button: **Button primitive** (variant="primary", size="sm"), with lucide Send icon (w-4 h-4) instead of text "Send" — more compact and modern
       - Layout: flex gap-2, Input gets flex-1
       - Disabled state: input and button both disabled when isTyping
       - Submit on Enter key (form onSubmit)

    **Focus management:**
    - When overlay opens, focus the input after 300ms (setTimeout pattern from ChatPanel)
    - Use inputRef via forwardRef on the Input primitive

    **Keyboard shortcut (desktop only):**
    - useEffect with keydown listener: metaKey+shiftKey+c (Mac) OR ctrlKey+shiftKey+c (Windows) → toggleChat()
    - Guard: only fire on md+ breakpoint (window.matchMedia('(min-width: 768px)').matches)
    - Clean up listener on unmount

    **Animation implementation notes:**
    - Define CSS keyframes as a `<style>` tag rendered inside the component, or use inline keyframe definitions via style prop. Preferred approach: define a `chatOverlayStyles` string with the keyframes and inject via `<style jsx>{chatOverlayStyles}</style>` — BUT since this is Next.js without styled-jsx config, instead define the keyframes in a small useEffect that injects a `<style>` element into document.head on mount and removes it on unmount. OR simpler: use Tailwind's `animate-` utilities where possible, and inline `style={{ animation: '...' }}` for custom ones.
    - Actually, simplest and cleanest: create the keyframes using Tailwind's arbitrary values where possible, and for complex multi-step keyframes, define them inline with the `style` prop using the `animation` CSS property. Example: `style={{ animation: 'slideInRight 200ms ease-out both' }}` where `slideInRight` is defined in a `<style>` tag at the top of the component's return.

    **Important boundaries:**
    - Do NOT import or reference chatStore.isPanelOpen or chatStore.togglePanel — use shellStore exclusively for open/close state
    - DO still use chatStore for message state (messages, addMessage, updateMessage, etc.)
    - Do NOT touch the original ChatPanel.tsx — it stays for the old /jarvis route
    - Do NOT import markdown rendering libraries — keep messages as plain text for now (markdown is a future enhancement)

    ---

    **toastStore.ts:**
    - Interface: `ToastItem { id: string; variant: 'success' | 'error' | 'info'; message: string; action?: { label: string; onClick: () => void }; duration: number; createdAt: number }`
    - State: `toasts: ToastItem[]`
    - Actions:
      - `addToast(opts)` → generates unique ID (crypto.randomUUID() or fallback counter), sets duration default 4000ms, adds to array, sets setTimeout for auto-dismiss after `duration` ms. Store the timeout ID in a Map<string, NodeJS.Timeout> (module-level, not in store) so dismissing early can clearTimeout.
      - `removeToast(id)` → clears timeout from map, filters toast from array
    - Convenience exports (not in store, just helper functions):
      ```
      export const toast = {
        success: (message: string, opts?) => useToastStore.getState().addToast({ variant: 'success', message, ...opts }),
        error: (message: string, opts?) => useToastStore.getState().addToast({ variant: 'error', message, ...opts }),
        info: (message: string, opts?) => useToastStore.getState().addToast({ variant: 'info', message, ...opts }),
      }
      ```
    - Maximum 5 toasts in array (if adding 6th, remove oldest first)

    **ToastContainer.tsx:**
    - Reads `useToastStore(s => s.toasts)` and `useToastStore(s => s.removeToast)`
    - Container: fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none (children get pointer-events-auto)
    - Renders max 3 visible toasts (slice last 3 from array)
    - **Stacked depth effect:** Each toast from bottom to top gets progressively more prominent. The oldest visible toast: scale-95 opacity-80. Second: scale-[0.975] opacity-90. Newest: scale-100 opacity-100. Apply via inline style based on index.
    - **Entrance animation:** Each toast enters with spring slide-down: translateY(-16px) opacity-0 → translateY(0) opacity-1, 300ms cubic-bezier(0.34, 1.56, 0.64, 1)
    - **Exit animation:** Track exiting toasts via a local state (exitingIds Set). When removeToast is about to be called, add the ID to exitingIds, wait 200ms for exit animation (translateY(-8px) opacity-0), then actually call removeToast. Or simpler: use CSS animation-fill-mode and let the toast unmount after the animation — use onAnimationEnd callback.
    - Each Toast gets pointer-events-auto for interaction (dismiss X, action button, swipe)
    - Pass `duration` from ToastItem to Toast component for the progress bar animation
  </action>
  <verify>npx tsc --noEmit — filter for ChatOverlay, ToastContainer, toastStore — zero errors</verify>
  <done>AC-4, AC-5, AC-6 satisfied: Chat overlay has drag-to-dismiss, message animations, typing dots, spring physics. Toast system has progress bars, stacking, entrance animations.</done>
</task>

<task type="auto">
  <name>Task 3: Wire ChatOverlay + ToastContainer into JarvisShell</name>
  <files>
    src/components/jarvis/layout/JarvisShell.tsx,
    src/components/jarvis/layout/index.ts
  </files>
  <action>
    **JarvisShell.tsx:**
    - Import ChatOverlay and ToastContainer from the layout directory
    - Mount `<ChatOverlay />` after `<BottomTabBar />` — it renders its own fixed positioning
    - Mount `<ToastContainer />` after ChatOverlay — it renders its own fixed positioning at z-[60]
    - No other structural changes to the shell

    **index.ts barrel:**
    - Add exports for ChatOverlay and ToastContainer alongside existing: Header, DomainRail, BottomTabBar, ContentContainer, JarvisShell

    **Verify the full interaction chain:**
    - BottomTabBar Chat tab tap → shellStore.toggleChat() → isChatOpen=true → ChatOverlay slides up (mobile) / slides in (desktop) with spring easing
    - ChatOverlay close button / drag-dismiss / scrim tap → shellStore.closeChat() → isChatOpen=false → ChatOverlay exits with momentum animation
    - ChatOverlay send message → chatStore.addMessage → SSE stream starts → typing indicator (bouncing dots) → assistant message slides in from left
    - Keyboard: Cmd+Shift+C on desktop → toggles chat panel in/out
    - Toast: `import { toast } from '@/lib/jarvis/stores/toastStore'` → `toast.success('Done')` → ToastContainer renders toast with progress bar, auto-dismisses after 4s
  </action>
  <verify>npx tsc --noEmit — confirm full project compiles; verify ChatOverlay and ToastContainer imports in JarvisShell resolve correctly</verify>
  <done>AC-5, AC-6, AC-7 satisfied: Full chat flow works end-to-end through new shell with beautiful animations, build compiles clean</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/ChatPanel.tsx (old chat panel — stays for /jarvis route)
- src/lib/jarvis/stores/chatStore.ts (message state — used as-is, no modifications)
- src/lib/jarvis/stores/shellStore.ts (shell state — used as-is, no modifications)
- src/components/jarvis/layout/BottomTabBar.tsx (already wired correctly)
- src/components/jarvis/layout/Header.tsx (no changes needed)
- src/components/jarvis/layout/DomainRail.tsx (no changes needed)
- src/components/jarvis/home/* (E-04-02 deliverables — protected)
- src/components/jarvis/primitives/Button.tsx, Card.tsx, Badge.tsx, Skeleton.tsx (E-04-01 — protected)
- src/lib/jarvis/domains.ts (domain config — no changes this plan)
- src/app/jarvis/* (old jarvis route — untouched)

## SCOPE LIMITS
- No Settings page — that's E-04-04
- No Personal domain views — that's E-04-04/05
- No real API endpoints or Notion wiring — mock data only
- No onboarding flow
- No notification foundation (badge counts, SSE event stream)
- No ActionSheet composite (BottomTabBar + button stays as console.log placeholder)
- No modifications to chatStore or shellStore interfaces — consume them as-is
- Do NOT create EmptyState or ErrorBanner composites in this plan
- No markdown rendering in chat messages — future enhancement
- No third-party animation libraries (framer-motion, react-spring) — pure CSS + refs

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` shows zero new TypeScript errors (pre-existing audio-prep only)
- [ ] All 8 primitives exported from primitives/index.ts (Button, Card, Badge, Skeleton, Input, Toggle, Sheet, Toast)
- [ ] Input has focus glow ring (ring-2 ring-cyan-500/20) and icon color transition on focus
- [ ] Toggle uses spring cubic-bezier(0.34, 1.56, 0.64, 1) for thumb animation
- [ ] Sheet has real touch-tracking drag-to-dismiss with velocity detection on mobile
- [ ] Sheet has spring-back when drag doesn't pass threshold
- [ ] Toast has progress bar that animates width from 100% to 0% over duration
- [ ] Toast has swipe-to-dismiss gesture
- [ ] ToastContainer stacks with depth effect (scale/opacity gradient)
- [ ] ChatOverlay reads from shellStore.isChatOpen (NOT chatStore.isPanelOpen)
- [ ] ChatOverlay has responsive behavior: bottom sheet (mobile) vs side panel (desktop)
- [ ] ChatOverlay has drag-to-dismiss on mobile with velocity awareness
- [ ] ChatOverlay message bubbles have entrance animations (slide from left/right)
- [ ] ChatOverlay typing indicator shows 3 bouncing dots (not "...")
- [ ] ChatOverlay quick action chips have staggered entrance animation
- [ ] ChatOverlay uses Input and Button primitives for the input row
- [ ] Keyboard shortcut Cmd/Ctrl+Shift+C toggles chat on desktop
- [ ] JarvisShell mounts ChatOverlay and ToastContainer
- [ ] All animations use CSS + refs — no animation libraries added
</verification>

<success_criteria>
- All 3 tasks completed
- All verification checks pass
- No errors or warnings introduced
- 4 primitives complete the full set (8/8) — each with premium feel (springs, glows, gestures)
- ChatOverlay is the most polished component in the app — drag-to-dismiss, message cascades, bouncing typing dots, staggered chip reveals
- Toast system feels native-quality — progress bars, stacking depth, swipe-to-dismiss
- BottomTabBar Chat tab produces a genuinely delightful interaction
- Zero animation libraries — pure CSS craftsmanship
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-03-SUMMARY.md`
</output>
