import { useCallback } from 'react';

import {
  translate,
  type MessageKey,
  type MessageParams,
  type Translate,
} from '@/core/i18n';
import { usePreferences } from '@/store/preferences-store';

export function useLocale() {
  return usePreferences((state) => state.locale);
}

/** Tradutor ligado ao idioma atual; re-renderiza o componente quando o idioma muda. */
export function useT(): Translate {
  const locale = useLocale();
  return useCallback(
    (key: MessageKey, params?: MessageParams) => translate(key, locale, params),
    [locale],
  );
}
