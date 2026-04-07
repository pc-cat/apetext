'use client';

import { memo } from 'react';
import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react';

function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--ape-bg-card)',
        borderColor: 'var(--ape-border-kbd)',
        color: 'var(--ape-text-muted)',
      }}
    >
      {theme === 'dark'
        ? <Sun  size={15} strokeWidth={2} />
        : <Moon size={15} strokeWidth={2} />}
    </button>
  );
}

export default memo(ThemeToggle);
