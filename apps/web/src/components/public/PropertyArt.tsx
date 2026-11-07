import type { PropertyType } from '../../lib/marketplace';

/**
 * Line drawing shown when a listing has no photos yet. Echoes the roofline in the logo.
 * Drawn in neutral tones: gold is reserved for verified things.
 */
export function PropertyArt({ type, className = '' }: { type: PropertyType; className?: string }) {
  return (
    <svg
      viewBox="-110 -30 540 260"
      className={`h-full w-full bg-canvas ${className}`}
      role="img"
      aria-label="No photo yet"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1="-400" y1="168" x2="720" y2="168" stroke="#d9d8d4" strokeWidth="2" />
      <g fill="none" stroke="#4a4a48" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {type === 'LOT' && (
          <>
            <path d="M70 168 L110 128 L250 128 L210 168 Z" strokeDasharray="10 9" />
            <path d="M228 120 v-30 l18 8 l-18 8" strokeWidth="4" />
          </>
        )}
        {type === 'CONDO' && (
          <>
            <path d="M125 168 V52 H195 V168" />
            {[70, 96, 122].map((y) => (
              <path key={y} d={`M142 ${y} h10 M168 ${y} h10`} strokeWidth="4" />
            ))}
            <path d="M152 168 v-22 h16 v22" />
          </>
        )}
        {type === 'TOWNHOUSE' && (
          <>
            <path d="M70 168 V112 L108 82 L146 112 L184 82 L222 112 L260 82 V168" />
            <path d="M98 168 v-26 h20 v26 M174 168 v-26 h20 v26" />
          </>
        )}
        {(type === 'HOUSE_AND_LOT' || type === 'COMMERCIAL' || type === 'OTHER') && (
          <>
            <path d="M92 168 V110 M228 168 V110" />
            <path d="M78 118 L160 56 L242 118" />
            <path d="M196 80 V60 H214 V94" />
            <path d="M146 168 v-34 h28 v34" />
            <path d="M106 128 h22 M192 128 h22" strokeWidth="4" />
          </>
        )}
      </g>
    </svg>
  );
}
