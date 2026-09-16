import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Ticket, TicketStatus } from '../types';

const STATUS_OPTIONS: { value: string; label: string; badge: string }[] = [
  { value: '', label: 'ทั้งหมด', badge: '' },
  { value: 'open', label: 'รอซ่อม', badge: 'badge-open' },
  { value: 'in_progress', label: 'กำลังซ่อม', badge: 'badge-in_progress' },
  { value: 'resolved', label: 'เสร็จแล้ว', badge: 'badge-resolved' },
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
  const canReset = ticket.status === 'open' || ticket.status === 'in_progress';

  return (
    <div className="ticket-card" style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}>
      <div className="ticket-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="ticket-id" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>#{ticket.id}</span>
            <span className={`badge badge-${ticket.status}`} style={{ borderRadius: '20px', padding: '0.2rem 0.75rem' }}>
              {{ open: 'รอซ่อม', in_progress: 'กำลังซ่อม', resolved: 'เสร็จแล้ว' }[ticket.status]}
            </span>
          </div>
          <div style={{ fontWeight: 600, marginTop: '0.75rem', fontSize: '1.1rem' }}>
             💻 {ticket.device?.name}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ห้อง {room?.name} {floor && `(ชั้น ${floor.number})`}
          </div>
        </div>
      </div>

      <p className="ticket-desc" style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius)', margin: '0.75rem 0', fontSize: '0.9rem', border: '1px solid var(--border)' }}>
        {ticket.description}
      </p>

      {(ticket.student || ticket.reportedBy) && (() => {
        const reporter = ticket.student || ticket.reportedBy;
        if (!reporter) return null;
        return (
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-base)', padding: '0.25rem 0.6rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              👤 แจ้งโดย: {reporter.name} {reporter.studentId ? `(${reporter.studentId})` : ''}
            </span>
          </div>
        );
      })()}

      <div className="ticket-meta" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>🕐 {new Date(ticket.createdAt).toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          year: '2-digit', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })}</span>
      </div>

      {role === 'admin' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {actions.map((a) => (
            <button
              key={a.value}
              className="btn btn-sm btn-ghost"
              onClick={() => handleUpdate(a.value)}
              disabled={updating || resetting}
              style={{ borderRadius: '20px', padding: '0.4rem 1rem' }}
            >
              {updating ? '⏳' : a.label}
            </button>
          ))}

          {canReset && (
            <button
              className="btn btn-sm"
              onClick={handleReset}
              disabled={updating || resetting}
              style={{
                background: 'transparent',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                borderRadius: '20px',
                padding: '0.4rem 1rem'
              }}
            >
              {resetting ? '⏳' : '🔄 รีเซ็ตเครื่อง'}
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
      const result = await api.admin.resetDevice(token, deviceId);
      await fetchTickets();
      console.log(`รีเซ็ตสำเร็จ: ปิด ${result.closedTickets} ticket(s)`);
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
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontFamily: 'var(--font-en)',
            fontWeight: 700,
            fontSize: '1.1rem',
            background: 'linear-gradient(135deg, var(--primary), var(--gold))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.25rem',
          }}>
            ⚡ DeviceWatch
          </div>
        </div>
        <Link to="/admin" className="admin-nav-item">📊 ภาพรวม</Link>
        <Link to="/admin/tickets" className="admin-nav-item active">🎫 จัดการ Ticket</Link>
        <Link to="/" className="admin-nav-item">🏠 หน้าแจ้งซ่อม</Link>
        <div style={{ flex: 1 }} />
        <button className="admin-nav-item" style={{ color: 'var(--danger)' }} onClick={handleLogout}>
          🚪 ออกจากระบบ
        </button>
      </aside>

      <div className="admin-content">
        {/* Top bar */}
        <div className="admin-topbar">
          <div style={{ fontWeight: 700 }}>🎫 จัดการ Ticket ({total}) {role === 'teacher' && <span className="badge" style={{ marginLeft: '0.5rem', background: '#FEF3C7', color: '#92400E' }}>โหมดดูอย่างเดียว</span>}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/admin" className="btn btn-ghost btn-sm">📊 ภาพรวม</Link>
            <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={handleLogout}>ออก</button>
          </div>
        </div>

        <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
          {/* Filters */}
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

          {error && <div className="alert alert-error mb-2">⚠️ {error}</div>}

          {loading ? (
            <div className="loading-center"><div className="spinner" /><span>กำลังโหลด...</span></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <div className="empty-state-text">ไม่มี Ticket {filter ? `ในสถานะ "${STATUS_OPTIONS.find(o => o.value === filter)?.label}"` : ''}</div>
            </div>
          ) : (
            <>
              <div className="ticket-list">
                {tickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} role={role} onUpdate={handleUpdate} onReset={handleReset} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← ก่อนหน้า
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    หน้า {page} / {totalPages}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    ถัดไป →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
