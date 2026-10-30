
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ITEMS = [
  { to: '/main_menu', icon: 'fa-house', label: 'Dashboard' },
  { to: '/profile', icon: 'fa-user', label: 'Profile' },
  { to: '/assessment', icon: 'fa-clipboard-list', label: 'Assessment Test' },
  { to: '/applications', icon: 'fa-folder-open', label: 'Application Management' },
  { to: '/private_internships', icon: 'fa-user-lock', label: 'Private Internships' },
  { to: '/government_internships', icon: 'fa-building-columns', label: 'Government Internships' },
  { to: '/interview-feedback', icon: 'fa-comments', label: 'Interview Feedback' },
  { to: '/feedback', icon: 'fa-star', label: 'Feedback' },
];
export default function Sidebar() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();

    navigate('/login', {
      replace: true,
      state: {
        flash: {
          category: 'success',
          message: 'Logged out successfully'
        }
      }
    });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <i className="fa-solid fa-briefcase" />
        <span>{t('Internship Portal')}</span>
      </div>

      <nav>
        <ul>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                title={t(item.label)}
                className={({ isActive }) =>
                  `side-link${isActive ? ' active' : ''}`
                }
              >
                <i className={`fa-solid ${item.icon}`} />
                <span>{t(item.label)}</span>
              </NavLink>
            </li>
          ))}

          <li>
            <button
              type="button"
              className="side-link side-button"
              onClick={handleLogout}
              title={t('Logout')}
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span>{t('Logout')}</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
