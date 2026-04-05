/**
 * dreAmI icon set — thin-stroke SVG icons matching the dark/cosmic aesthetic.
 * All icons are 24×24 viewBox, stroke-based, with rounded caps/joins.
 */
import React from 'react';
import Svg, {
  Path,
  Circle,
  Ellipse,
  Rect,
  Line,
  Polyline,
  Polygon,
} from 'react-native-svg';

type IconProps = {
  color?: string;
  size?: number;
};

// ─── Moon ─────────────────────────────────────────────────────────────────────
// Classic crescent — outer arc minus inner arc
export function MoonIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Microphone ───────────────────────────────────────────────────────────────
export function MicIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={1.5} />
      <Path
        d="M5 10a7 7 0 0 0 14 0"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="8"  y1="21" x2="16" y2="21" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Sparkle (4-pointed star ✦) ───────────────────────────────────────────────
export function SparkleIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Headphones ───────────────────────────────────────────────────────────────
export function HeadphonesIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 18v-6a9 9 0 0 1 18 0v6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

// ─── Send (arrow up) ──────────────────────────────────────────────────────────
export function SendIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="19" x2="12" y2="5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path
        d="M5 12l7-7 7 7"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Clock (history) ──────────────────────────────────────────────────────────
export function ClockIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
      <Polyline
        points="12 6 12 12 16 14"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Gear (settings) ──────────────────────────────────────────────────────────
export function GearIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

// ─── X (close / dismiss) ──────────────────────────────────────────────────────
export function XIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6"  x2="6"  y2="18" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Line x1="6"  y1="6"  x2="18" y2="18" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────
export function ChatBubbleIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Refresh (re-analyse ↺) ───────────────────────────────────────────────────
export function RefreshIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 4v6h6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.51 15a9 9 0 1 0 .49-5.09L1 10"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Speaker (TTS play) ───────────────────────────────────────────────────────
export function SpeakerIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.54 8.46a5 5 0 0 1 0 7.07"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Stop square (stop recording / stop speaking) ─────────────────────────────
export function StopIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="5" width="14" height="14" rx="2.5" stroke={color} strokeWidth={1.5} fill={color} />
    </Svg>
  );
}

// ─── Record dot (start recording) ─────────────────────────────────────────────
export function RecordDotIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" fill={color} />
      <Circle cx="12" cy="12" r="11" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// ─── Atom (LeMaNg LLC brand) ──────────────────────────────────────────────────
export function AtomIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Nucleus */}
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      {/* Orbit 1 — horizontal */}
      <Ellipse cx="12" cy="12" rx="9.5" ry="3.5" stroke={color} strokeWidth={1.2} />
      {/* Orbit 2 — 60° */}
      <Ellipse cx="12" cy="12" rx="9.5" ry="3.5" stroke={color} strokeWidth={1.2} transform="rotate(60, 12, 12)" />
      {/* Orbit 3 — 120° */}
      <Ellipse cx="12" cy="12" rx="9.5" ry="3.5" stroke={color} strokeWidth={1.2} transform="rotate(120, 12, 12)" />
    </Svg>
  );
}

// ─── Search (magnifying glass) ────────────────────────────────────────────────
export function SearchIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={1.5} />
      <Line x1="16.5" y1="16.5" x2="22" y2="22" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Pen (edit / type manually) ───────────────────────────────────────────────
export function PenIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3a2.828 2.828 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
