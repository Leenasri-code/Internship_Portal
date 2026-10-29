import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Loading…</div>;

  if (!user) {
    // Same behaviour as the Flask app: "Please login first"
    return (
      <Navigate
        to="/login"
        replace
        state={{ flash: { category: 'error', message: 'Please login first' }, from: location.pathname }}
      />
    );
  }
  return children;
}
