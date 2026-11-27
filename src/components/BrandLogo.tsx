import React from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  companyName?: string;
  showWordmark?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
  companyName,
  showWordmark = true,
}) => {
  const iconBox =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const titleSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  const gradId = `staffOnlineGrad_${size}_${variant}`;

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 select-none">
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconBox} shrink-0 drop-shadow-xs`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="52%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#${gradId})`} />
        {/* Person head */}
        <circle cx="19" cy="15.5" r="5" fill="#FFFFFF" />
        {/* Person shoulders */}
        <path
          d="M10.5 31.5C10.5 26.8 14.3 23.5 19 23.5C21.4 23.5 23.6 24.4 25.1 25.9"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Verified badge circle */}
        <circle cx="30.5" cy="29.5" r="7.5" fill="#FFFFFF" />
        <path
          d="M27.3 29.6L29.5 31.8L33.9 27.3"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark && (
        <span
          className={`font-display font-extrabold tracking-tight whitespace-nowrap truncate max-w-[200px] ${titleSize} ${
            variant === 'dark' ? 'text-white' : 'text-[#0F172A]'
          }`}
        >
          {companyName ? (
            companyName
          ) : (
            <>
              Staff<span className={variant === 'dark' ? 'text-sky-400' : 'text-[#2563EB]'}>.</span>{' '}
              Online
            </>
          )}
        </span>
      )}
    </div>
  );
};
