# Fatigue Tracker — UI Design System
### For developers building new pages/components

---

## 1. Design Theme: "Vivid Violet"

The entire app uses a single cohesive **lavender-violet palette**. There are no neutral grays — every surface has a violet undertone. The palette is calm and clinical, avoiding aggressive brightness while maintaining high contrast for readability.

> **Rule:** Never use plain `#000000`, `#ffffff` as a background, or any generic gray (`#888`, `#ccc`). Always use the CSS variables below.

---

## 2. Color Tokens

All tokens are defined in `frontend/app/globals.css` under `:root`. Always reference these by variable name — never hardcode hex values in components.

### Surface Colors

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#D6C9F5` | Page/app background |
| `--bg-topbar` | `#FFFFFF` | Top navigation bar |
| `--bg-sidebar` | `#C4B3EF` | Left sidebar / roster panel |
| `--bg-surface` | `#FFFFFF` | Cards and floating panels |
| `--track-violet` | `#EDE4FA` | Progress bar tracks, section dividers, subtle fills |

### Violet Accent

| Token | Hex | Usage |
|---|---|---|
| `--violet-vivid` | `#5B21B6` | Logo, buttons, labels, active states |
| `--violet-hover` | `#4C1D95` | Button hover state |
| `--violet-soft` | `rgba(91,33,182,0.12)` | Active sidebar row background, hover chips |

### Text

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#1E0E4E` | Headings, large numbers, primary content |
| `--text-secondary` | `#6D28D9` | Body text, descriptions |
| `--text-muted` | `#7C3AED` | Section labels, uppercase metadata |

### Borders

| Token | Hex | Usage |
|---|---|---|
| `--border-nav` | `#C4B3EF` | Sidebar border, card dividers |
| `--border-violet` | `#B09EE0` | Accented separators |
| `--border-pill-critical` | `#E11D48` | Status chip border when critical |
| `--border-pill-stable` | `#6EE7B7` | Status chip border when stable |

### Semantic / Clinical State Colors (hardcoded in components)

| State | Color | Background | Text |
|---|---|---|---|
| **Critical / Risk** | `#E11D48` | `#FDE8EE` | `#9B1239` |
| **Stable / Safe** | `#059669` | `#D1FAE5` | `#065F46` |
| **Watch / Moderate** | `#D97706` | `#FFFBEB` | (amber) |
| **BRI Safe (0–70)** | `#7C3AED` | — | White |
| **BRI Critical (>70)** | `#E11D48` | — | White |

---

## 3. Typography

Defined globally in `globals.css`. Three fonts are used for specific roles — do not mix them arbitrarily.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
```

| Font | Role | Applied To |
|---|---|---|
| **Inter** | Body default | All `body` text, descriptions, paragraphs |
| **Outfit** | Display / headings | `h1–h4`, card section titles |
| **Open Sans** | UI labels & controls | Buttons, metadata labels, badges, nav items |

### Type Scale

| Use Case | Size | Weight | Font | Color |
|---|---|---|---|---|
| Hero metric (BRI, Avg Stress) | `48px` | `600` | Open Sans | `--text-primary` |
| Section card value | `32px` | `600` | Open Sans | `--text-primary` |
| Student ID / page title | `20px` | `500` | Open Sans | `#1E0E4E` |
| Body text | `14px` | `400` | Inter | `--text-secondary` |
| Section heading (label) | `13px` | `600` | Open Sans | `--text-muted` |
| Badge / chip text | `11px` | `700` | Open Sans | varies |
| Metadata / footer | `11px` | `400` | Inter | muted opacity |

### Heading Rule
```css
h1, h2, h3, h4 {
  font-family: 'Outfit', sans-serif;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: -0.015em;
}
```

> **Important:** `text-transform: none !important` is set globally. Do not rely on CSS transforms for casing — write the actual case in HTML. Section labels use uppercase via `text-transform: uppercase` explicitly where needed.

---

## 4. Spacing & Sizing

### Border Radii

| Token | Value | Used For |
|---|---|---|
| `--radius-card` | `20px` | All cards, panels, modals |
| `--radius-inner` | `12px` | Inner elements, sub-panels, score badges |
| `--radius-pill` | `999px` | Status chips, nav pills |
| (hardcoded) | `8px` | Buttons, compact inputs |
| (hardcoded) | `6px` | Tight badges, tooltips |

