'use client';
import { memo, useId } from 'react';

// useId() generates a stable ID that matches between server render and client
// hydration, solving the duplicate-gradient-ID collision when multiple instances
// of this component appear on the same page.
function ApeLogo({ className }: { className?: string }) {
  const uid   = useId();
  // Sanitize: SVG NCName IDs must not contain colons (XML namespace chars)
  const gradId = `ape-gradient-${uid.replace(/:/g, '')}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke={`url(#${gradId})`}
      strokeWidth="6"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#a855f7" />
          <stop offset="100%" stopColor="#d8b4fe" />
        </linearGradient>
      </defs>

      {/* Cybernetic Ape Silhouette Base */}
      <path
        d="M25 45 C 25 15, 75 15, 75 45 L 85 65 L 75 85 L 50 95 L 25 85 L 15 65 Z"
        fill={`url(#${gradId})`}
        fillOpacity="0.15"
        strokeLinejoin="round"
      />

      {/* Aggressive Brow Ridge */}
      <path d="M 24 49 Q 50 59 76 49" strokeLinecap="round" />

      {/* Digital Eye Slits */}
      <path d="M 35 62 L 44 60" strokeLinecap="round" strokeWidth="5" />
      <path d="M 65 62 L 56 60" strokeLinecap="round" strokeWidth="5" />

      {/* Geometric Snout Area */}
      <path d="M 40 72 L 60 72 L 55 82 L 45 82 Z" strokeLinejoin="round" />

      {/* Lower Jaw Line detail */}
      <path d="M 48 88 L 52 88" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

export default memo(ApeLogo);
