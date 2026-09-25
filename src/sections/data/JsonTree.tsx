import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isCell, isObject, pointer, type Json, type Path } from './payload';

type Props = {
  data: Json;
  selected: Path | null;
  onSelect: (path: Path) => void;
  query: string;
  /** Section keys to hide from the tree. */
  labelFor?: (key: string) => string | undefined;
};

type Row = { path: Path; key: string | number; value: Json; depth: number; container: boolean; open: boolean; match: boolean };

const MAX_MATCHES = 300;

function hint(value: Json): string {
  if (!isObject(value)) return '';
  for (const k of ['name', 'label', 'title', 'heading', 'ticker', 'type', 'source', 'id', 'holdingId', 'token']) {
    const v = value[k];
    if (typeof v === 'string' && v) return v.length > 34 ? `${v.slice(0, 32)}…` : v;
  }
  return '';
}

function isContainer(v: Json): boolean {
  return (Array.isArray(v) && v.length > 0) || (isObject(v) && Object.keys(v).length > 0);
}

export function JsonTree({ data, selected, onSelect, query, labelFor }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['/']));
  const listRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  // Search: matching keys, text and printed values, plus their ancestors.
  const search = useMemo(() => {
    if (!q) return null;
    const matches = new Set<string>();
    const visible = new Set<string>(['/']);
    const walk = (v: Json, path: Path) => {
      if (matches.size >= MAX_MATCHES) return;
      const key = path[path.length - 1];
      const hit =
        (typeof key === 'string' && key.toLowerCase().includes(q)) ||
        (typeof v === 'string' && v.toLowerCase().includes(q)) ||
        (typeof v === 'number' && String(v).includes(q)) ||
        (isCell(v) && v.src.toLowerCase().includes(q));
      if (hit && path.length) {
        matches.add(pointer(path));
        for (let i = 0; i <= path.length; i++) visible.add(pointer(path.slice(0, i)));
      }
      if (isCell(v)) return;
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
      else if (isObject(v)) Object.entries(v).forEach(([k, x]) => walk(x, [...path, k]));
    };
    walk(data, []);
    return { matches, visible };
  }, [data, q]);

  // Reveal the selected node's ancestors.
  useEffect(() => {
    if (!selected) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < selected.length; i++) next.add(pointer(selected.slice(0, i)));
      return next.size === prev.size ? prev : next;
    });
  }, [selected]);

  const rows = useMemo(() => {
    const out: Row[] = [];
    const visit = (value: Json, path: Path, depth: number) => {
      const ptr = pointer(path);
      if (search && !search.visible.has(ptr)) return;
      const container = isContainer(value);
      const open = container && (search ? true : expanded.has(ptr));
      if (path.length) {
        out.push({ path, key: path[path.length - 1], value, depth, container, open, match: !!search?.matches.has(ptr) });
      }
      if (!path.length || open) {
        if (Array.isArray(value)) value.forEach((x, i) => visit(x, [...path, i], depth + 1));
        else if (isObject(value)) Object.entries(value).forEach(([k, x]) => visit(x, [...path, k], depth + 1));
      }
    };
    visit(data, [], -1);
    return out;
  }, [data, expanded, search]);

  const selectedPtr = selected ? pointer(selected) : null;

  useEffect(() => {
    if (!selectedPtr) return;
    listRef.current?.querySelector(`[data-ptr="${CSS.escape(selectedPtr)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedPtr, rows]);

  const toggle = (path: Path) => {
    const ptr = pointer(path);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ptr)) next.delete(ptr);
      else next.add(ptr);
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = rows.findIndex((r) => pointer(r.path) === selectedPtr);
    const row = rows[i];
    if (e.key === 'ArrowDown') onSelect(rows[Math.min(rows.length - 1, i + 1)]?.path ?? rows[0].path);
    else if (e.key === 'ArrowUp') onSelect(rows[Math.max(0, i - 1)]?.path ?? rows[0].path);
    else if (e.key === 'ArrowRight' && row?.container && !row.open) toggle(row.path);
    else if (e.key === 'ArrowLeft' && row?.container && row.open) toggle(row.path);
    else if (e.key === 'ArrowLeft' && row && row.path.length > 1) onSelect(row.path.slice(0, -1));
    else if ((e.key === 'Enter' || e.key === ' ') && row?.container) toggle(row.path);
    else return;
    e.preventDefault();
  };

  return (
    <div className="jt" ref={listRef} role="tree" aria-label="Statement payload" tabIndex={0} onKeyDown={onKeyDown}>
      {rows.map((r) => {
        const ptr = pointer(r.path);
        const isSel = ptr === selectedPtr;
        const v = r.value;
        const label = r.depth === 0 && typeof r.key === 'string' ? labelFor?.(r.key) : undefined;
        return (
          <div
            key={ptr}
            data-ptr={ptr}
            role="treeitem"
            aria-level={r.depth + 1}
            aria-expanded={r.container ? r.open : undefined}
            aria-selected={isSel}
            className={`jt-row ${isSel ? 'is-selected' : ''} ${r.match ? 'is-match' : ''}`}
            style={{ paddingLeft: 8 + r.depth * 16 }}
            onClick={() => onSelect(r.path)}
          >
            {r.container ? (
              <button
                type="button"
                tabIndex={-1}
                className={`jt-caret ${r.open ? 'is-open' : ''}`}
                aria-label={r.open ? 'Collapse' : 'Expand'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(r.path);
                }}
              >
                <ChevronRight size={14} aria-hidden />
              </button>
            ) : (
              <span className="jt-caret-space" />
            )}
            <span className={typeof r.key === 'number' ? 'jt-index' : 'jt-key'}>{typeof r.key === 'number' ? `[${r.key}]` : r.key}</span>
            {label && <span className="jt-label">{label}</span>}
            {isCell(v) ? (
              <>
                <span className={`jt-kind jt-kind-${v.kind}`}>{v.kind}</span>
                <span className="jt-src">{v.src || '(blank)'}</span>
              </>
            ) : Array.isArray(v) ? (
              <span className="jt-meta">
                [{v.length}] {v.length === 1 ? 'item' : 'items'}
              </span>
            ) : isObject(v) ? (
              <span className="jt-meta">
                {'{'}
                {Object.keys(v).length}
                {'}'} {!label && <span className="jt-hint">{hint(v)}</span>}
              </span>
            ) : typeof v === 'string' ? (
              <span className="jt-string">“{v.length > 64 ? `${v.slice(0, 62)}…` : v}”</span>
            ) : (
              <span className="jt-literal">{String(v)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
