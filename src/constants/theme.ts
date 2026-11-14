/**
 * BTG Ministry brand tokens, in a light and a dark palette.
 * Colours come from the eagle-and-scroll logo; type pairs Cormorant Garamond
 * (titles) with Instrument Sans (everything else), matching the website.
 *
 * Read colours with `useColors()` (src/state/theme.tsx) so screens follow the
 * light or dark setting.
 */

export const light = {
  // Light and airy: near-white screens, soft warm borders, and a caramel brown
  // kept for buttons, selected states and small accents.
  ivory: '#FFFDFA', // screen background
  parchment: '#FAF6F0', // soft panels
  sand: '#F3ECE2', // selected tab pill, quote panel
  paper: '#FFFCF7', // the devotional scroll and reader
  white: '#FFFFFF', // cards and inputs
  line: '#EFE6DA', // card borders
  lineStrong: '#E0D3C1',
  inputBorder: '#A88E70',
  rail: '#EDE4D8', // empty part of progress bars

  text: '#2B1D12',
  textMuted: '#6B5644',
  textSubtle: '#80694F', // inactive tab labels, placeholders
  eyebrow: '#94643A', // small uppercase labels

  brown: '#8B5A2B', // filled buttons and selected states (cream text on top)
  accent: '#8B5A2B', // links, icons and outlines on the screen background
  brownDark: '#4F3119', // strong icons and button text on the screen background
  deep: '#3A2413', // dark artwork
  night: '#1C130C', // video players
  cream: '#FFFFFF', // text on brown
  creamMuted: '#F3E6D3',
  gold: '#E6C898', // accents on brown
  goldLine: '#C9A577',
  goldLineDeep: '#A8875C',

  // Artwork tiles (sermon placeholders, series, podcast cover).
  artBrown: '#EFE3D3',
  artDeep: '#E6D6C2',
  artSand: '#F7F1E9',
  artLine: '#CDB596',
  artText: '#3A2716',
  // The scroll rods from the logo.
  roll: '#C9A77F',
  rollKnob: '#A47A4E',

  live: '#B42318',
  danger: '#B42318', // error text and borders
};

export type Palette = typeof light;

export const dark: Palette = {
  // Warm charcoal rather than brown, so dark mode stays clean, not muddy.
  ivory: '#131110',
  parchment: '#1C1916',
  sand: '#2A2520',
  paper: '#171412',
  white: '#1E1A17',
  line: '#2E2925',
  lineStrong: '#463F38',
  inputBorder: '#7D7064',
  rail: '#3A332D',

  text: '#F5EFE7',
  textMuted: '#C9BFB3',
  textSubtle: '#A89C8E',
  eyebrow: '#D9AE7A',

  brown: '#8B5A2B',
  accent: '#E2B57A',
  brownDark: '#F1E4D2',
  deep: '#241F1B',
  night: '#0B0908',
  cream: '#FFFFFF',
  creamMuted: '#F3E6D3',
  gold: '#E6C898',
  goldLine: '#C9A577',
  goldLineDeep: '#A8875C',

  artBrown: '#2E251E',
  artDeep: '#26201B',
  artSand: '#211C18',
  artLine: '#5C4C3C',
  artText: '#F5EFE7',
  roll: '#6E5238',
  rollKnob: '#584029',

  live: '#D13A2E',
  danger: '#FF9D8F',
};

/** Fixed brand colours for artwork (the scroll, the logo disc) that look the same in both modes. */
export const Brand = {
  brown: '#8B5A2B',
  brownDark: '#4F3119',
  ivory: '#FFFDFA',
  parchment: '#FAF6F0',
  line: '#EFE6DA',
} as const;

export const Fonts = {
  display: 'CormorantGaramond_600SemiBold',
  displayMedium: 'CormorantGaramond_500Medium',
  displayItalic: 'CormorantGaramond_500Medium_Italic',
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemiBold: 'InstrumentSans_600SemiBold',
  sansBold: 'InstrumentSans_700Bold',
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

/** Horizontal padding for every screen. */
export const ScreenPadding = 20;
