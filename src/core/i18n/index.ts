import { en } from './messages/en';
import { ptBR } from './messages/pt-BR';

export const locales = ['pt-BR', 'en'] as const;
export type Locale = (typeof locales)[number];
export type MessageKey = keyof typeof ptBR;
export type MessageParams = Record<string, string | number>;

export const defaultLocale: Locale = 'pt-BR';

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  'pt-BR': ptBR,
  en,
};

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

/** Resolve a chave no idioma pedido (com pt-BR de reserva) e troca os {parâmetros}. */
export function translate(
  key: MessageKey,
  locale: Locale = defaultLocale,
  params?: MessageParams,
): string {
  const template = catalogs[locale][key] ?? catalogs[defaultLocale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export type Translate = (key: MessageKey, params?: MessageParams) => string;
