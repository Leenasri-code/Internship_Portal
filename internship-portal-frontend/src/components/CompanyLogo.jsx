import { useState } from 'react';

// Logo image with the original's Font Awesome briefcase as fallback (no logo / broken URL).
export default function CompanyLogo({ src }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="internship-logo">
      {src && !failed ? (
        <img src={src} alt="Logo" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <i className="fa-solid fa-briefcase" />
      )}
    </div>
  );
}
