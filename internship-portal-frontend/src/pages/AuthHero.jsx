import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const HERO_REMOTE =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop';

// Left panel shared by the login and register screens.
export default function AuthHero({ title, text }) {
  const { t } = useLanguage();
  const [src, setSrc] = useState(HERO_REMOTE);
  return (
    <div className="login-left">
      <h2>{title}</h2>
      <p>{text}</p>
      <img
        src={src}
        alt={t('Internship')}
        className="hero-img"
        onError={() => setSrc('/images/internship-hero.svg')}
      />
    </div>
  );
}
