import type { StatementDriver } from './driver';
import { closeUserWay } from './userway';

export type Overlay = 'none' | 'sepi' | 'term' | 'inquiry' | 'userway';

/** Closes whatever the statement is showing on top of the page, except `keep`. */
export async function closeOverlays(d: StatementDriver, keep: Overlay = 'none'): Promise<void> {
  if (keep !== 'sepi' && d.query('aside.sepi-drawer')) {
    d.query<HTMLButtonElement>('.sepi-head-actions .sepi-icon-btn:last-child')?.click();
    await d.until(() => !d.query('aside.sepi-drawer'), 1500);
  }
  if (keep !== 'term' && d.query('.popover.term-pop')) {
    await d.escape();
    await d.until(() => !d.query('.popover.term-pop'), 800);
  }
  if (keep !== 'inquiry' && d.query('.modal[role="dialog"]')) {
    d.query<HTMLButtonElement>('.modal-head .icon-btn')?.click();
    // A started question asks for confirmation before it is discarded.
    const discard = await d.waitFor<HTMLButtonElement>('.inq-discard-actions button:last-child', { timeout: 700 });
    discard?.click();
    await d.until(() => !d.query('.modal[role="dialog"]'), 1500);
    if (d.query('.modal[role="dialog"]')) await d.escape(2);
  }
  if (keep !== 'userway') closeUserWay(d);
}
