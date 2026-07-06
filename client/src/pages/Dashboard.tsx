import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import './Dashboard.css';

interface Stats {
  total: number;
  normal: number;
  broken: number;
  under_repair: number;
}

interface Building {
  id: number;
  name: string;
  brokenCount: number;
}

interface Ticket {
  id: number;
  symptom: string;
  status: 'open' | 'in_progress' | 'resolved';
  reportedAt: string;
  device: {
    deviceCode: string;
    room: {
      roomNumber: string;
    };
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, buildingsRes, ticketsRes] = await Promise.all([
          axios.get('/api/stats'),
          axios.get('/api/buildings'),
          axios.get('/api/tickets?limit=5'),
        ]);

        setStats(statsRes.data);
        console.log('Data from /api/buildings:', buildingsRes.data);
        setBuildings(Array.isArray(buildingsRes.data) ? buildingsRes.data : (buildingsRes.data.data || []));
        setTickets(Array.isArray(ticketsRes.data) ? ticketsRes.data : (ticketsRes.data.data || []));
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':        return <span className="badge badge-open">รอซ่อม</span>;
      case 'in_progress': return <span className="badge badge-in_progress">กำลังซ่อม</span>;
      case 'resolved':    return <span className="badge badge-resolved">ซ่อมเสร็จ</span>;
      default:            return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main>
        <div className="dashboard-container">
          <Breadcrumb items={[{ label: 'หน้าแรก' }]} />

          {/* 1. Stats Bar */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-emoji">💻</div>
              <div className="stat-info">
                <h3>เครื่องทั้งหมด</h3>
                <p className="stat-total">{stats?.total ?? 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">✅</div>
              <div className="stat-info">
                <h3>ปกติ</h3>
                <p className="stat-normal">{stats?.normal ?? 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">🚨</div>
              <div className="stat-info">
                <h3>เสีย</h3>
                <p className="stat-broken">{stats?.broken ?? 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-emoji">🔧</div>
              <div className="stat-info">
                <h3>กำลังซ่อม</h3>
                <p className="stat-repair">{stats?.under_repair ?? 0}</p>
              </div>
            </div>
          </section>

          {/* 2. Building Cards */}
          <section>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-text, #333)' }}>รายการอาคาร</h2>
            <div className="building-grid">
              {buildings?.length > 0 ? (
                buildings.map((b) => (
                  <Link
                    key={b.id}
                    to={`/buildings/${b.id}`}
                    className={`building-card ${b.brokenCount > 0 ? 'status-bad' : 'status-good'}`}
                  >
                    <div className="building-icon">🏢</div>
                    <h2 className="building-name">{b.name}</h2>
                    <div className={`building-status ${b.brokenCount > 0 ? 'text-bad' : 'text-good'}`}>
                      {b.brokenCount > 0 ? `เครื่องเสีย: ${b.brokenCount}` : 'สถานะ: ปกติ (0)'}
                    </div>
                  </Link>
                ))
              ) : (
                <div style={{ padding: '20px', color: '#666' }}>ไม่พบข้อมูลอาคาร...</div>
              )}
            </div>
          </section>

          {/* 3. Recent Tickets */}
          <section className="recent-tickets">
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
                  {tickets.length > 0 ? (
                    tickets.map((t) => (
                      <tr key={t.id}>
                        <td>
                          {new Date(t.reportedAt).toLocaleString('th-TH', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>{t.device.room.roomNumber}</td>
                        <td>{t.device.deviceCode}</td>
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
}
