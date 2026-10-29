import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

// Shared shell for every authenticated page: fixed sidebar + content area.
export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
