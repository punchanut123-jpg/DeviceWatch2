import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Home,
  Inbox,
  LogOut,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Ticket, TicketStatus } from '../types';

// ── Helpers ─────────────────────────────────────────────────

const FILTER_TABS: { value: 'all' | TicketStatus; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'open', label: 'รอดำเนินการ' },
  { value: 'in_progress', label: 'กำลังซ่อม' },
  { value: 'resolved', label: 'เสร็จสิ้น' },
];

const BADGE_CLASS: Record<TicketStatus, string> = {
  open: 'badge badge-open',
  in_progress: 'badge badge-in_progress',
  resolved: 'badge badge-resolved',
};

const BADGE_LABEL: Record<TicketStatus, string> = {
  open: 'รอดำเนินการ',
  in_progress: 'กำลังซ่อม',
  resolved: 'เสร็จสิ้น',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Ticket Card ─────────────────────────────────────────────
function TicketCard({ ticket, onRoomClick }: { ticket: Ticket; onRoomClick?: (id: number) => void }) {
  const room = ticket.device?.room;
  const floor = room?.floor;
  const locationParts = [
    room?.name ? `ห้อง ${room.name}` : null,
    floor?.number ? `ชั้น ${floor.number}` : null,
    floor?.building?.name ?? null,
  ].filter(Boolean);

  return (
    <div className={`report-card report-card-${ticket.status}`}>
      <div className="report-card-bar" />
      <div className="report-card-body">
        {/* Header row */}
        <div className="report-card-header">
          <div className="report-card-header-left">
            <span className="report-ticket-id">#{ticket.id}</span>
            <span className={BADGE_CLASS[ticket.status]}>{BADGE_LABEL[ticket.status]}</span>
          </div>
          {room?.id !== undefined && onRoomClick && (
            <button
              className="btn btn-ghost btn-sm report-room-btn"
              onClick={() => onRoomClick(room!.id)}
            >
              <DoorOpen size={14} />
              ดูห้อง
            </button>
          )}
        </div>

        {/* Device name */}
        <div className="report-device-name">
          {ticket.device?.name ?? <span className="report-deleted">(เครื่องถูกลบแล้ว)</span>}
        </div>

        {/* Location */}
        {locationParts.length > 0 && (
          <div className="report-location">
            <Home size={13} />
            {locationParts.join(' · ')}
          </div>
        )}

        {/* Description */}
        <div className="report-desc-box">
          {ticket.description}
        </div>

        {/* Timestamps */}
        <div className="report-meta">
          <span>
            <Clock size={12} />
            แจ้งเมื่อ {formatDate(ticket.createdAt)}
          </span>
          {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
            <span>
              <RefreshCw size={12} />
              อัปเดต {formatDate(ticket.updatedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
const POLL_INTERVAL = 30_000;

export default function MyReports() {
  const navigate = useNavigate();
  const { token, student, logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!token) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.student.history(token);
      setTickets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !student) {
      navigate('/');
      return;
    }
    fetchHistory();
    pollRef.current = setInterval(() => fetchHistory(true), POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, student, navigate, fetchHistory]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Derived counts
  const countAll = tickets.length;
  const countOpen = tickets.filter((t) => t.status === 'open').length;
  const countInProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const countResolved = tickets.filter((t) => t.status === 'resolved').length;

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

  if (!student) return null;

  return (
    <div className="page dashboard-page">
      {/* ── Top Nav ── */}
      <nav className="topnav">
        <div className="topnav-inner dashboard-topnav">
          <div className="topnav-brand">
            <img src="/logo.png" alt="โลโก้" className="topnav-logo-img" />
            <span className="topnav-logo">DeviceWatch</span>
          </div>
          <div className="dashboard-topnav-actions">
            <span className="dashboard-user-name" style={{ display: 'inline' }}>
              {student.name}
            </span>
            <button className="dashboard-reports-link" onClick={handleLogout}>
              <LogOut size={16} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="container">
          {/* ── Page heading ── */}
          <section className="dashboard-heading">
            <div>
              <p className="dashboard-eyebrow">ติดตามสถานะ</p>
              <h1>ประวัติการแจ้งของฉัน</h1>
              <p>รหัสนักศึกษา: <strong>{student.studentId}</strong></p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.35rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => fetchHistory(true)}
                disabled={refreshing}
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : undefined }} />
                {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
                <Home size={15} />
                เลือกห้อง
              </button>
            </div>
          </section>

          {/* ── Stat summary (4 blocks) ── */}
          <div className="report-stats-row">
            <div className="report-stat-block report-stat-all">
              <div className="report-stat-value">{countAll}</div>
              <div className="report-stat-label">
                <ClipboardList size={14} />
                ทั้งหมด
              </div>
            </div>
            <div className="report-stat-block report-stat-open">
              <div className="report-stat-value">{countOpen}</div>
              <div className="report-stat-label">
                <AlertTriangle size={14} />
                รอดำเนินการ
              </div>
            </div>
            <div className="report-stat-block report-stat-repair">
              <div className="report-stat-value">{countInProgress}</div>
              <div className="report-stat-label">
                <Wrench size={14} />
                กำลังซ่อม
              </div>
            </div>
            <div className="report-stat-block report-stat-resolved">
              <div className="report-stat-value">{countResolved}</div>
              <div className="report-stat-label">
                <CheckCircle2 size={14} />
                เสร็จสิ้น
              </div>
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && !loading && (
            <div className="alert alert-error dashboard-alert">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* ── Filter tabs ── */}
          <div className="filter-tabs mb-2">
            {FILTER_TABS.map(({ value, label }) => {
              const count =
                value === 'all' ? countAll
                : value === 'open' ? countOpen
                : value === 'in_progress' ? countInProgress
                : countResolved;
              return (
                <button
                  key={value}
                  className={`filter-tab ${filter === value ? 'active' : ''}`}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span className="report-tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
              <span>กำลังโหลด...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Inbox size={48} strokeWidth={1.5} />
              <div className="empty-state-text">
                {filter === 'all' ? 'คุณยังไม่มีประวัติการแจ้งซ่อม' : `ไม่มีรายการในสถานะ "${FILTER_TABS.find(t => t.value === filter)?.label}"`}
              </div>
              {filter === 'all' && (
                <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/')}>
                  <Home size={16} />
                  เลือกห้องเพื่อแจ้งซ่อม
                </button>
              )}
            </div>
          ) : (
            <div className="report-list">
              {filtered.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onRoomClick={(id) => navigate(`/room/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="footer-bar">
        <div className="footer-bar-inner">
          <div className="footer-brand">
            <span className="footer-logo-text">DeviceWatch</span>
            <div className="footer-divider" />
            <span className="footer-faculty">คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเพชรบุรี</span>
          </div>
          <div className="footer-right">
            <div>v1.0.0</div>
            <div>© 2026 IT Faculty</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
