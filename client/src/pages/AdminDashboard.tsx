import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, Monitor, Ticket, User, Wrench, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { AdminStats, Ticket as TicketType } from '../types';
import AdminLayout from '../components/AdminLayout';
import StatCard from '../components/StatCard';

const STATUS_LABEL: Record<string, string> = {
  open: 'รอซ่อม',
  in_progress: 'กำลังซ่อม',
  resolved: 'ซ่อมเสร็จ',
};

function TicketRow({ ticket }: { ticket: TicketType }) {
  const reporter = ticket.student || ticket.reportedBy;
  return (
    <div className="ticket-card">
      <div className="ticket-card-header">
        <div>
          <span className="ticket-card-id">#{ticket.id}</span>
          <div className="ticket-room-line">
            ห้อง {ticket.device?.room?.name} — {ticket.device?.name}
          </div>
          {reporter && (
            <div className="ticket-reporter">
              <User size={13} />
              แจ้งโดย: {reporter.name} {reporter.studentId ? `(${reporter.studentId})` : ''}
            </div>
          )}
        </div>
        <span className={`badge badge-${ticket.status}`}>
          {STATUS_LABEL[ticket.status]}
        </span>
      </div>
      <p className="ticket-desc">{ticket.description}</p>
      <div className="ticket-meta">
        <span>
          <Clock3 size={13} /> {new Date(ticket.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { token, logout } = useAuth();
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
    <AdminLayout
      active="dashboard"
      title="ภาพรวมระบบ"
      actions={
        <>
          <Link to="/admin/tickets" className="btn btn-ghost btn-sm">Tickets</Link>
          <button className="btn btn-sm btn-danger-soft" onClick={handleLogout}>ออก</button>
        </>
      }
    >
      {error && (
        <div className="alert alert-error mb-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>กำลังโหลด...</span></div>
      ) : stats ? (
        <>
          <h2 className="section-title">สถานะอุปกรณ์</h2>
          <div className="stats-grid mb-2">
            <StatCard icon={Monitor} label="ทั้งหมด" value={stats.devices.total} />
            <StatCard icon={CheckCircle2} label="ปกติ" value={stats.devices.normal} tone="success" />
            <StatCard icon={XCircle} label="เสีย" value={stats.devices.broken} tone="danger" />
            <StatCard icon={Wrench} label="ซ่อมอยู่" value={stats.devices.underRepair} tone="warning" />
          </div>

          <h2 className="section-title mt-2">สถานะ Ticket</h2>
          <div className="stats-grid mb-2">
            <StatCard icon={Ticket} label="ทั้งหมด" value={stats.tickets.total} />
            <StatCard icon={AlertCircle} label="รอซ่อม" value={stats.tickets.open} tone="danger" />
            <StatCard icon={Clock3} label="กำลังซ่อม" value={stats.tickets.inProgress} tone="warning" />
            <StatCard icon={CheckCircle2} label="เสร็จแล้ว" value={stats.tickets.resolved} tone="success" />
          </div>

          <div className="admin-section-head">
            <h2 className="section-title">แจ้งซ่อมล่าสุด</h2>
            <Link to="/admin/tickets" className="btn btn-ghost btn-sm">ดูทั้งหมด</Link>
          </div>

          {stats.recentTickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CheckCircle2 size={42} /></div>
              <div className="empty-state-text">ไม่มีการแจ้งซ่อมที่ค้างอยู่</div>
            </div>
          ) : (
            <div className="ticket-list">
              {stats.recentTickets.map((t: TicketType) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </AdminLayout>
  );
}
