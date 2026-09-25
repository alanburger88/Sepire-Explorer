import { Check, Minus } from 'lucide-react';

type Row = { capability: string; pdf: string | null; interactive: string };

const GROUPS: Array<{ title: string; rows: Row[] }> = [
  {
    title: 'Compliance & record',
    rows: [
      { capability: 'Statement of record', pdf: 'Yes: the printed or PDF document', interactive: 'Yes: the interactive document itself' },
      { capability: 'Print or save as PDF', pdf: 'Pre-rendered for every recipient', interactive: 'On demand, from the statement' },
      { capability: 'Every figure exactly as the source', pdf: 'Yes', interactive: 'Yes, each linked to its printed page' },
      { capability: 'Required disclosures, verbatim', pdf: 'Yes', interactive: 'Yes, plus plain-language summaries' },
    ],
  },
  {
    title: 'Understanding',
    rows: [
      { capability: 'Personal greeting & period summary', pdf: null, interactive: 'Opens with Sidney’s balance and what changed' },
      { capability: 'Plain-language answers', pdf: null, interactive: 'Sepi, grounded in this statement only' },
      { capability: 'Terms defined in place', pdf: null, interactive: 'Glossary popovers and an A–Z glossary' },
      { capability: 'Interactive charts & drill-down', pdf: null, interactive: 'Balance bridge, allocation, fees, limits' },
      { capability: 'What-if modeling', pdf: 'A one-line tip', interactive: 'A scenario modeler' },
      { capability: 'Personalized video', pdf: null, interactive: '90 seconds, with chapters and captions' },
    ],
  },
  {
    title: 'Access & inclusion',
    rows: [
      { capability: 'English & Spanish', pdf: 'One language per production run', interactive: 'Instant EN | ES switch' },
      { capability: 'Readable on a phone', pdf: 'Pinch and zoom', interactive: 'Responsive layout' },
      { capability: 'Accessibility', pdf: 'Depends on PDF tagging', interactive: 'Semantic, keyboard, screen reader, UserWay' },
      { capability: 'Sensitive data', pdf: 'Printed in full', interactive: 'Masked until the participant reveals it' },
    ],
  },
  {
    title: 'Action & operations',
    rows: [
      { capability: 'Ask about an item', pdf: 'Phone or email, without context', interactive: 'In context, with a reference number' },
      { capability: 'Deadlines surfaced', pdf: 'Inside tables', interactive: '“Things to review” cards and countdowns' },
      { capability: 'Sponsor message', pdf: 'Fixed at production', interactive: 'Updated each cycle in CompliChain®' },
      { capability: 'Per-cycle production', pdf: 'Compose, render, store and deliver PDFs', interactive: 'Publish one data payload per recipient' },
      { capability: 'File size', pdf: '100%', interactive: '~25% of the PDF (typical)' },
    ],
  },
];

function Cell({ value, strong }: { value: string | null; strong?: boolean }) {
  if (value === null) {
    return (
      <span className="sc-none">
        <Minus size={16} aria-hidden />
        <span className="sr-only">Not available</span>
      </span>
    );
  }
  return (
    <span className={strong ? 'sc-yes' : 'sc-text'}>
      {strong && <Check size={16} aria-hidden />}
      {value}
    </span>
  );
}

export function Scorecard() {
  return (
    <div className="sc">
      <dl className="sc-kpis">
        <div className="card">
          <dt>File size</dt>
          <dd>
            <strong>~25%</strong> of the PDF, typically
          </dd>
        </div>
        <div className="card">
          <dt>PDFs to produce each cycle</dt>
          <dd>
            <strong>0</strong> print or save on demand
          </dd>
        </div>
        <div className="card">
          <dt>Printed pages → focused tabs</dt>
          <dd>
            <strong>13 → 7</strong> everything still in the record
          </dd>
        </div>
        <div className="card">
          <dt>Languages</dt>
          <dd>
            <strong>2</strong> English & Spanish, instantly
          </dd>
        </div>
      </dl>

      <div className="sc-table card">
        <table>
          <caption className="sr-only">PDF statement compared with the interactive statement</caption>
          <thead>
            <tr>
              <th scope="col">Capability</th>
              <th scope="col">PDF statement</th>
              <th scope="col" className="sc-col-int">
                Interactive statement
              </th>
            </tr>
          </thead>
          {GROUPS.map((g) => (
            <tbody key={g.title}>
              <tr className="sc-group">
                <th colSpan={3} scope="colgroup">
                  {g.title}
                </th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.capability}>
                  <th scope="row">{r.capability}</th>
                  <td>
                    <Cell value={r.pdf} />
                  </td>
                  <td className="sc-col-int">
                    <Cell value={r.interactive} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
