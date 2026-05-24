# Design System

## Color Palette

```ts
// constants/colors.ts
export const colors = {
  background:    '#1A1A18',   // Page background — dark charcoal
  surface:       '#242422',   // Card / elevated surface
  surfaceInput:  '#2C2C2A',   // Chat bar, input fields

  textPrimary:   '#F0EFE8',   // Headings, titles — warm off-white
  textSecondary: '#888884',   // Subtitles, descriptions, body
  textMuted:     '#555552',   // Labels, timestamps, inactive icons

  accent:        '#C8A84B',   // Topic tags, CTAs, underline accents — amber/gold
  accentSubtle:  '#C8A84B26', // Accent at low opacity (backgrounds, tints)

  border:        '#333330',   // Dividers, subtle card borders
} as const;
```

---

## Typography

| Role | Font | Rationale |
|---|---|---|
| Section headings | **Playfair Display** (serif) | Elegant, editorial feel |
| All other text | **Inter** (sans-serif) | Clean, legible at small sizes |

```ts
// constants/typography.ts
export const typography = {
  sizes: {
    xs:   11,   // Uppercase labels, timestamps, badges
    sm:   13,   // Descriptions, subtitles
    base: 15,   // Body text, input placeholder
    md:   17,   // Card titles, list item titles
    xl:   28,   // Section headings (Playfair Display)
    xxl:  36,   // Page-level greeting/hero heading
  },
  weights: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
  letterSpacing: {
    normal: 0,
    wide:   0.8,   // Uppercase labels, topic tags, CTAs
    wider:  1.2,   // App name / wordmark
  },
} as const;
```

---

## Spacing

8pt grid:

```ts
// constants/spacing.ts
export const spacing = {
  xs:      4,
  sm:      8,
  md:      12,
  lg:      16,
  xl:      20,    // Horizontal screen padding
  xxl:     24,
  xxxl:    32,
  section: 40,    // Gap between home screen sections
} as const;
```

---

## Border Radius

```ts
export const radius = {
  sm:   6,
  md:   10,   // Cards
  lg:   16,
  pill: 24,   // Chat bar, tags
} as const;
```

---

## Component Patterns

### Section Header
- Title: `xl`, Playfair Display, `textPrimary`
- Subtitle: `sm`, regular, `textSecondary`
- Optional right CTA: `xs`, uppercase, `wide` letter-spacing, `accent`

### Card (Review — horizontal carousel)
- Background: `surface`, radius `md`
- Width: ~72% of screen (cards peek to indicate horizontal scroll)
- Card type label: `xs`, uppercase, `wide` letter-spacing, `textMuted`
- Topic tag: `xs`, uppercase, `wide` letter-spacing, `accent`, bold
- Title: `md`, semibold, `textPrimary`
- Bottom accent bar: `~48px` wide, `2px` tall, `accent` color

### Card (Explore — 2-column grid)
- No card background — sits on page background
- Topic label: `xs`, uppercase, `wide` letter-spacing, `accent`
- Arrow icon (↗): `textMuted`, top-right
- Title: `md`, bold, `textPrimary`
- Description: `sm`, regular, `textSecondary`

### List Row (Continue)
- Title: `md`, semibold, `textPrimary`
- Description: `sm`, regular, `textSecondary`
- Right-aligned metadata (timestamp, count): `xs`, uppercase, `wide` letter-spacing, `textMuted`
- Rows separated by `border` dividers

### Chat Bar
- Background: `surfaceInput`, radius `pill`
- Left icon: attachment, `textMuted`
- Right icon: mic, `textMuted`
- Placeholder: `base`, regular, `textMuted`
- Position: sticky bottom, above home indicator

### Uppercase Labels (topic tags, card type badges, CTAs)
- Always uppercase
- `wide` letter-spacing (0.8)
- `xs` size
- Use `accent` for topic tags and CTAs; `textMuted` for structural labels (e.g. card type, timestamps)
