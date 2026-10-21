import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { SQLite, sql } from '@codemirror/lang-sql';
import {
  bracketMatching,
  HighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import type { SchemaTable } from '@/core/sql/types';

export interface SqlEditorHandle {
  insert: (text: string) => void;
  focus: () => void;
}

interface SqlEditorProps {
  value: string;
  schema: SchemaTable[];
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
  onRun: () => void;
  ref?: Ref<SqlEditorHandle>;
}

// Cores vêm das variáveis CSS do tema, então o editor troca junto com o TraceOS.
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--syntax-keyword)', fontWeight: '600' },
  {
    tag: [tags.string, tags.special(tags.string)],
    color: 'var(--syntax-string)',
  },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--syntax-number)' },
  {
    tag: [tags.lineComment, tags.blockComment],
    color: 'var(--syntax-comment)',
    fontStyle: 'italic',
  },
  {
    tag: [tags.operator, tags.punctuation],
    color: 'var(--syntax-punctuation)',
  },
  {
    tag: [tags.typeName, tags.standard(tags.name)],
    color: 'var(--syntax-type)',
  },
]);

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'transparent' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
  },
  '.cm-content': { caretColor: 'var(--accent)', padding: '10px 0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-faint)',
  },
  '.cm-activeLine': { backgroundColor: 'var(--editor-active-line)' },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--editor-selection) !important',
  },
  '.cm-placeholder': { color: 'var(--text-faint)' },
  '.cm-tooltip': {
    border: '1px solid var(--line)',
    borderRadius: '8px',
    backgroundColor: 'var(--surface-raised)',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--accent-bg)',
    color: 'var(--on-accent)',
  },
});

/** Converte o schema no formato que o autocomplete do lang-sql entende: { tabela: [colunas] }. */
function completionSchema(schema: SchemaTable[]): Record<string, string[]> {
  return Object.fromEntries(
    schema.map((table) => [
      table.name,
      table.columns.map((column) => column.name),
    ]),
  );
}

export function SqlEditor({
  value,
  schema,
  label,
  placeholder,
  onChange,
  onRun,
  ref,
}: SqlEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Compartment permite trocar só a configuração SQL quando o schema muda,
  // sem recriar o editor (e sem perder cursor nem desfazer).
  const language = useRef(new Compartment());
  // Os callbacks mudam a cada render; o editor lê sempre a versão mais recente.
  const callbacks = useRef({ onChange, onRun });
  useEffect(() => {
    callbacks.current = { onChange, onRun };
  });

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ icons: false }),
          syntaxHighlighting(highlight),
          language.current.of(
            sql({ dialect: SQLite, upperCaseKeywords: true }),
          ),
          placeholderExtension(placeholder),
          keymap.of([
            {
              key: 'Mod-Enter',
              preventDefault: true,
              run: () => {
                callbacks.current.onRun();
                return true;
              },
            },
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              callbacks.current.onChange(update.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ 'aria-label': label }),
          editorTheme,
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // O editor nasce uma vez; valor, rótulo e schema chegam pelos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    view.current?.dispatch({
      effects: language.current.reconfigure(
        sql({
          dialect: SQLite,
          upperCaseKeywords: true,
          schema: completionSchema(schema),
        }),
      ),
    });
  }, [schema]);

  // Troca de aba ou clique no histórico: substitui o texto se veio de fora.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
    });
  }, [value]);

  useImperativeHandle(ref, () => ({
    insert: (text) => {
      const editor = view.current;
      if (!editor) return;
      editor.dispatch(editor.state.replaceSelection(text));
      editor.focus();
    },
    focus: () => view.current?.focus(),
  }));

  return <div className="sql-editor" ref={host} />;
}
