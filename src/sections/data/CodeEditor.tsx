import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { bracketMatching, foldGutter, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { lintGutter, linter } from '@codemirror/lint';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder as placeholderExt } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { graphql as graphqlLanguage, updateSchema } from 'cm6-graphql';
import type { GraphQLSchema } from 'graphql';
import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange?: (value: string) => void;
  language: 'json' | 'graphql';
  schema?: GraphQLSchema;
  readOnly?: boolean;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  /** Receives the view so callers can scroll to or select text. */
  onView?: (view: EditorView | null) => void;
};

// Token colors come from CSS variables, so the editor follows the light/dark theme.
const highlight = HighlightStyle.define([
  { tag: [t.propertyName, t.attributeName], color: 'var(--code-key)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--code-number)' },
  { tag: [t.keyword, t.operatorKeyword, t.definitionKeyword], color: 'var(--code-keyword)', fontWeight: '600' },
  { tag: [t.typeName, t.className], color: 'var(--code-type)' },
  { tag: [t.variableName, t.special(t.variableName)], color: 'var(--code-variable)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--ink-3)', fontStyle: 'italic' },
  { tag: [t.punctuation, t.bracket, t.separator], color: 'var(--ink-3)' },
]);

const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '12.5px', backgroundColor: 'var(--code-bg)', color: 'var(--ink)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--orange)', padding: '10px 0' },
  '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--ink-3)', border: 'none', borderRight: '1px solid var(--line)' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--orange) 6%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--orange) 8%, transparent)', color: 'var(--ink-2)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'color-mix(in srgb, var(--orange) 26%, transparent) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--orange)' },
  '.cm-tooltip': { backgroundColor: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line-strong)', borderRadius: '8px', boxShadow: 'var(--shadow-2)' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--orange-wash)', color: 'var(--ink)' },
  '.cm-foldPlaceholder': { backgroundColor: 'var(--surface-3)', border: 'none', color: 'var(--ink-2)' },
  '.cm-matchingBracket': { backgroundColor: 'color-mix(in srgb, var(--orange) 20%, transparent)', outline: 'none' },
  '.cm-placeholder': { color: 'var(--ink-3)' },
});

function languageExtensions(language: 'json' | 'graphql', schema?: GraphQLSchema): Extension[] {
  if (language === 'json') return [json(), linter(jsonParseLinter()), lintGutter()];
  return [graphqlLanguage(schema), lintGutter()];
}

export function CodeEditor({ value, onChange, language, schema, readOnly = false, ariaLabel, className = '', placeholder, onView }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyComp = useRef(new Compartment());

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          foldGutter(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          syntaxHighlighting(highlight),
          baseTheme,
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
          ...languageExtensions(language, schema),
          readOnlyComp.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
          placeholder ? placeholderExt(placeholder) : [],
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    onView?.(view);
    return () => {
      onView?.(null);
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once per language; value/schema updates are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Apply external value changes (e.g. presets) without resetting the cursor for our own edits.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && schema && language === 'graphql') updateSchema(view, schema);
  }, [schema, language]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: readOnlyComp.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) });
  }, [readOnly]);

  return <div className={`code-editor ${className}`} ref={hostRef} />;
}
