import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 pt-14 lg:pt-6 max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