### Key Spacing Values

| Context | Value |
|---|---|
| Top bar height | `64px` |
| Sidebar width | `200px` |
| Page workspace padding | `48px 24px 80px` |
| Card padding | `32px 36px` |
| Card gap (between stacked cards) | `40px` |
| Card internal gap | `32px` |
| Section label margin-bottom | `8px` |

---

## 5. Core Components

### Card
The primary container for all content sections.

```css
background: #ffffff;
border-radius: 20px;
padding: 32px 36px;
display: flex;
flex-direction: column;
gap: 32px;
box-shadow: 0 10px 40px rgba(30, 14, 78, 0.08);
animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
```

Cards stack with staggered animation delays:
```css
.card:nth-child(1) { animation-delay: 0.05s; }
.card:nth-child(2) { animation-delay: 0.10s; }
.card:nth-child(3) { animation-delay: 0.15s; }
```

---

### Section Label (Heading inside a card)
```css
font-size: 13px;
font-weight: 600;
font-family: 'Open Sans', sans-serif;
color: var(--text-muted); /* #7C3AED */
text-transform: uppercase;
letter-spacing: 0.1em;
margin-bottom: 8px;
```

---

### Primary Button
```css
background: var(--violet-vivid); /* #5B21B6 */
color: #fff;
border: none;
padding: 10px 18px;
border-radius: 8px;
font-size: 13px;
font-weight: 500;
font-family: 'Open Sans', sans-serif;
cursor: pointer;
transition: all 0.2s;

/* hover */
background: var(--violet-hover); /* #4C1D95 */
transform: translateY(-1px);
```

> Never make buttons full-width unless they are primary CTAs in a modal. Use `width: fit-content` and natural padding.

---

### Status / Clinical Chip
Small inline badge (not interactive — do not style as a button).

```css
font-size: 11px;
font-weight: 600;
padding: 2px 8px;
border-radius: 999px;
border: 1px solid #FDA4AF;  /* or #6EE7B7 for stable */
font-family: 'Open Sans', sans-serif;
letter-spacing: 0.02em;
```

Color combinations:
- **DETERIORATING / CRITICAL**: text `#9B1239`, bg `#FDE8EE`, border `#FDA4AF`
- **STABLE / SAFE**: text `#065F46`, bg `#D1FAE5`, border `#6EE7B7`
- **WATCH / VOLATILE**: text `#92400E`, bg `#FFFBEB`, border `#FCD34D`

---

### BRI Ring (Circular Metric)
Used for the primary fatigue indicator.

```css
width: 140px;
height: 140px;
border-radius: 50%;
border: 12px solid var(--track-violet);  /* track color */
/* border-color gets overwritten by JS based on BRI value */
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
box-shadow: 0 0 40px rgba(91, 33, 182, 0.1);
transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
animation: float 4s ease-in-out infinite;
```

**Ring color rule (enforced in JS):**
```js
const getRingColor = (bri) => bri > 70 ? '#E11D48' : '#7C3AED';
```

Hover:
```css
transform: scale(1.1) rotate(5deg);
box-shadow: 0 20px 60px rgba(91, 33, 182, 0.2);
```

---

### Metric Bar (Stress / Workload / Activity)
```css
/* Track */
width: 100%;
height: 10px;
background: var(--track-violet);
border-radius: 5px;
overflow: hidden;

/* Fill */
background: linear-gradient(90deg, var(--violet-vivid), #A78BFA);
border-radius: 5px;
transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
box-shadow: 0 0 10px rgba(91, 33, 182, 0.3);
```

Hover effect on parent `.metricItem`:
```css
transform: translateY(-5px);
/* fill glows and brightens */
box-shadow: 0 0 20px rgba(91, 33, 182, 0.5);
filter: brightness(1.1);
```

---

### Sidebar Student Row
```css
/* Default */
padding: 8px 12px;
border-radius: 8px;
cursor: pointer;
transition: 0.2s;

/* Hover */
background: rgba(255, 255, 255, 0.2);

/* Active */
background: var(--violet-soft);
border-left: 3px solid var(--violet-vivid);
border-radius: 0 8px 8px 0;
transform: scale(1.02);
box-shadow: 0 2px 10px rgba(91, 33, 182, 0.08);
```

---

