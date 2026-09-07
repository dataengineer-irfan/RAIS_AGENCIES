import { useEffect } from 'react';

/**
 * Hook to lock body scroll when modals, bottom sheets, or drawers are open.
 * Eliminates mobile touch scroll-bleed.
 */
export const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
};
