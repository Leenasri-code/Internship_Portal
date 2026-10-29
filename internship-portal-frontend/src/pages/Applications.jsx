import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApplications } from '../api/applications';
import { getErrorMessage } from '../api/client';

const STATUS_CLASS = {
  Applied: 'status-applied',
  Reviewed: 'status-reviewed',
  Interviewing: 'status-interviewing',
  Rejected: 'status-rejected',
  Accepted: 'status-accepted',
};

export default function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    getApplications(user?.username)
      .then((list) => active && setApplications(list))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.username]);

  return (
    <div className="tw text-gray-900">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-8 border-b-2 border-blue-600 pb-2">
          <i className="fa-solid fa-folder-open text-blue-600 mr-3" />
          Application Management
        </h1>

        {loading && <p>Loading applications…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && applications.length === 0 && (
          <p className="text-gray-600">You have not applied to any internships yet.</p>
        )}

        {!selected && (
          <div id="application-list" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {applications.map((app) => (
              <div key={app.id} className="application-card bg-white p-6 rounded-lg shadow cursor-pointer" onClick={() => setSelected(app)}>
                <h3 className="text-xl font-semibold mb-2">{app.internship.title}</h3>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`px-2 py-1 rounded ${STATUS_CLASS[app.status] || ''} font-semibold`}>{app.status}</span>
                </p>
                <p><strong>Applied On:</strong> {app.applied_on}</p>
                <p><strong>Location:</strong> {app.internship.location}</p>
                <button
                  type="button"
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(app);
                  }}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div id="application-detail" className="bg-white p-8 rounded-xl shadow-lg mt-10 max-w-4xl mx-auto">
            <button type="button" onClick={() => setSelected(null)} className="mb-6 text-blue-600 hover:underline flex items-center gap-2">
              <i className="fa-solid fa-arrow-left" /> Back to Applications
            </button>
            <h2 className="text-3xl font-bold mb-4">{selected.internship.title}</h2>
            <p>
              <strong>Status:</strong>{' '}
              <span className={`px-3 py-1 rounded-lg font-semibold ${STATUS_CLASS[selected.status] || ''}`}>{selected.status}</span>
            </p>
            <p><strong>Applied On:</strong> {selected.applied_on}</p>
            <h3 className="text-xl font-semibold mt-6 mb-2">Internship Details</h3>
            <p><strong>Title:</strong> {selected.internship.title}</p>
            <p><strong>Company:</strong> {selected.internship.company}</p>
            <p><strong>Location:</strong> {selected.internship.location}</p>
            <p><strong>Duration:</strong> {selected.internship.duration}</p>
            <p><strong>Stipend:</strong> {selected.internship.stipend}</p>
            <h3 className="text-xl font-semibold mt-6 mb-2">Additional Notes</h3>
            <p>{selected.notes || 'N/A'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
