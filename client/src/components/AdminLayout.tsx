import { Link, useNavigate } from 'react-router-dom';
import { House, LayoutDashboard, LogOut, PencilRuler, Ticket } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

type NavKey = 'dashboard' | 'tickets';

interface AdminLayoutProps {
  active: NavKey;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const NAV_ITEMS: { key: NavKey; to: string; label: string; icon: typeof House }[] = [
  { key: 'dashboard', to: '/admin', label: 'ภาพรวม', icon: LayoutDashboard },
  { key: 'tickets', to: '/admin/tickets', label: 'จัดการ Ticket', icon: Ticket },
];

export default function AdminLayout({ active, title, actions, children }: AdminLayoutProps) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/logo.png" alt="IT Faculty Logo" className="admin-brand-logo" />
          <div>
            <div className="admin-brand-name">DeviceWatch</div>
            <div className="admin-brand-role">Admin: {username}</div>
          </div>
        </div>

        {NAV_ITEMS.map((item) => (
          <Link key={item.key} to={item.to} className={`admin-nav-item ${active === item.key ? 'active' : ''}`}>
            <item.icon size={17} className="admin-nav-icon" />
            {item.label}
          </Link>
        ))}
        <Link to="/admin/rooms/37/editor" className="admin-nav-item">
          <PencilRuler size={17} className="admin-nav-icon" />
          จัดผังห้อง
        </Link>
        <Link to="/" className="admin-nav-item">
          <House size={17} className="admin-nav-icon" />
          หน้าแจ้งซ่อม
        </Link>

        <div className="admin-nav-spacer" />
        <button className="admin-nav-item admin-nav-logout" onClick={handleLogout}>
          <LogOut size={17} className="admin-nav-icon" />
          ออกจากระบบ
        </button>
      </aside>

      {/* Main */}
      <div className="admin-content">
        <div className="admin-topbar">
          <div className="admin-topbar-title">{title}</div>
          {actions && <div className="admin-topbar-actions">{actions}</div>}
        </div>
        <div className="admin-main">{children}</div>
      </div>
    </div>
  );
}
