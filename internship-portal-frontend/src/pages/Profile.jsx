import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getProfile, saveProfile } from '../api/profile';
import { getErrorMessage } from '../api/client';
import { ALL_SKILLS } from '../data/skills';
import { COUNTRIES, COUNTRY_CODES, countriesWithCities } from '../data/locations';
import { fileToDataUrl } from '../utils/image';
import Toast from '../components/Toast';

const EMPTY = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  country: '',
  city: '',
  countryCode: '+91',
  phone: '',
  university: '',
  degree: '',
  field_study: '',
  graduation_year: '',
  linkedin: '',
  portfolio: '',
  bio: '',
};

const DEFAULT_AVATAR = 'https://randomuser.me/api/portraits/women/44.jpg';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState(EMPTY);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [photo, setPhoto] = useState(null); // base64 data URL
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
  const [saved, setSaved] = useState(null); // data shown in the left card
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const skillBoxRef = useRef(null);

  // ---- load profile ----------------------------------------------------
  useEffect(() => {
    let active = true;
    getProfile(user?.username)
      .then((data) => {
        if (!active || !data) return;
        setForm({ ...EMPTY, ...data, graduation_year: data.graduation_year ?? '' });
        setSkills(Array.isArray(data.skills) ? data.skills : []);
        if (data.photoData) setPhoto(data.photoData);
        setSaved(data);
      })
      .catch((err) => active && setLoadError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, [user?.username]);

  const cities = useMemo(() => countriesWithCities[form.country] || [], [form.country]);
  const phoneLength = COUNTRY_CODES.find((c) => c.value === form.countryCode)?.length || 10;

  const suggestions = useMemo(() => {
    const v = skillInput.toLowerCase();
    if (!v) return [];
    return ALL_SKILLS.filter((s) => s.toLowerCase().startsWith(v)).slice(0, 7);
  }, [skillInput]);

  // close the suggestion list when clicking elsewhere (original behaviour)
  useEffect(() => {
    const onDoc = (e) => {
      if (!skillBoxRef.current?.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // ---- handlers --------------------------------------------------------
  const update = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const onChange = (e) => update(e.target.name, e.target.value);

  const onCountryChange = (e) => setForm((f) => ({ ...f, country: e.target.value, city: '' }));

  const onCountryCodeChange = (e) => setForm((f) => ({ ...f, countryCode: e.target.value, phone: '' }));

  const onPhoneChange = (e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, phoneLength));

  const addSkill = (raw = skillInput) => {
    const value = raw.trim();
    if (!value) return;
    if (!skills.some((s) => s.toLowerCase().trim() === value.toLowerCase())) {
      setSkills((s) => [...s, value]);
    }
    setSkillInput('');
    setShowSuggestions(false);
  };

  const removeSkill = (skill) => setSkills((s) => s.filter((x) => x !== skill));

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await fileToDataUrl(file));
    } catch (err) {
      setToast(err.message);
    }
    e.target.value = '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),
      photoData: photo,
      skills,
    };
    setSaving(true);
    try {
      await saveProfile(user?.username, payload);
      setSaved(payload);
      setToast('Profile saved and updated!');
    } catch (err) {
      setToast(getErrorMessage(err, 'Error saving profile.'));
    } finally {
      setSaving(false);
    }
  };

  // ---- derived sidebar-card values (same fallbacks as the original) ----
  const view = saved || {};
  const fullName = `${view.first_name || ''} ${view.last_name || ''}`.trim() || (saved ? 'Unnamed User' : t('Jenny Wilson'));
  const sidebarEmail = saved ? view.email || 'No email provided' : 'jenny.w@email.com';
  const sidebarPhone = saved
    ? view.phone
      ? `${view.countryCode || '+91'} ${view.phone}`
      : 'No phone provided'
    : '+91 9876543210';
  const sidebarLocation = saved
    ? (view.city ? `${view.city}, ` : '') + (view.country || 'No location provided')
    : t('New York, USA');
  const sidebarUniversity = saved ? view.university || 'No university provided' : t('XYZ University');

  return (
    <div className="profile-page bs-scope">
      <header className="page-header mb-5">
        <h1>
          {t('Welcome,')} {user?.username || t('User')}
        </h1>
      </header>

      {loadError && <div className="message error">{loadError}</div>}

      <div className="container-fluid">
        <div className="row g-4">
          {/* Profile sidebar info */}
          <div className="col-lg-4">
            <div className="profile-sidebar bg-white rounded-4 shadow-sm p-4 text-center">
              <img
                src={photo || avatarSrc}
                onError={() => setAvatarSrc('/images/default-avatar.svg')}
                alt={t('Profile Pic')}
                id="profileImg"
                className="profile-pic rounded-circle mb-3"
              />
              <label htmlFor="photoUpload" role="button" tabIndex={0} className="edit-link d-block mb-3">
                {t('Change Photo')}
              </label>
              <input type="file" id="photoUpload" accept="image/*" style={{ display: 'none' }} onChange={onPhotoChange} />

              <h4 id="profileName" className="fw-bold mb-3">
                {fullName}
              </h4>

              <div className="info-section small mb-4 text-start">
                <div className="mb-2">
                  <i className="fa fa-envelope me-2" />
                  <span id="sidebarEmail">{sidebarEmail}</span>
                </div>
                <div className="mb-2">
                  <i className="fa fa-phone me-2" />
                  <span id="sidebarPhone">{sidebarPhone}</span>
                </div>
                <div className="mb-2">
                  <i className="fa fa-map-marker-alt me-2" />
                  <span id="sidebarLocation">{sidebarLocation}</span>
                </div>
                <div className="mb-2">
                  <i className="fa fa-university me-2" />
                  <span id="sidebarUniversity">{sidebarUniversity}</span>
                </div>
              </div>

              <div>
                <span className="profile-label fw-semibold">{t('Specializations')}</span>
                <div id="skillsList" className="d-flex flex-wrap gap-2 mb-2">
                  {skills.map((s) => (
                    <span className="skills-badge" key={s} data-skill={s}>
                      {s}
                      <button type="button" className="remove-skill-btn" aria-label={`Remove ${s}`} onClick={() => removeSkill(s)}>
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="position-relative" ref={skillBoxRef}>
                  <input
                    type="text"
                    id="skillsInput"
                    className="form-control"
                    placeholder={t('Add a skill')}
                    autoComplete="off"
                    value={skillInput}
                    onChange={(e) => {
                      setSkillInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div id="suggestionBox" className="autocomplete-items bg-white shadow rounded w-100 position-absolute">
                      {suggestions.map((s) => (
                        <div
                          key={s}
                          className="suggestion-item"
                          onClick={() => {
                            setSkillInput(s);
                            setShowSuggestions(false);
                          }}
                        >
                          <strong>{s.slice(0, skillInput.length)}</strong>
                          {s.slice(skillInput.length)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="btn btn-primary btn-sm w-100 mt-2" onClick={() => addSkill()}>
                  {t('Add Skill')}
                </button>
              </div>
            </div>
          </div>

          {/* Profile form */}
          <div className="col-lg-8">
            <div className="card p-4 shadow-sm rounded-4">
              <h5 className="text-primary fw-semibold mb-4">{t('Account Details')}</h5>
              <form id="profileForm" onSubmit={onSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="inputUsername" className="profile-label">{t('Username')}</label>
                    <input type="text" className="form-control" id="inputUsername" name="username" value={form.username} onChange={onChange} placeholder={t('Enter username')} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputEmail" className="profile-label">{t('Email address')} <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" id="inputEmail" name="email" value={form.email} onChange={onChange} placeholder={t('Enter your email')} required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputFirstName" className="profile-label">{t('First name')} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="inputFirstName" name="first_name" value={form.first_name} onChange={onChange} placeholder={t('First name')} required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputLastName" className="profile-label">{t('Last name')} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="inputLastName" name="last_name" value={form.last_name} onChange={onChange} placeholder={t('Last name')} required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="countrySelect" className="profile-label">{t('Country')} <span className="text-danger">*</span></label>
                    <select id="countrySelect" name="country" className="form-select" value={form.country} onChange={onCountryChange} required>
                      <option value="" disabled>{t('Select a country')}</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{t(c)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="citySelect" className="profile-label">{t('City')} <span className="text-danger">*</span></label>
                    <select id="citySelect" name="city" className="form-select" value={form.city} onChange={onChange} disabled={!form.country} required>
                      <option value="" disabled>{t('Select a city')}</option>
                      {/* keep a previously saved city selectable even if it is not in our list */}
                      {form.city && !cities.includes(form.city) && <option value={form.city}>{form.city}</option>}
                      {cities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="countryCode" className="profile-label">{t('Country Code')} <span className="text-danger">*</span></label>
                    <select id="countryCode" name="countryCode" className="form-select" value={form.countryCode} onChange={onCountryCodeChange} required>
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.value} value={c.value}>{t(c.label)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label htmlFor="inputPhone" className="profile-label">{t('Phone Number')} <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      id="inputPhone"
                      name="phone"
                      value={form.phone}
                      onChange={onPhoneChange}
                      placeholder={form.phone ? t('Enter phone number') : `Enter ${phoneLength} digit phone number`}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputUniversity" className="profile-label">{t('University/College')} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="inputUniversity" name="university" value={form.university} onChange={onChange} placeholder={t('University or College')} required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputDegree" className="profile-label">{t('Degree')} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="inputDegree" name="degree" value={form.degree} onChange={onChange} placeholder={t('Degree')} required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputFieldStudy" className="profile-label">{t('Field of Study')} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="inputFieldStudy" name="field_study" value={form.field_study} onChange={onChange} placeholder={t('Field of Study')} required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputGraduationYear" className="profile-label">{t('Graduation Year')} <span className="text-danger">*</span></label>
                    <input type="number" className="form-control" id="inputGraduationYear" name="graduation_year" value={form.graduation_year} onChange={onChange} placeholder={t('Graduation Year')} min="1900" max="2100" required />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="inputLinkedIn" className="profile-label">{t('LinkedIn Profile URL')}</label>
                    <input type="url" className="form-control" id="inputLinkedIn" name="linkedin" value={form.linkedin} onChange={onChange} placeholder={t('https://linkedin.com/in/username')} />
                  </div>
                  <div className="col-12">
                    <label htmlFor="inputPortfolio" className="profile-label">{t('Portfolio/Website URL')}</label>
                    <input type="url" className="form-control" id="inputPortfolio" name="portfolio" value={form.portfolio} onChange={onChange} placeholder={t('https://yourportfolio.com')} />
                  </div>
                  <div className="col-12">
                    <label htmlFor="inputBio" className="profile-label">{t('Short Bio / About Me')}</label>
                    <textarea className="form-control" id="inputBio" name="bio" rows="3" value={form.bio} onChange={onChange} placeholder={t('Write something about yourself')} />
                  </div>
                </div>
                <button className="btn btn-primary mt-4 w-100 py-2 fs-5" type="submit" disabled={saving}>
                  {saving ? '…' : t('Save changes')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
