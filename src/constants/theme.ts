/**
 * BTG Ministry brand tokens, in a light and a dark palette.
 * Colours come from the eagle-and-scroll logo; type pairs Cormorant Garamond
 * (titles) with Instrument Sans (everything else), matching the website.
 *
 * Read colours with `useColors()` (src/state/theme.tsx) so screens follow the
 * light or dark setting.
 */

export const light = {
  ivory: '#FCFAF6', // screen background
  parchment: '#F6EFE3', // soft panels
  sand: '#EDE1CF', // selected tab pill, quote panel
  paper: '#FBF3E4', // the devotional scroll and reader
  white: '#FFFFFF', // cards and inputs
  line: '#E2D5C2', // card borders
  lineStrong: '#CDBBA0',
  inputBorder: '#A38660',
  rail: '#D9C9B1', // empty part of progress bars

  text: '#1F130A',
  textMuted: '#5C4634',
  textSubtle: '#6B5038', // inactive tab labels, placeholders
  eyebrow: '#7A4E26', // small uppercase labels

  brown: '#704828', // filled buttons and selected states (cream text on top)
  accent: '#704828', // links, icons and outlines on the screen background
  brownDark: '#4F3119', // strong icons and button text on the screen background
  deep: '#3A2413', // dark artwork tiles
  night: '#2A1A0F', // video players
  cream: '#F8EFE0', // text on brown
  creamMuted: '#EAD9C0',
  gold: '#E6C898', // accents on brown
  goldLine: '#C9A577', // arch outline on brown
  goldLineDeep: '#A8875C', // arch outline on deep

  live: '#B42318',
};

export type Palette = typeof light;

export const dark: Palette = {
  ivory: '#16100B',
  parchment: '#211810',
  sand: '#33261A',
  paper: '#1E160F',
  white: '#241B13',
  line: '#3A2C20',
  lineStrong: '#54412F',
  inputBorder: '#7A6249',
  rail: '#4A3828',

  text: '#F4EADB',
  textMuted: '#CDBAA2',
  textSubtle: '#B19C83',
  eyebrow: '#DDB680',

  brown: '#744A26',
  accent: '#E2B57A',
  brownDark: '#EFE0C8',
  deep: '#2C1D11',
  night: '#0F0A06',
  cream: '#F8EFE0',
  creamMuted: '#EAD9C0',
  gold: '#E6C898',
  goldLine: '#C9A577',
  goldLineDeep: '#A8875C',

  live: '#D13A2E',
};

/** Fixed brand colours for artwork (the scroll, the logo disc) that look the same in both modes. */
export const Brand = {
  brown: '#704828',
  brownDark: '#4F3119',
  ivory: '#FCFAF6',
  parchment: '#F6EFE3',
  line: '#E2D5C2',
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
