import { ShieldCheck } from 'lucide-react';

/** Sepire's compliance credentials. Edit the wording here; every badge in the explorer uses this list. */
export const COMPLIANCE = [
  { id: 'hitrust', name: 'HITRUST', status: 'Certified' },
  { id: 'soc2', name: 'SOC 2', status: 'Compliant' },
];

export function ComplianceBadges({ className = '' }: { className?: string }) {
  return (
    <ul className={`badges ${className}`} aria-label="Security and compliance">
      {COMPLIANCE.map((b) => (
        <li key={b.id} className="badge">
          <span className="badge-seal" aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </span>
          <span className="badge-text">
            <strong>{b.name}</strong>
            <small>{b.status}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}
