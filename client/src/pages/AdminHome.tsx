import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import './Dashboard.css';

interface Stats {
  total: number;
  normal: number;
  broken: number;
  under_repair: number;
}

interface Ticket {
  id: number;
  symptom: string;
  status: 'open' | 'in_progress' | 'resolved';
  reportedAt: string;
  device: {
    deviceCode: string;
    deviceName: string;
    room: {
      roomNumber: string;
      roomName: string;
    };
  };
}

const AdminHome: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ total: 0, normal: 0, broken: 0, under_repair: 0 });
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token, logout } = useAuth(); // ดึง token และ logout จาก AuthContext
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        const [statsRes, ticketsRes] = await Promise.all([
          fetch('/api/stats', { headers: statsHeaders }).then(r => {
            if (r.status === 401) throw new Error('unauthorized');
            return r.json();
          }),
          fetch('/api/tickets?limit=5', { headers: statsHeaders }).then(r => {
            if (r.status === 401) throw new Error('unauthorized');
            return r.json();
          }),
        ]);
        setStats(statsRes);
        setRecentTickets(Array.isArray(ticketsRes) ? ticketsRes : []);
      } catch (err: any) {
        console.error('Failed to load admin dashboard:', err);
        if (err.message === 'unauthorized') {
          logout();
          navigate('/admin/login');
        } else {
          setErrorMsg('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchData();
    } else {
      setLoading(false);
      navigate('/admin/login');
    }
  }, [token, navigate, logout]);

  const handleLogout = () => {
    logout(); // ล้าง token ใน memory (AuthContext)
    navigate('/admin/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':        return <span className="badge badge-open">รอซ่อม</span>;
      case 'in_progress': return <span className="badge badge-in_progress">กำลังซ่อม</span>;
      case 'resolved':    return <span className="badge badge-resolved">ซ่อมเสร็จ</span>;
      default:            return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <Header />
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main>
        <div className="dashboard-container">
          <Breadcrumb items={[{ label: 'Admin' }, { label: 'ภาพรวมระบบ' }]} />

          {errorMsg && (
            <div style={{
              padding: '1rem',
              marginTop: '1rem',
              marginBottom: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.9rem'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ color: 'var(--color-text, #333)', margin: 0 }}>📊 ภาพรวมระบบ (Admin)</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                to="/admin/tickets"
                style={{
                  textDecoration: 'none',
                  padding: '0.5rem 1.1rem',
                  background: 'var(--color-primary, #6366f1)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                📋 ดูงานซ่อมทั้งหมด
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1.1rem',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-emoji">💻</div>
              <div className="stat-info">
                <h3>เครื่องทั้งหมด</h3>
                <p className="stat-total">{stats.total}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">✅</div>
              <div className="stat-info">
                <h3>ปกติ</h3>
                <p className="stat-normal">{stats.normal}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">🚨</div>
              <div className="stat-info">
                <h3>เสีย</h3>
                <p className="stat-broken">{stats.broken}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">🔧</div>
              <div className="stat-info">
                <h3>กำลังซ่อม</h3>
                <p className="stat-repair">{stats.under_repair}</p>
              </div>
            </div>
          </section>

          {/* Recent Tickets */}
          <section className="recent-tickets" style={{ marginTop: '2rem' }}>
            <div className="tickets-header">
              <h2>รายการแจ้งซ่อมล่าสุด</h2>
              <Link to="/admin/tickets" className="link-see-all">ดูทั้งหมด &rarr;</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>ห้อง</th>
                    <th>เครื่อง</th>
                    <th>อาการ</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.length > 0 ? (
                    recentTickets.map(t => (
                      <tr key={t.id}>
                        <td>
                          {new Date(t.reportedAt).toLocaleString('th-TH', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>{t.device.room.roomName || t.device.room.roomNumber}</td>
                        <td>{t.device.deviceName || t.device.deviceCode}</td>
                        <td>{t.symptom}</td>
                        <td>{getStatusBadge(t.status)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        ไม่มีรายการแจ้งซ่อม
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminHome;
