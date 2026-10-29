import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../api/client';
import StatusMessage from '../components/StatusMessage';
import AuthHero from './AuthHero';

export default function Login() {
  const { t } = useLanguage();
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(location.state?.flash || null);

  if (!loading && user) return <Navigate to="/main_menu" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) {
      setFlash({ category: 'error', message: 'Please enter username and password' });
      return;
    }
    setSubmitting(true);
    setFlash(null);
    try {
      await login(u, p);
      const next = location.state?.from && location.state.from !== '/login' ? location.state.from : '/main_menu';
      navigate(next, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      setFlash({
        category: 'error',
        message: status === 401 || status === 400 ? 'Invalid username or password' : getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="page-center">
        <div className="login-card">
          <AuthHero
            title={t('Find the best internships')}
            text={t('Personalized recommendations • Track applications • Skill tests')}
          />
          <div className="login-right">
            <h1 className="brand">{t('Internship Portal')}</h1>
            <h3>{t('Welcome Back')}</h3>
            <StatusMessage category={flash?.category}>{flash?.message}</StatusMessage>
            <form className="login-form" onSubmit={onSubmit}>
              <label htmlFor="username">{t('Username or Email:')}</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
              <label htmlFor="password">{t('Password:')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button className="btn primary" type="submit" disabled={submitting}>
                {submitting ? '…' : t('Log In')}
              </button>
            </form>
            <p className="muted">
              {t('New here?')} <Link to="/register">{t('Register now')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
