'use client';

import { useEffect } from 'react';

import { resolveTheme, usePreferences } from '@/store/preferences-store';

/** Aplica o tema escolhido no <html> e acompanha o sistema quando a escolha é "Sistema". */
export function ThemeController() {
  const preference = usePreferences((state) => state.theme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(
        preference,
        media.matches,
      );
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  return null;
}
