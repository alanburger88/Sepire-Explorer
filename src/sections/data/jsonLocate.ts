import { syntaxTree } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { pathFromPointer } from './payload';

const VALUE_NODES = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null']);

function valueChildren(node: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  for (let c: SyntaxNode | null = node.firstChild; c; c = c.nextSibling) if (VALUE_NODES.has(c.name)) out.push(c);
  return out;
}

/** Finds the text range of a JSON pointer in a JSON document open in `view`. */
export function rangeOfPointer(view: EditorView, ptr: string): { from: number; to: number } | null {
  const tree = syntaxTree(view.state);
  const doc = view.state.doc;
  let node: SyntaxNode | null = valueChildren(tree.topNode)[0] ?? null;
  let last: SyntaxNode | null = node;
  for (const key of pathFromPointer(ptr)) {
    if (!node) break;
    let next: SyntaxNode | null = null;
    if (node.name === 'Object') {
      for (let p: SyntaxNode | null = node.firstChild; p; p = p.nextSibling) {
        if (p.name !== 'Property') continue;
        const name = p.getChild('PropertyName');
        if (name && doc.sliceString(name.from + 1, name.to - 1) === String(key)) {
          next = valueChildren(p)[0] ?? name;
          break;
        }
      }
    } else if (node.name === 'Array' && typeof key === 'number') {
      next = valueChildren(node)[key] ?? null;
    }
    if (!next) break;
    last = next;
    node = next;
  }
  return last ? { from: last.from, to: last.to } : null;
}

/** Selects and reveals the value at a JSON pointer. */
export function revealPointer(view: EditorView, ptr: string): void {
  const r = rangeOfPointer(view, ptr);
  if (!r) return;
  const to = Math.min(r.to, r.from + 400);
  view.dispatch({ selection: EditorSelection.single(r.from, to), effects: EditorView.scrollIntoView(r.from, { y: 'center' }) });
  view.focus();
}
