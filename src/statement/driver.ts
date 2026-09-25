// Drives the embedded interactive statement (same-origin iframe): navigation, language,
// overlays, waiting for elements, and the highlight ring that moves between features.

export type Lang = 'en' | 'es';

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function frames(win: Window, n = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const tick = () => (--left <= 0 ? resolve() : win.requestAnimationFrame(tick));
    win.requestAnimationFrame(tick);
  });
}

export function isVisible(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return !style || (style.visibility !== 'hidden' && style.display !== 'none');
}

type Target = string | (() => Element | null);

export class StatementDriver {
  readonly iframe: HTMLIFrameElement;
  private ring: HighlightRing | null = null;

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
  }

  get win(): (Window & typeof globalThis) | null {
    try {
      return (this.iframe.contentWindow as (Window & typeof globalThis) | null) ?? null;
    } catch {
      return null;
    }
  }

  get doc(): Document | null {
    try {
      return this.iframe.contentDocument;
    } catch {
      return null;
    }
  }

  query<T extends Element = HTMLElement>(target: Target): T | null {
    const doc = this.doc;
    if (!doc) return null;
    return (typeof target === 'string' ? doc.querySelector(target) : target()) as T | null;
  }

  /** Polls until the target exists (and is visible, by default). */
  async waitFor<T extends Element = HTMLElement>(target: Target, { timeout = 3000, visible = true } = {}): Promise<T | null> {
    const end = performance.now() + timeout;
    while (performance.now() < end) {
      const el = this.query<T>(target);
      if (el && (!visible || isVisible(el))) return el;
      await sleep(40);
    }
    return null;
  }

  async until(check: () => boolean, timeout = 2000): Promise<boolean> {
    const end = performance.now() + timeout;
    while (performance.now() < end) {
      if (check()) return true;
      await sleep(40);
    }
    return check();
  }

  /** Resolves once the statement app has rendered. */
  async ready(timeout = 20000): Promise<boolean> {
    return !!(await this.waitFor('main#main, .print-root', { timeout }));
  }

  route(): string {
    const h = this.win?.location.hash ?? '';
    return h.replace(/^#/, '') || '/overview';
  }

  /** Navigate the statement without adding browser-history entries. */
  async go(path: string): Promise<void> {
    const win = this.win;
    if (!win) return;
    if (this.route() !== path) {
      // Resolve against the statement's own URL: a relative URL passed to location.replace()
      // from this (parent) script would resolve against the explorer's URL instead.
      const url = new URL(win.location.href);
      url.hash = path;
      win.location.replace(url.href);
      await frames(win, 3);
      win.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    await this.waitFor('main#main, .print-root', { timeout: 5000 });
    await frames(win, 2);
  }

  lang(): Lang {
    return (this.doc?.documentElement.lang ?? 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  /** Uses the statement's own EN | ES switch, exactly as a recipient would. */
  async setLang(lang: Lang): Promise<void> {
    if (this.lang() === lang) return;
    const btn = await this.waitFor<HTMLButtonElement>(`button[data-locale="${lang}"]`, { timeout: 4000 });
    btn?.click();
    await this.until(() => this.lang() === lang, 3000);
    if (this.win) await frames(this.win, 2);
  }

  async click(target: Target, opts?: { timeout?: number }): Promise<boolean> {
    const el = await this.waitFor<HTMLElement>(target, { timeout: opts?.timeout ?? 3000 });
    if (!el) return false;
    el.click();
    return true;
  }

  /** Sends Escape to whatever has focus in the statement (closes drawers, popovers, modals). */
  async escape(times = 1): Promise<void> {
    const doc = this.doc;
    const win = this.win;
    if (!doc || !win) return;
    for (let i = 0; i < times; i++) {
      const target = (doc.activeElement as HTMLElement | null) ?? doc.body;
      const init: KeyboardEventInit = { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true } as KeyboardEventInit;
      target.dispatchEvent(new win.KeyboardEvent('keydown', init));
      target.dispatchEvent(new win.KeyboardEvent('keyup', init));
      await sleep(80);
    }
  }

  /** Scrolls the element into view inside the statement and resolves when scrolling settles. */
  async reveal(el: Element, block: 'start' | 'center' | 'nearest' = 'center'): Promise<void> {
    const win = this.win;
    if (!win) return;
    const rect = el.getBoundingClientRect();
    const vh = win.innerHeight;
    const fixed = hasFixedAncestor(el);
    if (!fixed) {
      const margin = 24;
      const fitsCentered = rect.height < vh - margin * 2;
      let top: number;
      if (block === 'start' || !fitsCentered) top = win.scrollY + rect.top - margin * 1.5;
      else top = win.scrollY + rect.top - (vh - rect.height) / 2;
      top = Math.max(0, top);
      if (Math.abs(top - win.scrollY) > 4) {
        const smooth = !win.matchMedia('(prefers-reduced-motion: reduce)').matches;
        win.scrollTo({ top, behavior: smooth ? 'smooth' : ('instant' as ScrollBehavior) });
        await this.settleScroll();
      }
    } else {
      el.scrollIntoView({ block: 'nearest' });
    }
    await frames(win, 1);
  }

  private async settleScroll(): Promise<void> {
    const win = this.win;
    if (!win) return;
    let last = -1;
    let still = 0;
    const end = performance.now() + 1600;
    while (performance.now() < end && still < 4) {
      await frames(win, 1);
      const y = win.scrollY;
      still = Math.abs(y - last) < 0.5 ? still + 1 : 0;
      last = y;
    }
  }

  highlight(): HighlightRing | null {
    const doc = this.doc;
    if (!doc) return null;
    if (!this.ring || !this.ring.attachedTo(doc)) this.ring = new HighlightRing(doc);
    return this.ring;
  }

  dispose(): void {
    this.ring?.destroy();
    this.ring = null;
  }
}

function hasFixedAncestor(el: Element): boolean {
  let n: Element | null = el;
  const win = el.ownerDocument.defaultView;
  while (n && win) {
    const pos = win.getComputedStyle(n).position;
    if (pos === 'fixed' || pos === 'sticky') return true;
    n = n.parentElement;
  }
  return false;
}

const RING_CSS = `
#sx-ring{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483600;pointer-events:none;
  border-radius:var(--sx-r,18px);border:3px solid #E5833B;opacity:0;
  box-shadow:0 0 0 5px rgba(229,131,59,.28),0 0 0 200vmax var(--sx-dim,rgba(29,22,17,.30));
  transition:opacity .35s ease,box-shadow .35s ease}
#sx-ring.sx-on{opacity:1}
#sx-ring.sx-move{transition:transform .6s cubic-bezier(.2,.8,.2,1),width .6s cubic-bezier(.2,.8,.2,1),
  height .6s cubic-bezier(.2,.8,.2,1),opacity .35s ease,box-shadow .35s ease}
#sx-ring.sx-nodim{box-shadow:0 0 0 5px rgba(229,131,59,.28)}
#sx-ring::after{content:"";position:absolute;inset:-3px;border-radius:inherit;border:3px solid #E5833B;opacity:0}
#sx-ring.sx-pulse::after{animation:sx-pulse 1.1s ease-out 1}
#sx-ring .sx-tag{position:absolute;left:-3px;bottom:calc(100% + 8px);display:flex;align-items:center;gap:8px;
  padding:5px 12px 5px 5px;border-radius:999px;background:#1D1A18;color:#fff;white-space:nowrap;
  font:600 13px/1.2 'Inter Variable','Inter',system-ui,sans-serif;box-shadow:0 8px 24px -8px rgba(0,0,0,.45)}
#sx-ring .sx-tag b{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#E5833B;color:#1D1A18;font-size:12px}
#sx-ring.sx-tag-below .sx-tag{bottom:auto;top:calc(100% + 8px)}
#sx-ring.sx-tag-left .sx-tag{bottom:auto;top:10px;left:auto;right:calc(100% + 10px)}
#sx-ring.sx-tag-inside .sx-tag{bottom:10px;left:10px}
@keyframes sx-pulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){#sx-ring,#sx-ring.sx-move{transition:opacity .2s}#sx-ring.sx-pulse::after{animation:none}}
`;

export type RingOptions = { padding?: number; radius?: number; label?: string; index?: number; dim?: boolean };

/** An orange frame that glides between features and dims the rest of the page. */
export class HighlightRing {
  private doc: Document;
  private el: HTMLDivElement;
  private tag: HTMLDivElement;
  private target: Element | null = null;
  private opts: RingOptions = {};
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private mo: MutationObserver | null = null;
  private onScroll = () => this.schedule();

  constructor(doc: Document) {
    this.doc = doc;
    if (!doc.getElementById('sx-ring-style')) {
      const style = doc.createElement('style');
      style.id = 'sx-ring-style';
      style.textContent = RING_CSS;
      doc.head.appendChild(style);
    }
    doc.getElementById('sx-ring')?.remove();
    this.el = doc.createElement('div');
    this.el.id = 'sx-ring';
    this.el.setAttribute('aria-hidden', 'true');
    this.tag = doc.createElement('div');
    this.tag.className = 'sx-tag';
    this.el.appendChild(this.tag);
    doc.body.appendChild(this.el);
    const win = doc.defaultView!;
    win.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
    win.addEventListener('resize', this.onScroll, { passive: true });
    // Content above the target can change (language switch, expanding panels): re-measure.
    this.mo = new MutationObserver((records) => {
      if (records.some((r) => !this.el.contains(r.target))) this.schedule();
    });
    this.mo.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-expanded'] });
  }

  /** Re-measure the current target now. */
  refresh(): void {
    this.schedule();
  }

  attachedTo(doc: Document): boolean {
    return this.doc === doc && doc.body.contains(this.el);
  }

  /** Glide to a new element. */
  moveTo(target: Element, opts: RingOptions = {}): void {
    this.target = target;
    this.opts = opts;
    this.ro?.disconnect();
    this.ro = new ResizeObserver(() => this.schedule());
    this.ro.observe(target);
    this.tag.innerHTML = '';
    if (opts.label) {
      if (opts.index != null) {
        const b = this.doc.createElement('b');
        b.textContent = String(opts.index);
        this.tag.appendChild(b);
      }
      this.tag.appendChild(this.doc.createTextNode(opts.label));
      this.tag.style.display = '';
    } else {
      this.tag.style.display = 'none';
    }
    this.el.classList.toggle('sx-nodim', opts.dim === false);
    this.el.style.setProperty('--sx-r', `${opts.radius ?? 18}px`);
    const wasOn = this.el.classList.contains('sx-on');
    this.el.classList.toggle('sx-move', wasOn);
    this.place();
    this.el.classList.add('sx-on');
    this.el.classList.remove('sx-pulse');
    void this.el.offsetWidth;
    this.el.classList.add('sx-pulse');
    // After the glide, follow scrolling/resizing without easing.
    window.setTimeout(() => this.el.classList.remove('sx-move'), 650);
  }

  hide(): void {
    this.target = null;
    this.ro?.disconnect();
    this.el.classList.remove('sx-on', 'sx-move');
  }

  destroy(): void {
    this.hide();
    this.mo?.disconnect();
    const win = this.doc.defaultView;
    win?.removeEventListener('scroll', this.onScroll, { capture: true } as EventListenerOptions);
    win?.removeEventListener('resize', this.onScroll);
    this.el.remove();
  }

  private schedule(): void {
    if (!this.target) return;
    const win = this.doc.defaultView;
    if (!win) return;
    win.cancelAnimationFrame(this.raf);
    this.raf = win.requestAnimationFrame(() => this.place());
  }

  private place(): void {
    const t = this.target;
    const win = this.doc.defaultView;
    if (!t || !win) return;
    if (!t.isConnected) {
      this.hide();
      return;
    }
    const pad = this.opts.padding ?? 10;
    const r = t.getBoundingClientRect();
    const vw = win.innerWidth;
    const vh = win.innerHeight;
    // Keep the frame inside the viewport so its border stays visible.
    const x = Math.max(4, r.left - pad);
    const y = Math.max(4, r.top - pad);
    const w = Math.min(vw - 4, r.right + pad) - x;
    const h = Math.min(vh - 4, r.bottom + pad) - y;
    this.el.style.transform = `translate(${x}px, ${y}px)`;
    this.el.style.width = `${Math.max(0, w)}px`;
    this.el.style.height = `${Math.max(0, h)}px`;
    const top = y >= 44;
    const below = !top && y + h < vh - 44;
    const left = !top && !below && x > 190;
    this.el.classList.toggle('sx-tag-below', below);
    this.el.classList.toggle('sx-tag-left', left);
    this.el.classList.toggle('sx-tag-inside', !top && !below && !left);
  }
}
