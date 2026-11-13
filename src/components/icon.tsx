import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type IconName =
  | 'home'
  | 'sermons'
  | 'live'
  | 'podcast'
  | 'devotional'
  | 'bell'
  | 'search'
  | 'back'
  | 'down'
  | 'chevron'
  | 'share'
  | 'play'
  | 'pause'
  | 'bookmark'
  | 'heart'
  | 'download'
  | 'chat'
  | 'flame'
  | 'check'
  | 'plus'
  | 'moon'
  | 'queue'
  | 'expand'
  | 'arrow'
  | 'copy'
  | 'prev'
  | 'next';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Filled variant for toggles such as a saved bookmark or heart. */
  filled?: boolean;
  /** Draw the red "live" dot on the live icon. */
  dot?: boolean;
};

/** Line icons drawn to match the BTG Ministry design (24 × 24 grid, 1.8 stroke). */
export function Icon({ name, size = 22, color = Colors.brownDark, filled = false, dot = false }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  const solid = { fill: color };

  let body: React.ReactNode;
  switch (name) {
    case 'home':
      body = (
        <>
          <Path d="M3 11l9-7 9 7" {...stroke} />
          <Path d="M5 10v10h5v-6h4v6h5V10" {...stroke} />
        </>
      );
      break;
    case 'sermons':
      body = (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={3} {...stroke} />
          <Path d="M10 9.5v5l4.5-2.5z" {...stroke} />
        </>
      );
      break;
    case 'live':
      body = (
        <>
          <Circle cx={12} cy={12} r={2} {...stroke} />
          <Path d="M16 8a5.7 5.7 0 0 1 0 8" {...stroke} />
          <Path d="M8 16a5.7 5.7 0 0 1 0-8" {...stroke} />
          <Path d="M19 5a10 10 0 0 1 0 14" {...stroke} />
          <Path d="M5 19a10 10 0 0 1 0-14" {...stroke} />
          {dot ? <Circle cx={20.5} cy={3.5} r={3} fill={Colors.live} /> : null}
        </>
      );
      break;
    case 'podcast':
      body = (
        <>
          <Path d="M4 15v-3a8 8 0 0 1 16 0v3" {...stroke} />
          <Rect x={3} y={14} width={5} height={7} rx={2} {...stroke} />
          <Rect x={16} y={14} width={5} height={7} rx={2} {...stroke} />
        </>
      );
      break;
    case 'devotional':
      body = (
        <>
          <Path d="M12 6c-2-1.5-4.5-2-8-2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4c-3.5 0-6 .5-8 2z" {...stroke} />
          <Path d="M12 6v14" {...stroke} />
        </>
      );
      break;
    case 'bell':
      body = (
        <>
          <Path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" {...stroke} fill={filled ? color : 'none'} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...stroke} />
        </>
      );
      break;
    case 'search':
      body = (
        <>
          <Circle cx={11} cy={11} r={7} {...stroke} />
          <Path d="M20 20l-3.5-3.5" {...stroke} />
        </>
      );
      break;
    case 'back':
      body = <Path d="M15 6l-6 6 6 6" {...stroke} strokeWidth={2} />;
      break;
    case 'down':
      body = <Path d="M6 9l6 6 6-6" {...stroke} strokeWidth={2} />;
      break;
    case 'chevron':
      body = <Path d="M9 6l6 6-6 6" {...stroke} strokeWidth={2} />;
      break;
    case 'arrow':
      body = (
        <>
          <Path d="M5 12h14" {...stroke} strokeWidth={2} />
          <Path d="M13 6l6 6-6 6" {...stroke} strokeWidth={2} />
        </>
      );
      break;
    case 'share':
      body = (
        <>
          <Path d="M12 3v12" {...stroke} />
          <Path d="M8 7l4-4 4 4" {...stroke} />
          <Path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" {...stroke} />
        </>
      );
      break;
    case 'play':
      body = <Path d="M8 5.5v13l11-6.5z" {...solid} />;
      break;
    case 'pause':
      body = (
        <>
          <Rect x={6} y={5} width={4} height={14} rx={1} {...solid} />
          <Rect x={14} y={5} width={4} height={14} rx={1} {...solid} />
        </>
      );
      break;
    case 'prev':
      body = (
        <>
          <Path d="M18 6v12l-9-6z" {...solid} />
          <Rect x={5} y={6} width={2.5} height={12} rx={1} {...solid} />
        </>
      );
      break;
    case 'next':
      body = (
        <>
          <Path d="M6 6v12l9-6z" {...solid} />
          <Rect x={16.5} y={6} width={2.5} height={12} rx={1} {...solid} />
        </>
      );
      break;
    case 'bookmark':
      body = <Path d="M6 3h12v18l-6-4-6 4z" {...stroke} fill={filled ? color : 'none'} />;
      break;
    case 'heart':
      body = (
        <Path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
          {...stroke}
          fill={filled ? color : 'none'}
        />
      );
      break;
    case 'download':
      body = (
        <>
          <Path d="M12 4v11" {...stroke} />
          <Path d="M7 10l5 5 5-5" {...stroke} />
          <Path d="M5 20h14" {...stroke} />
        </>
      );
      break;
    case 'chat':
      body = <Path d="M4 20l1.4-4.2A8 8 0 1 1 8.3 19z" {...stroke} />;
      break;
    case 'flame':
      body = (
        <Path
          d="M12 21c4 0 7-2.7 7-6.5 0-3.5-2.5-5.5-4-8.5-1 2-2 3-3.5 3.5C11 7 11 5 9.5 3 9 6 5 8.5 5 14.5 5 18.3 8 21 12 21z"
          {...stroke}
          fill={filled ? color : 'none'}
        />
      );
      break;
    case 'check':
      body = <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} strokeWidth={2.2} />;
      break;
    case 'plus':
      body = (
        <>
          <Path d="M12 5v14" {...stroke} strokeWidth={2.2} />
          <Path d="M5 12h14" {...stroke} strokeWidth={2.2} />
        </>
      );
      break;
    case 'moon':
      body = <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" {...stroke} />;
      break;
    case 'queue':
      body = (
        <>
          <Path d="M4 6h16" {...stroke} />
          <Path d="M4 12h10" {...stroke} />
          <Path d="M4 18h10" {...stroke} />
          <Path d="M17 15v6l4-3z" {...stroke} />
        </>
      );
      break;
    case 'expand':
      body = (
        <>
          <Path d="M4 9V4h5" {...stroke} />
          <Path d="M20 9V4h-5" {...stroke} />
          <Path d="M4 15v5h5" {...stroke} />
          <Path d="M20 15v5h-5" {...stroke} />
        </>
      );
      break;
    case 'copy':
      body = (
        <>
          <Rect x={9} y={9} width={11} height={11} rx={2} {...stroke} />
          <Path d="M5 15V6a2 2 0 0 1 2-2h9" {...stroke} />
        </>
      );
      break;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {body}
    </Svg>
  );
}
