import { useNavigate } from 'react-router-dom';
import { LANGUAGES, useLanguage } from '../context/LanguageContext';

// Original route "/" + "/set_language/<code>": pick a language, then go to login.
export default function LanguageSelect() {
  const { setLang } = useLanguage();
  const navigate = useNavigate();

  const choose = (code) => {
    setLang(code);
    navigate('/login');
  };

  return (
    <div className="language-page">
      <div className="lang-tabs">
        {LANGUAGES.map((l) => (
          <button key={l.code} type="button" className="lang-tab" onClick={() => choose(l.code)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
