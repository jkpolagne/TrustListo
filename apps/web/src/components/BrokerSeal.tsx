import { useId } from 'react';

/**
 * The gold seal: TrustListo's mark for "a licensed broker approved this".
 * Uses the logo's bronze→gold gradient. Only ever shown for broker-verified things.
 */
export function BrokerSeal({ size = 112, className = '' }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Verified by a licensed broker"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6e4a08" />
          <stop offset="0.55" stopColor="#c8901a" />
          <stop offset="1" stopColor="#f2c445" />
        </linearGradient>
        <path id={`${id}-ring`} d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" />
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${id}-g)`} />
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="#000"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <circle cx="60" cy="60" r="31" fill="#000" />
      <text
        fontSize="9.5"
        fontWeight="800"
        letterSpacing="2.2"
        fill="#000"
        style={{ fontStretch: '110%' }}
      >
        <textPath href={`#${id}-ring`} startOffset="0">
          VERIFIED · LICENSED BROKER · VERIFIED · LICENSED BROKER ·
        </textPath>
      </text>
      <path
        d="M47 61 l9 9 l18 -20"
        fill="none"
        stroke="#f2c445"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
