import { useEffect } from 'react';

// Same look as the original `.toast-notification` (shown for ~2.2s).
export default function Toast({ message, onDone, duration = 2200 }) {
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(id);
  }, [message, duration, onDone]);

  return (
    <div id="toast" className={`toast-notification${message ? ' show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
