/**
 * BTG Ministry brand tokens.
 * Colours come from the eagle-and-scroll logo; type pairs Cormorant Garamond
 * (titles) with Instrument Sans (everything else), matching the website.
 */

export const Colors = {
  ivory: '#FCFAF6', // app background
  parchment: '#F6EFE3', // soft panels
  sand: '#EDE1CF', // selected tab pill, quote panel
  paper: '#FBF3E4', // the devotional scroll and reader
  white: '#FFFFFF',
  line: '#E2D5C2', // card borders
  lineStrong: '#CDBBA0',
  inputBorder: '#A38660',

  text: '#1F130A',
  textMuted: '#5C4634',
  textSubtle: '#6B5038', // inactive tab labels
  eyebrow: '#7A4E26', // small uppercase labels

  brown: '#704828', // primary
  brownDark: '#4F3119',
  deep: '#3A2413', // dark artwork tiles
  night: '#2A1A0F', // video players
  cream: '#F8EFE0', // text on brown
  creamMuted: '#EAD9C0',
  gold: '#E6C898', // accents on brown
  goldLine: '#C9A577', // arch outline on brown
  goldLineDeep: '#A8875C', // arch outline on deep

  live: '#B42318',
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
