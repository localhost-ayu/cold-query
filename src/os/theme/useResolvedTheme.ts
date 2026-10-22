import { useSyncExternalStore } from 'react';

/** Observa o atributo data-theme do <html> (que o ThemeController mantém). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

export function useResolvedTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, () =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
}
