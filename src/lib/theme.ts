'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const saved = localStorage.getItem('rotina_theme') as ThemeMode | null;
    const preferred =
      saved ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', preferred);
    queueMicrotask(() => setTheme(preferred));
  }, []);

  function toggleTheme() {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('rotina_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return { theme, toggleTheme };
}

