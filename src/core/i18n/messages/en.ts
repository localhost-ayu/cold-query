import type { ptBR } from './pt-BR';

export const en: Record<keyof typeof ptBR, string> = {
  'desktop.mobileTitle': 'This investigation needs a bigger screen',
  'desktop.mobileBody':
    'Cold Query is made for computer and tablet screens. Open it on a larger display to run TraceOS.',

  'topbar.activities': 'Activities',
  'topbar.calendar': 'Calendar and notifications',
  'topbar.unread': 'There are new notifications',
  'topbar.system': 'System menu',

  'calendar.noNotifications': 'No notifications',
  'calendar.clear': 'Clear',
  'calendar.previous': 'Previous month',
  'calendar.next': 'Next month',

  'quick.isolated': 'Isolated session',
  'quick.darkStyle': 'Dark Style',
  'quick.sound': 'Sounds',
  'quick.volume': 'Volume',
  'quick.settings': 'Settings',
  'quick.language': 'Language',

  'overview.search': 'Type to search',
  'overview.dash': 'Applications',
  'overview.noResults': 'No applications found',
  'overview.empty': 'No open windows. Pick an application below.',
  'overview.running': '{app} (open)',

  'notify.dismiss': 'Dismiss',
  'notify.open': 'Open {app}',
  'notify.trainingBody':
    'Until a contract comes in, the training database is open in the Terminal. A good time to sharpen your SQL.',

  'window.close': 'Close',
  'window.minimize': 'Minimize',
  'window.maximize': 'Maximize',
  'window.restore': 'Restore',

  'app.mail': 'Mail',
  'app.terminal': 'SQL Terminal',
  'app.dossier': 'Case Board',
  'app.notes': 'Notes',
  'app.help': 'Help',
  'app.settings': 'Settings',

  'placeholder.eyebrow': 'Not installed yet',
  'placeholder.mail':
    'Contracts from Helena and replies from clients land here.',
  'placeholder.dossier': 'Evidence you pin turns into an investigation board.',
  'placeholder.notes': 'A Markdown notebook for every case.',
  'placeholder.help': 'The SQL guide grows with every case you close.',

  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.language': 'Language',
  'settings.sound': 'Sound',
  'settings.soundEnabled': 'Sound effects',
  'settings.volume': 'Volume',

  'terminal.database': 'Database',
  'terminal.db.training': 'Training database',
  'terminal.run': 'Run',
  'terminal.stop': 'Stop',
  'terminal.newTab': 'New query',
  'terminal.closeTab': 'Close {tab}',
  'terminal.tab': 'Query {n}',
  'terminal.tabs': 'Queries',
  'terminal.schema': 'Schema',
  'terminal.history': 'History',
  'terminal.historyEmpty': 'Queries you run show up here.',
  'terminal.insert': 'Insert {name} into the editor',
  'terminal.editor': 'SQL editor',
  'terminal.results': 'Results',
  'terminal.booting': 'Starting SQLite…',
  'terminal.running': 'Running…',
  'terminal.rowsOne': '1 row',
  'terminal.rowsMany': '{count} rows',
  'terminal.elapsed': '{ms} ms',
  'terminal.truncated':
    'Showing only the first {max} rows. Narrow it down with WHERE or LIMIT.',
  'terminal.noRows': 'The query ran and returned no rows.',
  'terminal.emptyTitle': 'Write a query and press {keys}',
  'terminal.emptyHint': 'A good place to start: {example}',
  'terminal.primaryKey': 'primary key',

  'sqlError.title': 'SQLite rejected the query',
  'sqlError.detail': 'Original message',
  'sqlError.empty': 'There is nothing to run.',
  'sqlError.blocked':
    '{keyword} is not allowed in TraceOS. Case databases are read-only.',
  'sqlError.syntax':
    'Syntax error near “{token}”. Check commas, quotes and keyword spelling.',
  'sqlError.incomplete':
    'The query ends halfway through. A missing parenthesis or quote?',
  'sqlError.noTable':
    'There is no “{name}” table in this database. The Schema panel lists them all.',
  'sqlError.noColumn':
    'There is no “{name}” column. The Schema panel has the right names.',
  'sqlError.ambiguous':
    '“{name}” exists in more than one table. Say which one: table.{name}.',
  'sqlError.readOnly':
    'This database is read-only. You can query it, not change it.',
  'sqlError.notAuthorized': 'That command is not allowed in TraceOS.',
  'sqlError.tooBig': 'The generated value got too large.',
  'sqlError.timeout':
    'The query ran past 5 seconds and was stopped. Look for a JOIN without a condition or a runaway recursive CTE.',
  'sqlError.interrupted': 'Query stopped.',
  'sqlError.engine': 'SQLite could not start in this browser.',
  'sqlError.unknown': 'SQLite rejected the query.',
};
