/** Fonte das chaves: toda mensagem nasce aqui e o en.ts é obrigado a ter as mesmas. */
export const ptBR = {
  'desktop.mobileTitle': 'Uma investigação pede mais espaço',
  'desktop.mobileBody':
    'Cold Query foi feito para telas de computador ou tablet. Abra numa tela maior para operar o TraceOS.',
  'desktop.caseLabel': 'Caso em espera',
  'desktop.caseTitle': 'Nenhum contrato aceito',
  'desktop.caseBody':
    'Enquanto a Helena não manda nada, a base de treino está aberta no Terminal.',

  'topbar.secure': 'Ambiente isolado',
  'topbar.notifications': 'Notificações',
  'topbar.noNotifications': 'Nenhuma notificação nova',
  'topbar.theme': 'Tema: {theme}',

  'dock.label': 'Aplicativos',
  'dock.running': '{app} (aberto)',

  'window.close': 'Fechar',
  'window.minimize': 'Minimizar',
  'window.maximize': 'Maximizar',
  'window.restore': 'Restaurar',

  'app.mail': 'Mail',
  'app.terminal': 'Terminal SQL',
  'app.dossier': 'Dossiê',
  'app.notes': 'Notas',
  'app.help': 'Ajuda',
  'app.settings': 'Ajustes',

  'placeholder.eyebrow': 'Ainda não instalado',
  'placeholder.mail':
    'Os contratos da Helena e as respostas dos clientes chegam aqui.',
  'placeholder.dossier':
    'As evidências que você fixar viram um quadro de investigação.',
  'placeholder.notes': 'Um caderno em Markdown para cada caso.',
  'placeholder.help':
    'O guia de SQL cresce junto com os casos que você resolve.',

  'settings.appearance': 'Aparência',
  'settings.theme': 'Tema',
  'settings.theme.system': 'Sistema',
  'settings.theme.light': 'Claro',
  'settings.theme.dark': 'Escuro',
  'settings.language': 'Idioma',
  'settings.sound': 'Som',
  'settings.soundEnabled': 'Efeitos sonoros',
  'settings.volume': 'Volume',

  'terminal.database': 'Banco',
  'terminal.db.training': 'Base de treino',
  'terminal.run': 'Executar',
  'terminal.stop': 'Interromper',
  'terminal.newTab': 'Nova consulta',
  'terminal.closeTab': 'Fechar {tab}',
  'terminal.tab': 'Consulta {n}',
  'terminal.tabs': 'Consultas',
  'terminal.schema': 'Schema',
  'terminal.history': 'Histórico',
  'terminal.historyEmpty': 'As consultas que você executar aparecem aqui.',
  'terminal.insert': 'Inserir {name} no editor',
  'terminal.editor': 'Editor SQL',
  'terminal.results': 'Resultado',
  'terminal.booting': 'Ligando o SQLite…',
  'terminal.running': 'Executando…',
  'terminal.rowsOne': '1 linha',
  'terminal.rowsMany': '{count} linhas',
  'terminal.elapsed': '{ms} ms',
  'terminal.truncated':
    'Mostrando só as primeiras {max} linhas. Filtre com WHERE ou use LIMIT para ver o que importa.',
  'terminal.noRows': 'A consulta rodou e não devolveu nenhuma linha.',
  'terminal.emptyTitle': 'Escreva uma consulta e tecle {keys}',
  'terminal.emptyHint': 'Um bom começo: {example}',
  'terminal.primaryKey': 'chave primária',

  'sqlError.title': 'O SQLite recusou a consulta',
  'sqlError.detail': 'Mensagem original',
  'sqlError.empty': 'Não há nada para executar.',
  'sqlError.blocked':
    '{keyword} não é permitido no TraceOS. Os bancos de um caso são somente leitura.',
  'sqlError.syntax':
    'Erro de sintaxe perto de “{token}”. Confira vírgulas, aspas e a grafia dos comandos.',
  'sqlError.incomplete':
    'A consulta terminou no meio. Falta fechar parênteses ou aspas?',
  'sqlError.noTable':
    'A tabela “{name}” não existe neste banco. Veja a lista no painel Schema.',
  'sqlError.noColumn':
    'A coluna “{name}” não existe. Os nomes certos estão no painel Schema.',
  'sqlError.ambiguous':
    'A coluna “{name}” existe em mais de uma tabela. Diga de qual: tabela.{name}.',
  'sqlError.readOnly':
    'Este banco é somente leitura. Dá para consultar, não para alterar.',
  'sqlError.notAuthorized': 'Esse comando não é permitido no TraceOS.',
  'sqlError.tooBig': 'O valor gerado ficou grande demais.',
  'sqlError.timeout':
    'A consulta passou de 5 segundos e foi encerrada. Procure um JOIN sem condição ou uma CTE recursiva sem fim.',
  'sqlError.interrupted': 'Consulta interrompida.',
  'sqlError.engine': 'O SQLite não conseguiu iniciar neste navegador.',
  'sqlError.unknown': 'O SQLite recusou a consulta.',
} as const;
