import {
  Briefcase,
  Compass,
  EnvelopeSimple,
  FolderSimple,
  Gear,
  Lifebuoy,
  Notebook,
  PushPin,
  TerminalWindow,
  type Icon,
} from '@phosphor-icons/react';

import type { AppId } from '@/store/window-store';

export const appIcons: Record<AppId, Icon> = {
  mail: EnvelopeSimple,
  terminal: TerminalWindow,
  dossier: PushPin,
  contracts: Briefcase,
  browser: Compass,
  files: FolderSimple,
  notes: Notebook,
  help: Lifebuoy,
  settings: Gear,
};
