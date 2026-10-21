import type { AppId } from '@/store/window-store';

import { appIcons } from './icons';

interface AppIconProps {
  appId: AppId;
  size?: number;
}

/**
 * Ícone de aplicativo no estilo Adwaita: placa arredondada com uma "borda"
 * inferior mais escura, que dá a sensação de peça física dos ícones do GNOME.
 * As cores vêm de `.app-icon--<app>` no CSS.
 */
export function AppIcon({ appId, size = 64 }: AppIconProps) {
  const Glyph = appIcons[appId];
  return (
    <span
      className={`app-icon app-icon--${appId}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="app-icon__plate">
        <Glyph weight="bold" />
      </span>
    </span>
  );
}
