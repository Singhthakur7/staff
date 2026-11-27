import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="40" height="40" rx="10" fill="#131C31" stroke="#2563EB" strokeOpacity="0.45" strokeWidth="1.2" />
    <path
      d="M9 28V12L16.5 21.5L24 12V28"
      stroke="#FFFFFF"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="30" cy="14" r="3" fill="#D97706" />
    <path
      d="M27.5 22.5C29.6 22.5 31.3 24.2 31.3 26.3"
      stroke="#2563EB"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M27.5 18.8C31.7 18.8 35 22.1 35 26.3"
      stroke="#60A5FA"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.7"
    />
  </svg>
);
