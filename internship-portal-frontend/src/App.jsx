import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LanguageSelect from './pages/LanguageSelect';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Assessment from './pages/Assessment';
import Applications from './pages/Applications';
import PrivateInternships from './pages/PrivateInternships';
import GovernmentInternships from './pages/GovernmentInternships';
import Feedback from './pages/Feedback';
import NotFound from './pages/NotFound';

// Route paths intentionally match the original Flask URLs.
export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<LanguageSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* authenticated pages share the sidebar layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/main_menu" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/private_internships" element={<PrivateInternships />} />
        <Route path="/government_internships" element={<GovernmentInternships />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* the original sub-pages linked to /dashboard, which never existed */}
      <Route path="/dashboard" element={<Navigate to="/main_menu" replace />} />
      <Route path="/logout" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
