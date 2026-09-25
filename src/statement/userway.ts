// The statement loads the UserWay accessibility widget from UserWay's servers. When it is
// available the tour opens it through UserWay's JavaScript API; when a network policy or a
// content blocker stops it, the tour explains what the widget offers instead.
import { isVisible, sleep, type StatementDriver } from './driver';

const ICON = '#userwayAccessibilityIcon, .userway_buttons_wrapper, [class*="userway_buttons"]';

type UserWayApi = { widgetOpen?: () => void; widgetClose?: () => void };

function api(d: StatementDriver): UserWayApi | undefined {
  try {
    return (d.win as unknown as { UserWay?: UserWayApi } | null)?.UserWay;
  } catch {
    return undefined;
  }
}

export async function detectUserWay(d: StatementDriver, timeout = 8000): Promise<HTMLElement | null> {
  return d.waitFor<HTMLElement>(ICON, { timeout, visible: true });
}

/** Opens the widget and returns the element worth highlighting (its panel, else its button). */
export async function openUserWay(d: StatementDriver): Promise<HTMLElement | null> {
  const icon = await detectUserWay(d, 2500);
  if (!icon) return null;
  const uw = api(d);
  try {
    if (uw?.widgetOpen) uw.widgetOpen();
    else icon.click();
  } catch {
    icon.click();
  }
  await sleep(1100);
  const doc = d.doc;
  if (!doc) return icon;
  let best: HTMLElement | null = null;
  let bestArea = 0;
  doc.querySelectorAll<HTMLElement>('iframe, [class*="userway"], [id*="userway"]').forEach((el) => {
    if (el === icon || el.contains(icon) || !isVisible(el)) return;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (r.width > 220 && r.height > 220 && area > bestArea) {
      best = el;
      bestArea = area;
    }
  });
  return best ?? icon;
}

export function closeUserWay(d: StatementDriver): void {
  try {
    api(d)?.widgetClose?.();
  } catch {
    /* ignore */
  }
}

export const USERWAY_FEATURES = [
  'Contrast and color modes',
  'Bigger text and text spacing',
  'Dyslexia-friendly font',
  'Highlight links',
  'Reading guide and mask',
  'Pause animations',
  'Larger cursor',
  'Page structure overview',
];
