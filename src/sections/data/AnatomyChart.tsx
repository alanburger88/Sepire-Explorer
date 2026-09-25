import { Table2, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { formatBytes } from './payload';

export type AnatomyRow = { key: string; title: string; bytes: number; cells: number; page?: number };

type Props = { rows: AnatomyRow[]; total: number; onSelect?: (key: string) => void };

/** Bytes per payload section: one series, sorted, value at the tip; table view for every value. */
export function AnatomyChart({ rows, total, onSelect }: Props) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => r.bytes), 1);

  return (
    <figure className="anat">
      <figcaption className="anat-head">
        <div>
          <h3>What’s in the payload</h3>
          <p>Size of each section in the JSON a client sends (uncompressed). Select a section to explore its fields.</p>
        </div>
        <div className="seg" role="group" aria-label="Chart or table">
          <button type="button" aria-pressed={!table} onClick={() => setTable(false)}>
            <BarChart3 size={15} aria-hidden /> Chart
          </button>
          <button type="button" aria-pressed={table} onClick={() => setTable(true)}>
            <Table2 size={15} aria-hidden /> Table
          </button>
        </div>
      </figcaption>

      {table ? (
        <div className="anat-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col" className="num-col">
                  Size
                </th>
                <th scope="col" className="num-col">
                  Share
                </th>
                <th scope="col" className="num-col">
                  Values
                </th>
                <th scope="col" className="num-col">
                  PDF page
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">
                    {onSelect ? (
                      <button type="button" className="link-btn" onClick={() => onSelect(r.key)}>
                        {r.title}
                      </button>
                    ) : (
                      r.title
                    )}
                    <code>{r.key}</code>
                  </th>
                  <td className="num">{formatBytes(r.bytes)}</td>
                  <td className="num">{((r.bytes / total) * 100).toFixed(1)}%</td>
                  <td className="num">{r.cells}</td>
                  <td className="num">{r.page ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="anat-bars" onMouseLeave={() => setHover(null)}>
          {rows.map((r) => {
            const pct = (r.bytes / max) * 100;
            const inside = pct > 18;
            return (
              <li key={r.key} className={hover && hover !== r.key ? 'is-dim' : ''}>
                <button
                  type="button"
                  className="anat-row"
                  onMouseEnter={() => setHover(r.key)}
                  onFocus={() => setHover(r.key)}
                  onBlur={() => setHover(null)}
                  onClick={() => onSelect?.(r.key)}
                  aria-label={`${r.title}: ${formatBytes(r.bytes)}, ${((r.bytes / total) * 100).toFixed(1)}% of the payload, ${r.cells} values`}
                >
                  <span className="anat-label">{r.title}</span>
                  <span className="anat-track">
                    <span className="anat-bar" style={{ width: `${Math.max(pct, 0.6)}%` }} />
                    <span className={`anat-value num ${inside ? 'is-inside' : ''}`} style={inside ? { right: `${100 - pct}%` } : { left: `${pct}%` }}>
                      {formatBytes(r.bytes)}
                    </span>
                  </span>
                </button>
                {hover === r.key && (
                  <span className="anat-tip" role="tooltip">
                    <strong className="num">{formatBytes(r.bytes)}</strong> {((r.bytes / total) * 100).toFixed(1)}% of payload
                    <span>
                      {r.cells} values{r.page ? ` · PDF page ${r.page}` : ''}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </figure>
  );
}
