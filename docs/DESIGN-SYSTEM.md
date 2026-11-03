# Design system — Tech Maths

Art direction brief from the spec: *precise, calm, high-tech, trustworthy — mission control,
not stock-photo IT.* Reference bar: Awwwards / FWA / CSS Design Awards.

## 1. Colour

One accent, used sparingly. Everything else is neutral, so the accent always means something:
an action, a live state, or a measured result.

| Token | Dark (default) | Light | Use |
| --- | --- | --- | --- |
| `--tm-ink` | `#0A0D12` | `#F2F5F8` | Page background |
| `--tm-ink-2` | `#0D1118` | `#EAEFF4` | Alternating section background |
| `--tm-panel` | `#111823` | `#FFFFFF` | Cards, inputs |
| `--tm-panel-2` | `#16202C` | `#F6F9FB` | Nested surfaces |
| `--tm-line` | `rgba(255,255,255,.09)` | `rgba(8,20,32,.12)` | Hairlines, card borders |
| `--tm-line-strong` | `rgba(255,255,255,.18)` | `rgba(8,20,32,.22)` | Focus-adjacent borders |
| `--tm-mist` | `#E7EEF6` | `#0B1219` | Primary text |
| `--tm-mute` | `#8A99AB` | `#56636F` | Secondary text |
| `--tm-accent` | `#29E6FF` | `#067D92` | Actions, live state, data |
| `--tm-accent-soft` | `rgba(41,230,255,.14)` | `rgba(6,125,146,.10)` | Selected/hover fills |
| `--tm-warn` | `#FFB020` | `#9A5B00` | Placeholder markers, destructive hints |

The light accent is deliberately darker: `#29E6FF` on white fails WCAG AA for text, `#067D92`
passes. Theme is a variable swap on `[data-theme]`, not a second stylesheet.

**Rule:** the accent never decorates. If a surface is accent-coloured, it is interactive, live,
or a number the reader should remember.

## 2. Typography

Self-hosted variable fonts — no third-party requests, ~58 KB total.

| Role | Face | Treatment |
| --- | --- | --- |
| Display | Space Grotesk 300–700 | `letter-spacing: -0.025em`, `line-height: 1.02`, `text-wrap: balance` |
| Text | Inter 300–700 | `1.7` line-height in prose, `text-wrap: pretty` |
| Technical | JetBrains Mono 400–700 | `0.6–0.78rem`, uppercase, `0.12–0.24em` tracking — for eyebrows, references, metrics labels |

Type scale is fluid (`clamp()`), so headings scale from 360 px to 1440 px without breakpoints:

- H1 `clamp(2.2rem, 5.6vw, 4rem)`
- H2 `clamp(1.85rem, 4.2vw, 3.1rem)`
- Body `0.88–1.05rem`
- Meta `0.6–0.78rem` mono

## 3. Layout

- Container: `max-width: 84rem`, inline padding `clamp(1.25rem, 4vw, 3rem)`.
- Sections alternate `--tm-ink` and `--tm-ink-2` with a hairline between them — the rhythm is
  the structure, so most pages need almost no chrome.
- Card grids are built as `gap-px` on a `--tm-line` background: the borders *are* the grid,
  which reads as an engineered drawing rather than a set of floating boxes.
- An engineering grid backdrop (`64px` squares, radially masked) appears behind heroes only.

## 4. Motion

Purposeful, smooth easing, nothing that blocks reading (spec §7).

| Pattern | Implementation |
| --- | --- |
| Reveal on scroll | `.reveal` + IntersectionObserver adds `.is-in`; CSS does the animation |
| Line-mask headings | `.line-mask > span` translated from `105%` on entry |
| Pinned story | `position: sticky` stage + IntersectionObserver picks the active step (no scroll math) |
| Magnetic buttons | pointer-driven `translate3d`, disabled on touch |
| Parallax | rAF-throttled, `will-change` only when motion is allowed |
| Card sweep | `::after` gradient translated across on hover/focus |
| Hero | canvas 2D perspective data hall: racks, U-slots, LEDs, cable-tray light pulses |

Easing is `cubic-bezier(0.16, 1, 0.3, 1)` throughout — one curve, so the site feels like one
system.

**Reduced motion is a first-class state, not an afterthought:**
`prefers-reduced-motion` is honoured automatically, a footer control sets `data-motion="off"`
persistently, and both routes disable animation, the marquee, the custom cursor and the hero
loop (the hero renders one static frame instead).

## 5. Signature piece — the canvas hero

`src/components/hero-canvas.tsx`, ~250 lines, no libraries, no WebGL.

A pinhole projection draws two rows of racks receding to a vanishing point: front face with a
depth-attenuated gradient, aisle-facing side face for volume, 12 U-slots per unit, and
deterministic status LEDs that breathe on a per-rack phase (so they never strobe randomly).
Overhead cable trays carry accent-coloured light pulses with radial glow. Floor lines converge
to the vanishing point; a cold-aisle light strip runs down the centre.

Discipline that keeps it cheap and polite:
- DPR capped at 2; `ResizeObserver` re-fits.
- `IntersectionObserver` pauses rendering when off-screen; `visibilitychange` pauses when hidden.
- Pointer parallax nudges the drift, never the camera.
- `aria-hidden` — the canvas is decoration; every message is in the DOM as text.

## 6. Components

| Component | Notes |
| --- | --- |
| `Btn` | one component for links and buttons; primary/outline/ghost/quiet; magnetic wrapper is opt-in |
| `SectionHead` | eyebrow + title + lead; `level="h1"` for page heroes (keeps heading order valid) |
| `ServiceGrid` / `ServiceCardRow` | nine-card catalogue with hover sweep |
| `ProcessStory` | pinned 8-stage pipeline with an SVG node diagram |
| `CoverageMap` | real Natural Earth geometry, countries as accessible buttons, hub arcs from Lisbon |
| `QuoteForm` | 5 steps, per-step validation, summary review, honeypot, timing trap |
| `Markdown` | dependency-free renderer; never uses `dangerouslySetInnerHTML` |
| `FaqList` | `<details>/<summary>` — accessible accordion with zero client JS |
| `ConsentBanner` | GDPR banner; nothing is stored before a choice |
| `PlaceholderTag` | the marker that keeps illustrative content honest |

## 7. Accessibility

- Semantic landmarks, one `<h1>` per page, no heading-level skips (audited with axe-core).
- Skip link, visible `:focus-visible` ring in the accent colour.
- Every interactive SVG country is a real button with an accessible name and `aria-pressed`.
- Forms: real `<label>`s, `aria-live` step announcements, `role="alert"` on failure.
- Accordions use native `details`, so they work without JavaScript.
- Motion-off switch plus OS reduced-motion support.
- Tested down to 360 px; the mobile drawer and stacked grids carry the same content.
