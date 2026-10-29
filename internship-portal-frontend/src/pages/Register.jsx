import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { register } from '../api/auth';
import { getErrorMessage } from '../api/client';
import StatusMessage from '../components/StatusMessage';
import AuthHero from './AuthHero';

export default function Register() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '', confirm_password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const username = form.username.trim();
    const password = form.password.trim();
    const confirm = form.confirm_password.trim();

    // Same validation order and messages as the Flask route.
    if (!username || !password || !confirm) {
      setFlash({ category: 'error', message: 'Please fill all fields' });
      return;
    }
    if (password !== confirm) {
      setFlash({ category: 'error', message: 'Passwords do not match' });
      return;
    }

    setSubmitting(true);
    setFlash(null);
    try {
      const res = await register(username, password, confirm);
      navigate('/login', {
        replace: true,
        state: { flash: { category: 'success', message: res.message } },
      });
    } catch (err) {
      const status = err?.response?.status;
      setFlash({
        category: 'error',
        message: status === 409 ? 'Username already exists' : getErrorMessage(err),
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
            title={t('Join Internship Portal')}
            text={t('Create your account to access personalized internship recommendations and more.')}
          />
          <div className="login-right">
            <h1 className="brand">{t('Internship Portal')}</h1>
            <h3>{t('Create Account')}</h3>
            <StatusMessage category={flash?.category}>{flash?.message}</StatusMessage>
            <form className="login-form" onSubmit={onSubmit}>
              <label htmlFor="username">{t('Username or Email')}</label>
              <input
                type="text"
                id="username"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder={t('Enter your username or email')}
                autoComplete="username"
                required
              />
              <label htmlFor="password">{t('Password')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder={t('Enter password')}
                autoComplete="new-password"
                required
              />
              <label htmlFor="confirm_password">{t('Confirm Password')}</label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={onChange}
                placeholder={t('Confirm password')}
                autoComplete="new-password"
                required
              />
              <button className="btn primary" type="submit" disabled={submitting}>
                {submitting ? '…' : t('Register')}
              </button>
            </form>
            <p className="muted">
              {t('Already have an account?')} <Link to="/login">{t('Login here')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
