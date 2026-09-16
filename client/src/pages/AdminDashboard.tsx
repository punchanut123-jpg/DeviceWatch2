import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { AdminStats, Ticket } from '../types';

const STATUS_LABEL: Record<string, string> = {
  open: 'รอซ่อม',
  in_progress: 'กำลังซ่อม',
  resolved: 'ซ่อมเสร็จ',
};

function StatCard({
  label, value, color, icon,
}: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <div className="ticket-card">
      <div className="ticket-card-header">
        <div>
          <span className="ticket-id">#{ticket.id}</span>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.2rem' }}>
            ห้อง {ticket.device?.room?.name} — {ticket.device?.name}
          </div>
          {(ticket.student || ticket.reportedBy) && (() => {
            const reporter = ticket.student || ticket.reportedBy;
            if (!reporter) return null;
            return (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                👤 แจ้งโดย: {reporter.name} {reporter.studentId ? `(${reporter.studentId})` : ''}
              </div>
            );
          })()}
        </div>
        <span className={`badge badge-${ticket.status}`}>
          {STATUS_LABEL[ticket.status]}
        </span>
      </div>
      <p className="ticket-desc">{ticket.description}</p>
      <div className="ticket-meta">
        <span>🕐 {new Date(ticket.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { token, username, role, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.admin.stats(token)
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/logo.png" alt="IT Faculty Logo" style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', padding: 2, objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-en)', fontWeight: 700, fontSize: '0.95rem', color: 'white', lineHeight: 1.2 }}>
              DeviceWatch
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>
              {role === 'admin' ? 'Admin' : 'Teacher'}: {username}
            </div>
          </div>
        </div>

        <Link to="/admin" className="admin-nav-item active">
          📊 ภาพรวม
        </Link>
        <Link to="/admin/tickets" className="admin-nav-item">
          🎫 จัดการ Ticket
        </Link>
        <Link to="/admin/rooms/37/editor" className="admin-nav-item">
          🗺️ จัดผังห้อง 26201
        </Link>
        <Link to="/" className="admin-nav-item">
          🏠 หน้าแจ้งซ่อม
        </Link>

        <div style={{ flex: 1 }} />
        <button className="admin-nav-item" style={{ color: 'var(--danger)', marginTop: 'auto' }} onClick={handleLogout}>
          🚪 ออกจากระบบ
        </button>
      </aside>

      {/* Main */}
      <div className="admin-content">
        {/* Top bar (mobile) */}
        <div className="admin-topbar">
          <div style={{ fontWeight: 700 }}>📊 ภาพรวมระบบ {role === 'teacher' && <span className="badge" style={{ marginLeft: '0.5rem', background: '#FEF3C7', color: '#92400E' }}>โหมดดูอย่างเดียว</span>}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/admin/tickets" className="btn btn-ghost btn-sm">🎫 Tickets</Link>
            <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={handleLogout}>
              ออก
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
          {error && <div className="alert alert-error mb-2">⚠️ {error}</div>}

          {loading ? (
            <div className="loading-center"><div className="spinner" /><span>กำลังโหลด...</span></div>
          ) : stats ? (
            <>
              {/* Device Stats */}
              <h2 className="section-title">สถานะอุปกรณ์</h2>
              <div className="stats-grid mb-2">
                <StatCard icon="💻" label="ทั้งหมด" value={stats.devices.total} color="var(--text)" />
                <StatCard icon="✅" label="ปกติ" value={stats.devices.normal} color="var(--success)" />
                <StatCard icon="❌" label="เสีย" value={stats.devices.broken} color="var(--danger)" />
                <StatCard icon="🔧" label="ซ่อมอยู่" value={stats.devices.underRepair} color="var(--warning)" />
              </div>

              {/* Ticket Stats */}
              <h2 className="section-title mt-2">สถานะ Ticket</h2>
              <div className="stats-grid mb-2">
                <StatCard icon="🎫" label="ทั้งหมด" value={stats.tickets.total} color="var(--text)" />
                <StatCard icon="🔴" label="รอซ่อม" value={stats.tickets.open} color="var(--danger)" />
                <StatCard icon="🟡" label="กำลังซ่อม" value={stats.tickets.inProgress} color="var(--warning)" />
                <StatCard icon="🟢" label="เสร็จแล้ว" value={stats.tickets.resolved} color="var(--success)" />
              </div>

              {/* Recent Tickets */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', marginTop: '1.5rem' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>แจ้งซ่อมล่าสุด</h2>
                <Link to="/admin/tickets" className="btn btn-ghost btn-sm">ดูทั้งหมด →</Link>
              </div>

              {stats.recentTickets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎉</div>
                  <div className="empty-state-text">ไม่มีการแจ้งซ่อมที่ค้างอยู่</div>
                </div>
              ) : (
                <div className="ticket-list">
                  {stats.recentTickets.map((t: Ticket) => (
                    <TicketRow key={t.id} ticket={t} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
