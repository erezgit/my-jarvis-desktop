import { useEffect, type ReactNode } from 'react';

interface MobileScrollLockProps {
  children: ReactNode;
  enabled?: boolean;
}

/**
 * MobileScrollLock - Locks viewport height on mobile to prevent layout jumps when keyboard appears
 *
 * Sets CSS custom property --vh to 1% of window.innerHeight
 * Only updates on orientation change, NOT on resize (which fires when keyboard appears)
 *
 * This is a no-op on desktop (orientationchange events don't fire on desktop browsers)
 */
export function MobileScrollLock({ children, enabled = true }: MobileScrollLockProps) {
  useEffect(() => {
    if (!enabled) return;

    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial height
    setViewportHeight();

    // Only update on orientation change, not on resize (keyboard)
    const handleOrientationChange = () => {
      // Small delay to ensure viewport has updated
      setTimeout(setViewportHeight, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.documentElement.style.removeProperty('--vh');
    };
  }, [enabled]);

  return <>{children}</>;
}
