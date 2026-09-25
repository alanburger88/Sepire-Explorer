import { Lock } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StatementDriver } from '../statement/driver';

export type Device = 'desktop' | 'mobile';

type Props = {
  device: Device;
  /** Initial iframe URL. Changing it reloads the statement. */
  src: string;
  title?: string;
  /** Logical desktop viewport width in CSS px. */
  desktopWidth?: number;
  onReady?: (driver: StatementDriver) => void;
  onLoading?: () => void;
  className?: string;
  urlLabel?: string;
  children?: React.ReactNode;
};

const PHONE = { w: 390, h: 844, bezel: 12, status: 46 };
const CHROME_H = 38;

/**
 * Hosts the live statement in a same-origin iframe inside a desktop-browser or phone frame,
 * scaled to fit the available space. The iframe element is kept across device switches so the
 * statement keeps its state.
 */
export function StatementStage({ device, src, title = 'Interactive statement', desktopWidth = 1280, onReady, onLoading, className = '', urlLabel, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(true);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const loadingRef = useRef(onLoading);
  loadingRef.current = onLoading;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((b) => (Math.abs(b.w - width) < 1 && Math.abs(b.h - height) < 1 ? b : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    const pad = 28;
    if (device === 'mobile') {
      const fw = PHONE.w + PHONE.bezel * 2;
      const fh = PHONE.h + PHONE.bezel * 2;
      const scale = Math.max(0.3, Math.min(1, (box.h - pad * 2) / fh, (box.w - pad * 2) / fw));
      return { scale, vw: PHONE.w, vh: PHONE.h - PHONE.status, status: PHONE.status };
    }
    const scale = Math.max(0.3, Math.min(1, (box.w - pad * 2) / desktopWidth));
    const vh = Math.max(480, Math.floor((box.h - pad * 2 - CHROME_H) / scale));
    return { scale, vw: desktopWidth, vh, status: 0 };
  }, [box, device, desktopWidth]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;
    const onLoad = async () => {
      const driver = new StatementDriver(iframe);
      const ok = await driver.ready();
      if (cancelled) return;
      setLoading(false);
      if (ok) readyRef.current?.(driver);
    };
    iframe.addEventListener('load', onLoad);
    return () => {
      cancelled = true;
      iframe.removeEventListener('load', onLoad);
    };
  }, []);

  // A new src means a reload (e.g. live data): show the loading state until the app is ready.
  useEffect(() => {
    setLoading(true);
    loadingRef.current?.();
  }, [src]);

  const screenW = g.vw * g.scale;
  const screenH = (g.vh + g.status) * g.scale;

  return (
    <div className={`stage ${className}`} ref={wrapRef}>
      <div className={`device device-${device}`} style={{ '--screen-w': `${screenW}px`, '--screen-h': `${screenH}px` } as React.CSSProperties}>
        {device === 'desktop' && (
          <div className="device-chrome" aria-hidden="true">
            <span className="device-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="device-url">
              <Lock size={12} />
              {urlLabel ?? 'Your 401(k) statement · Sepire'}
            </span>
          </div>
        )}
        <div className="device-screen" style={{ width: screenW, height: screenH }}>
          <div key="status" className="device-status" aria-hidden="true" style={{ height: g.status * g.scale, fontSize: 15 * g.scale }}>
            {g.status > 0 && (
              <>
                <span>9:41</span>
                <span className="device-status-icons">
                  <i />
                  <i />
                  <b />
                </span>
              </>
            )}
          </div>
          <div key="viewport" className="device-viewport" style={{ width: screenW, height: g.vh * g.scale }}>
            <iframe
              ref={iframeRef}
              src={src}
              title={title}
              allow="clipboard-write; fullscreen"
              style={{ width: g.vw, height: g.vh, transform: `scale(${g.scale})` }}
            />
          </div>
          {loading && (
            <div key="loading" className="device-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              Loading the interactive statement…
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
