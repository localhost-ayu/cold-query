import { useT } from '@/os/i18n';

export function TerminalLoading() {
  const t = useT();
  return (
    <div className="terminal-loading" role="status">
      <span className="spinner" aria-hidden />
      {t('terminal.booting')}
    </div>
  );
}
