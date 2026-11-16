import type { Icon } from '@phosphor-icons/react';
import { lazy, type ComponentType } from 'react';

import type { AppId } from '@/store/window-store';

import { DossierApp } from './dossier/DossierApp';
import { appIcons } from './icons';
import { MailApp } from './mail/MailApp';
import { SettingsApp } from './settings/SettingsApp';
import { TerminalLoading } from './terminal/TerminalLoading';

// Apps que não abrem no boot só baixam quando a janela abre. O Terminal é o
// maior deles (CodeMirror e SQLite).
const BrowserApp = lazy(() =>
  import('./browser/BrowserApp').then((m) => ({ default: m.BrowserApp })),
);
const FilesApp = lazy(() =>
  import('./files/FilesApp').then((m) => ({ default: m.FilesApp })),
);
const NotesApp = lazy(() =>
  import('./notes/NotesApp').then((m) => ({ default: m.NotesApp })),
);
const ContractsApp = lazy(() =>
  import('./contracts/ContractsApp').then((m) => ({ default: m.ContractsApp })),
);
const HelpApp = lazy(() =>
  import('./help/HelpApp').then((m) => ({ default: m.HelpApp })),
);

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
  { id: 'contracts', icon: appIcons.contracts, component: ContractsApp },
  { id: 'browser', icon: appIcons.browser, component: BrowserApp },
  { id: 'files', icon: appIcons.files, component: FilesApp },
  { id: 'notes', icon: appIcons.notes, component: NotesApp },
  { id: 'help', icon: appIcons.help, component: HelpApp },
  { id: 'settings', icon: appIcons.settings, component: SettingsApp },
];

export const appById = Object.fromEntries(
  apps.map((app) => [app.id, app]),
) as Record<AppId, AppDefinition>;
