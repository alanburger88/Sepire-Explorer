import {
  ArrowRight,
  Braces,
  Database,
  FileText,
  Globe2,
  MonitorSmartphone,
  MousePointerClick,
  Printer,
  ScanSearch,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { ComplianceBadges } from '../../components/ComplianceBadges';
import { Halftone } from '../../components/Halftone';
import { pdfPageUrl } from '../../lib/assets';
import { STEPS } from '../tour/steps';
import './intro.css';

const SECTIONS = [
  {
    href: '#/tour',
    icon: MousePointerClick,
    eyebrow: `Guided tour · ${STEPS.length} stops`,
    title: 'Walk through the live statement',
    body: 'A highlight moves from feature to feature while each stop explains what it does and why it matters. Switch between desktop and phone, English and Spanish, or let it play on its own.',
    cta: 'Start the tour',
  },
  {
    href: '#/compare',
    icon: ScanSearch,
    eyebrow: 'PDF → Interactive',
    title: 'See the PDF transformed, section by section',
    body: 'The 13-page PDF on the left, the interactive statement on the right. Select any section of the PDF and watch it come to life, with the business case for each change.',
    cta: 'Compare them',
  },
  {
    href: '#/data',
    icon: Braces,
    eyebrow: 'Data & integration',
    title: 'Send one payload, get a statement',
    body: 'Explore the JSON that powers this statement, see how it reaches Sepire, and edit the data to watch the statement re-render.',
    cta: 'Explore the data',
  },
];

const NUMBERS = [
  { value: '13 pages', label: 'become one interactive statement', note: 'Every section of the PDF, reorganized into seven focused tabs.' },
  { value: 'EN | ES', label: 'with one tap', note: 'Every screen, chart, answer and the print edition.' },
  { value: '~25%', label: 'of the PDF’s file size', note: 'Typical per statement, with no PDF to generate or store.' },
  { value: '1 payload', label: 'per recipient', note: 'Sent in one API call, then validated and rendered.' },
];

const FLOW = [
  { icon: Database, title: 'Your recordkeeping data', body: 'Balances, activity, holdings, loans and plan content for each recipient.' },
  { icon: Workflow, title: 'Sepire API', body: 'One JSON payload per statement through a secure API, validated on arrival.' },
  { icon: MonitorSmartphone, title: 'Interactive statement', body: 'Personalized, bilingual and accessible on any device, with Sepi built in.' },
  { icon: Printer, title: 'Statement of record', body: 'Printable or saved as a PDF on demand; no PDF production run.' },
];

export function IntroPage() {
  return (
    <div className="intro">
      <section className="intro-hero">
        <Halftone corner="top-right" size={420} spacing={16} maxRadius={4.6} opacity={0.35} />
        <Halftone corner="bottom-left" size={260} spacing={15} maxRadius={3.6} opacity={0.25} />
        <div className="intro-hero-copy">
          <span className="eyebrow">Sepire Statement Explorer</span>
          <h1>
            From a flat PDF to a <span className="intro-accent">living statement</span>.
          </h1>
          <p className="intro-lede">
            See how Sepire turns a 13-page retirement plan PDF into an interactive statement of record. It is
            personal, plain-spoken, bilingual and accessible, it prints on demand, and it is powered by a single data
            payload.
          </p>
          <div className="intro-ctas">
            <a className="btn btn-primary btn-lg" href="#/tour">
              Start the guided tour <ArrowRight size={18} aria-hidden />
            </a>
            <a className="btn btn-secondary btn-lg" href="#/compare">
              Compare with the PDF
            </a>
          </div>
          <ComplianceBadges className="intro-badges" />
          <p className="intro-meta">
            <Sparkles size={15} aria-hidden /> Live demo statement for “Sidney Sample”, TEST COMPANY 401(K) RETIREMENT
            PLAN.
          </p>
        </div>

        <div className="intro-visual" aria-hidden="true">
          <figure className="intro-pdf">
            <img src={pdfPageUrl(1)} alt="" width={612} height={792} />
            <figcaption>
              <FileText size={13} /> PDF · page 1 of 13
            </figcaption>
          </figure>
          <div className="intro-arrow">
            <ArrowRight size={22} />
          </div>
          <figure className="intro-browser">
            <div className="intro-browser-bar">
              <i />
              <i />
              <i />
            </div>
            <img src="shots/statement-desktop.webp" alt="" width={1600} height={1000} />
          </figure>
          <figure className="intro-phone">
            <img src="shots/statement-mobile.webp" alt="" width={780} height={1688} />
          </figure>
        </div>
      </section>

      <section className="intro-section" aria-labelledby="intro-what">
        <div className="intro-section-head">
          <span className="eyebrow">What you can do here</span>
          <h2 id="intro-what">Three ways to explore</h2>
        </div>
        <div className="intro-cards">
          {SECTIONS.map(({ href, icon: Icon, eyebrow, title, body, cta }) => (
            <a key={href} className="intro-card card" href={href}>
              <span className="intro-card-icon">
                <Icon size={22} aria-hidden />
              </span>
              <span className="eyebrow">{eyebrow}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="intro-card-cta">
                {cta} <ArrowRight size={16} aria-hidden />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="intro-section" aria-labelledby="intro-numbers">
        <div className="intro-section-head">
          <span className="eyebrow">At a glance</span>
          <h2 id="intro-numbers">What changes when the PDF goes interactive</h2>
        </div>
        <dl className="intro-numbers">
          {NUMBERS.map((n) => (
            <div key={n.value} className="intro-number card">
              <dt>
                <span className="intro-number-value">{n.value}</span>
                <span className="intro-number-label">{n.label}</span>
              </dt>
              <dd>{n.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="intro-section" aria-labelledby="intro-how">
        <div className="intro-section-head">
          <span className="eyebrow">How it works</span>
          <h2 id="intro-how">One payload in, a complete statement out</h2>
        </div>
        <ol className="intro-flow">
          {FLOW.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="intro-flow-step">
              <span className="intro-flow-icon">
                <Icon size={22} aria-hidden />
              </span>
              <span className="intro-flow-n num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="intro-closing card">
        <Halftone corner="top-right" size={300} spacing={15} maxRadius={4.2} opacity={0.35} />
        <div>
          <h2>Ready to see it?</h2>
          <p>The tour takes about five minutes. Use the arrow keys, or press P to let it play on its own.</p>
        </div>
        <div className="intro-closing-ctas">
          <a className="btn btn-primary btn-lg" href="#/tour">
            Start the guided tour <ArrowRight size={18} aria-hidden />
          </a>
          <a className="btn btn-ghost btn-lg" href="#/data">
            <Globe2 size={18} aria-hidden /> Data & integration
          </a>
        </div>
      </section>
    </div>
  );
}
