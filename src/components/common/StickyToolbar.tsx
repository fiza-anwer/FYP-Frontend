import type { ReactNode } from "react";

/**
 * Sticks below the app header while the page scrolls so filters/actions stay reachable.
 * Header is ~64–73px (AppHeader sticky top-0).
 */
export default function StickyToolbar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky top-14 z-40 -mx-1 border-b border-gray-200/90 bg-white/95 px-1 py-2 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 sm:top-16 lg:top-[4.55rem] ${className}`}
    >
      {children}
    </div>
  );
}
