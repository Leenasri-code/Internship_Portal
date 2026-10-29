import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getInternships } from '../api/internships';
import { applyToInternship, getApplications } from '../api/applications';
import { getErrorMessage } from '../api/client';
import CompanyLogo from '../components/CompanyLogo';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getInternships('recommended'), getApplications(user?.username)])
      .then(([list, apps]) => {
        if (!active) return;
        setInternships(list);
        setApplications(apps);
      })
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.username]);

  // Search button behaviour from the original: title / company / location contains query.
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return internships;
    return internships.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.company.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q)
    );
  }, [internships, query]);

  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const shortlistedCount = applications.filter((a) => a.status === 'Interviewing').length;

  const handleApply = useCallback(
    async (internship) => {
      try {
        const res = await applyToInternship(user?.username, { internship, category: 'recommended' });
        if (res?.duplicate) {
          setToast('You have already applied to this internship');
          return;
        }
        setApplications(await getApplications(user?.username));
        setToast('Application submitted!');
      } catch (err) {
        setToast(getErrorMessage(err));
      }
    },
    [user?.username]
  );

  return (
    <>
      <header className="page-header">
        <h1>
          {t('Welcome,')} <span id="usernameDisplay">{user?.username}</span>
        </h1>
      </header>

      <section className="top-picks-header">
        <h2>{t('Top picks for you')}</h2>
        <p className="subtitle">{t('Handpicked roles to match your skills')}</p>
        <div className="info-cards">
          <div className="info-card">
            <h3 id="recommendedCount">{internships.length}</h3>
            <p>
              {t('Recommended')}
              <br />
              <small>{t('Based on your profile')}</small>
            </p>
          </div>
          <div className="info-card">
            <h3 id="appliedCount">{appliedCount}</h3>
            <p>
              {t('Applied')}
              <br />
              <small>{t('Applications in progress')}</small>
            </p>
          </div>
          <div className="info-card">
            <h3 id="shortlistedCount">{shortlistedCount}</h3>
            <p>
              {t('Shortlisted')}
              <br />
              <small>{t('Interview invites')}</small>
            </p>
          </div>
          <form
            className="search-bar-header"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(searchInput);
            }}
          >
            <input
              type="text"
              id="internshipSearch"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('Search internships, companies, locations...')}
            />
            <button type="submit" id="searchBtn">
              {t('Search')}
            </button>
          </form>
        </div>
      </section>

      <section className="internship-grid" id="internshipList">
        {loading && <p>Loading internships…</p>}
        {!loading && error && <p className="error-text">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p>No internships found.</p>}
        {filtered.map((i) => (
          <div className="internship-card" key={i.id || `${i.title}-${i.company}`}>
            <CompanyLogo src={i.logo} />
            <h3>{i.title}</h3>
            <p>
              <i className="fa-solid fa-building" /> <strong>Company:</strong> {i.company}
            </p>
            <p>
              <i className="fa-solid fa-location-dot" /> <strong>Location:</strong> {i.location}
            </p>
            <p>
              <i className="fa-solid fa-clock" /> <strong>Duration:</strong> {i.duration}
            </p>
            <p>
              <i className="fa-solid fa-calendar" /> <strong>Apply by:</strong> {i.applyBy}
            </p>
            <p>
              <i className="fa-solid fa-coins" /> <strong>Stipend:</strong> {i.stipend}
            </p>
            <div className="internship-buttons">
              <button type="button" className="btn apply" onClick={() => handleApply(i)}>
                Apply Now
              </button>
              <button type="button" className="btn view" onClick={() => setSelected(i)}>
                View
              </button>
            </div>
          </div>
        ))}
      </section>

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <CompanyLogo src={selected.logo} />
          <dl className="detail-list">
            <dt>Company</dt>
            <dd>{selected.company}</dd>
            <dt>Location</dt>
            <dd>{selected.location}</dd>
            <dt>Duration</dt>
            <dd>{selected.duration}</dd>
            <dt>Apply by</dt>
            <dd>{selected.applyBy}</dd>
            <dt>Stipend</dt>
            <dd>{selected.stipend}</dd>
          </dl>
          <button
            type="button"
            className="btn apply"
            onClick={() => {
              handleApply(selected);
              setSelected(null);
            }}
          >
            Apply Now
          </button>
        </Modal>
      )}

      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}
