import type { Icon } from '@phosphor-icons/react';
import { lazy, type ComponentType } from 'react';

import type { AppId } from '@/store/window-store';

import { DossierApp } from './dossier/DossierApp';
import { appIcons } from './icons';
import { MailApp } from './mail/MailApp';
import { PlaceholderApp } from './PlaceholderApp';
import { SettingsApp } from './settings/SettingsApp';
import { TerminalLoading } from './terminal/TerminalLoading';

// O Terminal traz CodeMirror e o SQLite: só baixa quando a janela abre.
const TerminalApp = lazy(() =>
  import('./terminal/TerminalApp').then((module) => ({
    default: module.TerminalApp,
  })),
);

export interface AppDefinition {
  id: AppId;
  icon: Icon;
  component: ComponentType;
  /** O que aparece enquanto um app carregado sob demanda baixa. */
  fallback?: ComponentType;
}

export const apps: AppDefinition[] = [
  { id: 'mail', icon: appIcons.mail, component: MailApp },
  {
    id: 'terminal',
    icon: appIcons.terminal,
    component: TerminalApp,
    fallback: TerminalLoading,
  },
  { id: 'dossier', icon: appIcons.dossier, component: DossierApp },
  {
    id: 'notes',
    icon: appIcons.notes,
    component: () => <PlaceholderApp appId="notes" />,
  },
  {
    id: 'help',
    icon: appIcons.help,
    component: () => <PlaceholderApp appId="help" />,
  },
  { id: 'settings', icon: appIcons.settings, component: SettingsApp },
];

export const appById = Object.fromEntries(
  apps.map((app) => [app.id, app]),
) as Record<AppId, AppDefinition>;
