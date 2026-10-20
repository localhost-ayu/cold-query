'use client';

import type { Icon } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import type { AppId } from '@/store/window-store';

import { appIcons } from './icons';
import { PlaceholderApp } from './PlaceholderApp';
import { SettingsApp } from './settings/SettingsApp';
import { TerminalLoading } from './terminal/TerminalLoading';

// O Terminal traz CodeMirror e o SQLite: só baixa quando a janela abre.
const TerminalApp = dynamic(
  () => import('./terminal/TerminalApp').then((module) => module.TerminalApp),
  {
    ssr: false,
    loading: TerminalLoading,
  },
);

export interface AppDefinition {
  id: AppId;
  icon: Icon;
  component: ComponentType;
}

export const apps: AppDefinition[] = [
  {
    id: 'mail',
    icon: appIcons.mail,
    component: () => <PlaceholderApp appId="mail" />,
  },
  { id: 'terminal', icon: appIcons.terminal, component: TerminalApp },
  {
    id: 'dossier',
    icon: appIcons.dossier,
    component: () => <PlaceholderApp appId="dossier" />,
  },
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
