import { Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

/** The explorer is designed for desktop. Small screens get a friendly note (dismissible). */
export function DesktopNotice() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1024);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  if (!narrow || dismissed) return null;
  return (
    <div className="desktop-notice" role="dialog" aria-modal="true" aria-labelledby="desktop-notice-title">
      <div className="desktop-notice-card">
        <Monitor size={28} aria-hidden />
        <h2 id="desktop-notice-title">Best on a larger screen</h2>
        <p>
          The Statement Explorer is designed for desktop browsers. The interactive statement itself works on any
          device — you can open it directly on this one.
        </p>
        <div className="desktop-notice-actions">
          <a className="btn btn-primary" href="statement/index.html#/overview">
            Open the statement
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => setDismissed(true)}>
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
