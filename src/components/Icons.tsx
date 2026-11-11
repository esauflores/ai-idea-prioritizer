import type { SVGProps } from 'react';

/** Small stroke icons (24×24 grid, currentColor), drawn inline to avoid an icon dependency. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Three ranked bars: the app's mark (also the favicon). */
export const LogoMark = ({ size = 20, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...p}>
    <rect x="3" y="5" width="26" height="6" rx="1.5" fill="#6cc495" />
    <rect x="3" y="13" width="18" height="6" rx="1.5" fill="#ecebe6" />
    <rect x="3" y="21" width="10" height="6" rx="1.5" fill="#76756e" />
  </svg>
);

export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const Copy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const Check = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const Refresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
    <path d="M20 20v-4h-4" />
  </Icon>
);

export const Chevron = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