### Notification Popover
```css
width: 340px;
background: white;
border: 1px solid var(--border-nav);
border-radius: 20px;
box-shadow: 0 20px 60px rgba(91, 33, 182, 0.2);
animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
```

---

### Modal (Clinical Intervention)
```css
background: rgba(30, 14, 78, 0.4);  /* overlay */
backdrop-filter: blur(4px);

/* modal panel */
background: #fff;
border-radius: 20px;
padding: 32px 28px;
width: 500px;
box-shadow: 0 30px 80px rgba(30, 14, 78, 0.25);
animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
```

---

### Tooltip (Floating)
```css
background: #1E0E4E;
color: #fff;
padding: 6px 10px;  /* or 12px 16px for rich tooltips */
border-radius: 6px;
font-size: 11px;
pointer-events: none;
transition: opacity 0.2s;
```

---

## 6. Animation Standards

All animations defined in page.module.css. Use these consistently — do not invent new keyframes unless necessary.

### `fadeInUp` (card entrance)
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(15px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Applied to cards with staggered `animation-delay`.

### `float` (BRI ring, pulse circle)
```css
@keyframes float {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}
```

### `slideDown` (popover, dropdown)
Used for notification and modal overlays sliding in from top.

### `drawLine` (SVG chart stroke)
```css
@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}
```
Set `stroke-dasharray: 2000; stroke-dashoffset: 2000` on the path, then animate to 0.

### `ping` (live indicator dot)
```css
@keyframes ping {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

---

## 7. Page Layout Structure

Every page follows this exact shell:

```
<div class="container">           ← full viewport, flex-col
  <header class="topBar">         ← 64px fixed height
    <div class="brand">           ← logo + app name
    <nav class="topNav">          ← bell / logout actions

  <div class="bodyLayout">        ← flex-row, fills remaining height
    <aside class="sidebar">       ← 200px, scrollable student roster
    <main class="main">           ← flex: 1, overflow-y: auto

      <div class="workspaceWrapper">   ← max-width: 1000px, centered
        <div class="workspace">       ← padding: 48px 24px 80px, gap: 40px
          <section class="card">      ← each logical section
```

---

## 8. Icon System

Use **inline SVG only** — no icon library dependency. All icons are 18×18px or 20×20px, `stroke="currentColor"`, `strokeWidth="2"` or `2.5`, `fill="none"`.

```jsx
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24"
       fill="none" stroke="currentColor"
       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    ...
  </svg>
);
```

> Do not use emojis as icons in any dashboard component. They are inconsistent across OS and break the clinical aesthetic.

---

## 9. Do's and Don'ts

| Do | Don't |
|---|---|
| Use CSS variables for all colors | Hardcode hex values in components |
| Left-align all section labels | Center-align text inside clinical dashboards |
| Use `fit-content` width on buttons | Stretch buttons to full container width |
| Keep status chips small (11px, tight padding) | Style chips to look like clickable buttons |
| Stagger card animations with `nth-child` delays | Animate everything simultaneously |
| Use `Open Sans` for labels, `Inter` for body | Use system font or Roboto |
| Keep clinical data left-aligned | Center large numeric values (exception: BRI ring) |
| Use `fadeInUp` for entrance transitions | Use `fade` or `zoom` — keep motion directional |

---

## 10. Quick Reference Cheatsheet

```css
/* Most-used values at a glance */

Background:         #D6C9F5   (--bg-base)
Card surface:       #FFFFFF
Sidebar:            #C4B3EF   (--bg-sidebar)
Track / fill bg:    #EDE4FA   (--track-violet)

Primary violet:     #5B21B6   (--violet-vivid)
Hover violet:       #4C1D95   (--violet-hover)
Soft violet tint:   rgba(91,33,182,0.12)

Text primary:       #1E0E4E
Text secondary:     #6D28D9
Text labels:        #7C3AED

Critical red:       #E11D48
Stable green:       #059669
Amber watch:        #D97706

Card radius:        20px
Inner radius:       12px
Pill radius:        999px

Card shadow:        0 10px 40px rgba(30, 14, 78, 0.08)
Modal shadow:       0 30px 80px rgba(30, 14, 78, 0.25)
Popover shadow:     0 20px 60px rgba(91, 33, 182, 0.2)
```

---

*Fatigue Tracker Design System · NUST SEECS · Spring 2026*
