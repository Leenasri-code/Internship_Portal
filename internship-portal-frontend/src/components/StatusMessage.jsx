// Replacement for Flask's flashed messages ("message error" / "message success").
export default function StatusMessage({ category = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`message ${category}`} role={category === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
