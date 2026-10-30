
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
import InterviewFeedback from './pages/InterviewFeedback';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<LanguageSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected pages */}
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

        {/* PATH-AI */}
        <Route
          path="/interview-feedback"
          element={<InterviewFeedback />}
        />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="/dashboard"
        element={<Navigate to="/main_menu" replace />}
      />

      <Route
        path="/logout"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}
