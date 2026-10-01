import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, Monitor, RotateCcw, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Ticket, TicketStatus } from '../types';
import AdminLayout from '../components/AdminLayout';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'open', label: 'รอซ่อม' },
  { value: 'in_progress', label: 'กำลังซ่อม' },
  { value: 'resolved', label: 'เสร็จแล้ว' },
];

const STATUS_NEXT: Record<string, { label: string; value: TicketStatus }[]> = {
  open:        [{ label: 'รับงาน', value: 'in_progress' }, { label: 'ปิด', value: 'resolved' }],
  in_progress: [{ label: 'เสร็จแล้ว', value: 'resolved' }, { label: 'ยกเลิก', value: 'open' }],
  resolved:    [{ label: 'เปิดใหม่', value: 'open' }],
};

function TicketCard({
  ticket,
  role,
  onUpdate,
  onReset,
}: {
  ticket: Ticket;
  role: string | null;
  onUpdate: (id: number, status: string) => void;
  onReset: (deviceId: number) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const busy = updating || resetting;

  const handleUpdate = async (status: string) => {
    setUpdating(true);
    await onUpdate(ticket.id, status);
    setUpdating(false);
  };

  const handleReset = async () => {
    if (!window.confirm('ยืนยันรีเซ็ตเครื่องนี้เป็นปกติ?\nTicket ที่ค้างอยู่จะถูกปิดทั้งหมด')) return;
    setResetting(true);
    await onReset(ticket.deviceId);
    setResetting(false);
  };

  const actions = STATUS_NEXT[ticket.status] ?? [];
  const room = ticket.device?.room;
  const floor = room?.floor;
  const reporter = ticket.student || ticket.reportedBy;
  const canReset = ticket.status === 'open' || ticket.status === 'in_progress';

  return (
    <div className="ticket-card">
      <div className="ticket-card-header">
        <div className="ticket-card-main">
          <div className="ticket-card-badges">
            <span className="ticket-card-id">#{ticket.id}</span>
            <span className={`badge badge-${ticket.status}`}>
              {{ open: 'รอซ่อม', in_progress: 'กำลังซ่อม', resolved: 'เสร็จแล้ว' }[ticket.status]}
            </span>
          </div>
          <div className="ticket-device-name">
            <Monitor size={16} /> {ticket.device?.name}
          </div>
          <div className="ticket-room-line">
            ห้อง {room?.name} {floor && `(ชั้น ${floor.number})`}
          </div>
        </div>
      </div>

      <p className="ticket-desc-box">{ticket.description}</p>

      {reporter && (
        <div className="ticket-reporter">
          <User size={13} />
          แจ้งโดย: {reporter.name} {reporter.studentId ? `(${reporter.studentId})` : ''}
        </div>
      )}

      <div className="ticket-meta">
        <span>
          <Clock3 size={13} /> {new Date(ticket.createdAt).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: '2-digit', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>

      {role === 'admin' && (
        <div className="ticket-actions">
          {actions.map((a) => (
            <button
              key={a.value}
              className="btn btn-sm btn-ghost btn-pill"
              onClick={() => handleUpdate(a.value)}
              disabled={busy}
            >
              {updating ? 'กำลังอัปเดต...' : a.label}
            </button>
          ))}

          {canReset && (
            <button
              className="btn btn-sm btn-danger-outline btn-pill"
              onClick={handleReset}
              disabled={busy}
            >
              <RotateCcw size={14} /> {resetting ? 'กำลังรีเซ็ต...' : 'รีเซ็ตเครื่อง'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminTickets() {
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.admin.tickets(token, {
        status: filter || undefined,
        page,
      });
      setTickets(data.tickets);
      setTotal(data.total);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [token, filter, page]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const handleUpdate = async (id: number, status: string) => {
    if (!token) return;
    try {
      await api.admin.updateTicket(token, id, status);
      await fetchTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const handleReset = async (deviceId: number) => {
    if (!token) return;
    try {
      await api.admin.resetDevice(token, deviceId);
      await fetchTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'รีเซ็ตเครื่องไม่สำเร็จ');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout
      active="tickets"
      title={<>จัดการ Ticket ({total})</>}
      actions={
        <>
          <Link to="/admin" className="btn btn-ghost btn-sm">ภาพรวม</Link>
          <button className="btn btn-sm btn-danger-soft" onClick={handleLogout}>ออก</button>
        </>
      }
    >
      <div className="filter-tabs mb-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`filter-tab ${filter === opt.value ? 'active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error mb-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>กำลังโหลด...</span></div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CheckCircle2 size={44} /></div>
          <div className="empty-state-text">ไม่มี Ticket {filter ? `ในสถานะ "${STATUS_OPTIONS.find(o => o.value === filter)?.label}"` : ''}</div>
        </div>
      ) : (
        <>
          <div className="ticket-list">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} role={role} onUpdate={handleUpdate} onReset={handleReset} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ก่อนหน้า
              </button>
              <span className="pagination-info">
                หน้า {page} / {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                ถัดไป
              </button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
