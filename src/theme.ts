// ─── dreAmI Design System ─────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  bg:           '#0b1630',   // Deep cornflower navy
  surface:      '#111f45',   // Card / panel surfaces
  surfaceHigh:  '#182655',   // Elevated elements (input rows, banners)
  border:       '#1e3060',   // Subtle structural borders
  borderBright: '#2a4278',   // Interactive borders / hover

  // Pastel accent palette
  lavender:     '#c4b5fd',   // Primary — soft violet
  lavenderMid:  '#a78bfa',   // Interactive / mid-weight
  lavenderDeep: '#7c65e0',   // CTA buttons, active states
  teal:         '#67e8f9',   // Secondary — aqua
  rose:         '#fda4af',   // Tertiary — blush
  amber:        '#fde68a',   // Warm accent
  mint:         '#86efac',   // Success / peaceful

  // Text hierarchy — targets WCAG AA (4.5:1) against bg #0b1630
  textBright: '#f0f4ff',   // ~17:1  — headings, primary copy
  textMid:    '#c8d8f8',   // ~12:1  — secondary labels, hints
  textDim:    '#8898cc',   // ~6.5:1 — timestamps, captions, inactive chips
  textFaint:  '#5870a8',   // ~3.7:1 — placeholders, very muted decoration
} as const;

// Pastel mood colours (darker-friendly versions)
export const MOOD_COLORS: Record<string, string> = {
  vivid:   '#c4b5fd',  // pastel lavender
  anxious: '#fca5a5',  // pastel red
  peaceful:'#86efac',  // pastel green
  strange: '#93c5fd',  // pastel blue
  dark:    '#94a3b8',  // steel grey
  joyful:  '#fde68a',  // pastel amber
  neutral: '#a5b4fc',  // soft indigo
};

// Font families — loaded in app/_layout.tsx
export const FONTS = {
  cinzel:    'Cinzel_700Bold',       // Mystical headings
  cinzelReg: 'Cinzel_400Regular',    // Light mystical
  body:      'Outfit_400Regular',    // Modern body
  bodyMed:   'Outfit_500Medium',
  bodySemi:  'Outfit_600SemiBold',
  bodyBold:  'Outfit_700Bold',
} as const;
