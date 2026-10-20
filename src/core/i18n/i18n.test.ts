import { describe, expect, it } from 'vitest';

import { translate } from '.';
import { en } from './messages/en';
import { ptBR } from './messages/pt-BR';

describe('translate', () => {
  it('interpolates parameters and leaves unknown ones visible', () => {
    expect(translate('terminal.rowsMany', 'pt-BR', { count: 42 })).toBe(
      '42 linhas',
    );
    expect(translate('terminal.rowsMany', 'en')).toBe('{count} rows');
  });

  it('keeps both catalogs in sync and without empty strings', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ptBR).sort());
    for (const value of [...Object.values(en), ...Object.values(ptBR)]) {
      expect(value.trim()).not.toBe('');
    }
  });

  it('uses the same placeholders in both languages', () => {
    const placeholders = (text: string) =>
      (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(ptBR) as Array<keyof typeof ptBR>) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ptBR[key]));
    }
  });
});
