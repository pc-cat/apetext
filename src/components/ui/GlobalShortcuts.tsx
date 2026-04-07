'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';

/**
 * Global keyboard shortcuts — active on every page, every platform.
 *
 *   Navigation
 *   ──────────
 *   Tab          → Home (new test)       [home page overrides with handleRestart]
 *   Shift + Tab  → My Notes (/dashboard)
 *
 *   Theme  (universal — all platforms)
 *   ───────────────────────────────────
 *   Ctrl + L     → Force light mode
 *   Ctrl + D     → Force dark mode
 *   Ctrl + M     → Toggle between modes
 */
export default function GlobalShortcuts() {
  const router = useRouter();
  const { toggle, setTheme } = useTheme();

  // Keep refs so the single registered listener is never stale
  const routerRef   = useRef(router);
  const toggleRef   = useRef(toggle);
  const setThemeRef = useRef(setTheme);

  useEffect(() => { routerRef.current   = router;   }, [router]);
  useEffect(() => { toggleRef.current   = toggle;   }, [toggle]);
  useEffect(() => { setThemeRef.current = setTheme; }, [setTheme]);

  // Register exactly once — refs keep values current without re-registering
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Navigation shortcuts
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          routerRef.current.push('/dashboard');
        } else {
          routerRef.current.push('/');
        }
        return;
      }

      // Theme shortcuts — Ctrl+L/D/M universally (Mac and Windows)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        switch (e.code) {
          case 'KeyL':
            e.preventDefault();
            setThemeRef.current('light');
            break;
          case 'KeyD':
            e.preventDefault();
            setThemeRef.current('dark');
            break;
          case 'KeyM':
            e.preventDefault();
            toggleRef.current();
            break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // ← empty dep array: register once, refs keep values fresh

  return null;
}
