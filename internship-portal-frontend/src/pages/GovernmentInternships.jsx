import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getInternships } from '../api/internships';
import { applyToInternship } from '../api/applications';
import { getErrorMessage } from '../api/client';
import Toast from '../components/Toast';

export default function GovernmentInternships() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    getInternships('government')
      .then((list) => active && setItems(list))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const apply = async (internship) => {
    try {
      const res = await applyToInternship(user?.username, { internship, category: 'government' });
      setToast(res?.duplicate ? 'You have already applied to this internship' : 'Application submitted!');
    } catch (err) {
      setToast(getErrorMessage(err));
    }
  };

  return (
    <div className="tw text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-8 border-b-2 border-blue-600 pb-2 flex items-center">
          <i className="fa-solid fa-building-columns text-blue-600 mr-3" />
          Government Internships
        </h1>

        {loading && <p>Loading internships…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!selected && (
          <div id="internship-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((internship) => (
              <div key={internship.id} className="gov-card bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold mb-2">{internship.title}</h3>
                <p><strong>Stipend:</strong> {internship.stipend}</p>
                <p><strong>Location:</strong> {internship.location}</p>
                <p><strong>Last Date:</strong> {internship.lastDate}</p>
                <div className="mt-4 flex gap-3">
                  <button type="button" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600" onClick={() => apply(internship)}>
                    Apply
                  </button>
                  <button type="button" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" onClick={() => setSelected(internship)}>
                    View Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div id="internship-detail" className="bg-white p-8 rounded-xl shadow-lg mt-10 max-w-4xl mx-auto">
            <button type="button" onClick={() => setSelected(null)} className="mb-6 text-blue-600 hover:underline flex items-center gap-2">
              <i className="fa-solid fa-arrow-left" /> Back to List
            </button>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{selected.title}</h2>
            <p className="text-xl text-green-600 font-semibold mb-2">Stipend: {selected.stipend}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 mb-6 text-gray-700">
              <p><i className="fa-solid fa-envelope mr-2 text-blue-600" />Email: {selected.email}</p>
              <p><i className="fa-solid fa-phone mr-2 text-green-600" />Phone: {selected.phone}</p>
              <p><i className="fa-solid fa-location-dot mr-2 text-red-600" />Location: {selected.location}</p>
              <p><i className="fa-solid fa-building mr-2 text-indigo-600" />Department: {selected.department}</p>
            </div>
            <h3 className="text-xl font-semibold mb-2">Who Can Apply</h3>
            <p className="mb-4">{selected.apply}</p>
            <h3 className="text-xl font-semibold mb-2">Description</h3>
            <p className="mb-4">{selected.description}</p>
            <h3 className="text-xl font-semibold mb-2">Terms of Engagement</h3>
            <p className="mb-4">{selected.terms}</p>
            <h3 className="text-xl font-semibold mb-2">Perks</h3>
            <p className="mb-6">{selected.perks}</p>
            <button type="button" className="bg-green-600 text-white font-bold px-8 py-3 rounded-lg shadow hover:bg-green-700 transition" onClick={() => apply(selected)}>
              <i className="fa-solid fa-check mr-2" /> Apply Now
            </button>
          </div>
        )}
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
