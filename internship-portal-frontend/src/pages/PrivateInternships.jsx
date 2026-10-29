import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getInternships } from '../api/internships';
import { applyToInternship } from '../api/applications';
import { getErrorMessage } from '../api/client';
import Toast from '../components/Toast';

export default function PrivateInternships() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    getInternships('private')
      .then((list) => active && setItems(list))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const types = useMemo(() => [...new Set(items.map((i) => i.type).filter(Boolean))].sort(), [items]);
  const locations = useMemo(() => [...new Set(items.map((i) => i.location).filter(Boolean))].sort(), [items]);

  const visible = items.filter(
    (i) => (!typeFilter || i.type === typeFilter) && (!locationFilter || i.location === locationFilter)
  );

  const apply = async (internship) => {
    try {
      const res = await applyToInternship(user?.username, { internship, category: 'private' });
      setToast(res?.duplicate ? 'You have already applied to this internship' : 'Application submitted!');
    } catch (err) {
      setToast(getErrorMessage(err));
    }
  };

  const descriptionLines = (i) => (Array.isArray(i.description) ? i.description : [i.description].filter(Boolean));

  return (
    <div className="tw">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 header-row">
          <h1 className="text-2xl font-bold text-gray-800">Private Internships List</h1>
          <div className="flex gap-4 filters">
            <select className="border rounded-lg px-3 py-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Select Internship Type">
              <option value="">Select Internship Type</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className="border rounded-lg px-3 py-2" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} aria-label="Select Location">
              <option value="">Select Location</option>
              {locations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p>Loading internships…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && visible.length === 0 && <p className="text-gray-600">No internships match your filters.</p>}

        <div className="space-y-6">
          {visible.map((i) => (
            <div key={i.id} className="bg-white shadow-md rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-700">{i.title}</h2>
              <p><span className="font-medium">📧 Email:</span> {i.email}</p>
              <p><span className="font-medium">📞 Phone No:</span> {i.phone}</p>
              <p><span className="font-medium">🎓 Qualification Required:</span> {i.qualification}</p>
              <p><span className="font-medium">📍 Location:</span> {i.location}</p>
              <p><span className="font-medium">⏰ Last Date to Apply:</span> {i.lastDate}</p>
              <p><span className="font-medium">💰 Stipend:</span> {i.stipend}</p>
              <p className="mt-2 text-gray-600">
                {descriptionLines(i).map((line, idx) => (
                  <span key={idx}>
                    {idx > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
              {selected?.id === i.id && (
                <div className="detail-box mt-4">
                  <p><span className="font-medium">Internship type:</span> {i.type || 'N/A'}</p>
                  <p><span className="font-medium">Contact:</span> {i.email} · {i.phone}</p>
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <button type="button" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600" onClick={() => apply(i)}>
                  Apply
                </button>
                <button type="button" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" onClick={() => setSelected(selected?.id === i.id ? null : i)}>
                  {selected?.id === i.id ? 'Hide Detail' : 'View Detail'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
