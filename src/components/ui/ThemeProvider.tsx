'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Read saved preference on first mount
  useEffect(() => {
    const saved = localStorage.getItem('ape-theme') as Theme | null;
    const resolved = saved === 'light' ? 'light' : 'dark';
    setTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ape-theme', next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ape-theme', next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
