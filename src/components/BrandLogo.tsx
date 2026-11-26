interface BrandLogoProps {
  variant?: 'default' | 'light';
  size?: number;
}

export function BrandLogo({ variant = 'default', size = 36 }: BrandLogoProps) {
  const isLight = variant === 'light';

  return (
    <span
      className="brand-mark"
      style={{
        width: size,
        height: size,
        display: 'inline-grid',
        placeItems: 'center',
        flex: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="msLogoGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2FA590" />
            <stop offset="100%" stopColor="#1B6659" />
          </linearGradient>
        </defs>

        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="12"
          fill={isLight ? '#FFFFFF' : 'url(#msLogoGrad)'}
          stroke={isLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)'}
          strokeWidth="1.2"
        />

        {/* Outer compass / routine ring */}
        <circle
          cx="20"
          cy="20"
          r="11.5"
          stroke={isLight ? '#268675' : '#FFFFFF'}
          strokeOpacity={isLight ? 0.22 : 0.28}
          strokeWidth="1.6"
        />

        {/* Progress arc */}
        <path
          d="M20 8.5A11.5 11.5 0 1 1 9.8 25.4"
          stroke={isLight ? '#268675' : '#FFFFFF'}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Checkmark / direction needle */}
        <path
          d="M15.2 20.3L18.6 23.7L25.6 16.5"
          stroke={isLight ? '#1E6E60' : '#FFFFFF'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* North star spark */}
        <circle
          cx="29"
          cy="11"
          r="2"
          fill={isLight ? '#38A894' : '#9CE8D7'}
        />
      </svg>
    </span>
  );
}

