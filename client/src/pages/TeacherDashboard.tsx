import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Device } from '../types';

interface RoomSummary {
  roomId: number;
  roomName: string;
  buildingName: string;
  floorNumber: number;
  totalDevices: number;
  brokenCount: number;
  underRepairCount: number;
  totalIssues: number;
}

interface OverviewData {
  brokenDevices: Device[];
  stats: {
    total: number;
    normal: number;
    broken: number;
    underRepair: number;
    ticketsToday: number;
  };
  roomsSummary: RoomSummary[];
  trend: { date: string; count: number }[];
}

type TabType = 'overview' | 'rooms' | 'trend';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { teacher, token, logout } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Search & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'roomName' | 'totalDevices' | 'totalIssues'>('totalIssues');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // SVG Chart States
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    if (!teacher || !token) {
      navigate('/teacher/login');
      return;
    }
    fetchOverview(token);
  }, [teacher, token, navigate]);

  const fetchOverview = async (authToken: string) => {
    setLoading(true);
    try {
      const response = await api.identity.teacherOverview(authToken);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/teacher/login');
  };

  // Sortable & Filtered Rooms Logic
  const processedRooms = useMemo(() => {
    if (!data?.roomsSummary) return [];

    return [...data.roomsSummary]
      .filter(room => 
        room.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.buildingName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'roomName') {
          return sortDirection === 'asc' 
            ? valA.localeCompare(valB, 'th', { numeric: true }) 
            : valB.localeCompare(valA, 'th', { numeric: true });
        }

        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [data, searchQuery, sortField, sortDirection]);

  const handleSort = (field: 'roomName' | 'totalDevices' | 'totalIssues') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (!teacher || !data) {
    if (loading) {
      return (
        <div className="loading-center" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" />
          <span style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูลแดชบอร์ด...</span>
        </div>
      );
    }
    return null;
  }

  // Calculate coordinates for custom SVG line/area chart
  const trendData = data.trend || [];
  const maxTrendVal = Math.max(...trendData.map(t => t.count), 5);

  return (
    <div className="teacher-layout">
      <style>{`
        .teacher-layout {
          display: flex;
          min-height: 100vh;
          background: #f0f4f9;
          font-family: var(--font-th);
        }
        
        /* ── Sidebar ── */
        .sidebar {
          width: 280px;
          background: #1a2f5a;
          color: white;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          box-shadow: 4px 0 16px rgba(0,0,0,0.1);
          z-index: 10;
        }
        
        .sidebar-brand {
          padding: 2rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        
        .sidebar-brand-title {
          font-family: var(--font-en);
          font-weight: 800;
          font-size: 1.3rem;
          letter-spacing: 0.5px;
        }

        .sidebar-brand-badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.5rem;
          border-radius: 20px;
          background: rgba(255,255,255,0.15);
          font-weight: 600;
        }
        
        .sidebar-user {
          padding: 1.5rem;
          background: rgba(0,0,0,0.15);
          margin: 1rem 1rem 1.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        .sidebar-user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-user-name {
          font-weight: 700;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-role {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
        }

        .sidebar-menu {
          list-style: none;
          padding: 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sidebar-menu-item button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 1.25rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.7);
          font-family: var(--font-th);
          font-size: 0.95rem;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sidebar-menu-item.active button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          box-shadow: inset 4px 0 0 var(--primary-lighter);
        }

        .sidebar-menu-item button:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        /* ── Main View ── */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }

        .main-header {
          background: white;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-sm);
        }

        .header-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text);
        }

        .content-body {
          padding: 2rem;
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
        }

        /* ── 5-Column Stats Grid ── */
        .stats-grid-5 {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .stat-card-premium {
          background: white;
          border-radius: 16px;
          padding: 1.5rem 1.25rem;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card-premium:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .stat-card-premium::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
        }

        .stat-blue::before { background: var(--primary); }
        .stat-green::before { background: var(--success); }
        .stat-red::before { background: var(--danger); }
        .stat-orange::before { background: var(--warning); }
        .stat-cyan::before { background: #06B6D4; }

        .stat-label-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .stat-number-large {
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1;
          color: var(--text);
        }

        /* ── Dashboard Grid Layout ── */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 3.2fr 2.8fr;
          gap: 2rem;
          align-items: start;
        }

        .premium-panel {
          background: white;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .panel-header {
          padding: 1.25rem 1.75rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }

        .panel-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .panel-body {
          padding: 1.75rem;
        }

        /* ── Table Styling ── */
        .search-container {
          margin-bottom: 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          font-family: var(--font-th);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .search-input:focus {
          border-color: var(--primary-light);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.95rem;
        }

        .custom-table th {
          background: #f1f5f9;
          padding: 1rem;
          color: var(--text-muted);
          font-weight: 700;
          border-bottom: 1px solid var(--border);
          user-select: none;
        }

        .custom-table th.sortable {
          cursor: pointer;
        }

        .custom-table th.sortable:hover {
          background: #e2e8f0;
          color: var(--text);
        }

        .custom-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }

        .custom-table tr:last-child td {
          border-bottom: none;
        }

        .custom-table tr:hover td {
          background: #f8fafc;
        }

        /* ── SVG Chart Elements ── */
        .chart-svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .bar-rect {
          transition: fill 0.2s ease, opacity 0.2s ease;
          cursor: pointer;
        }

        .bar-rect:hover {
          opacity: 0.9;
        }

        /* ── Broken List Panel ── */
        .broken-list-scroll {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 480px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .broken-item-card {
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fcfdfe;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: border-color 0.2s ease;
        }

        .broken-item-card:hover {
          border-color: var(--border-strong);
        }

        /* ── Mobile Layout Overlay ── */
        .mobile-header {
          display: none;
        }

        /* ── Media Queries ── */
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          .stats-grid-5 {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .teacher-layout {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            height: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .sidebar-brand {
            display: none;
          }
          .sidebar-user {
            display: none;
          }
          .sidebar-menu {
            flex-direction: row;
            padding: 0.5rem 1rem;
            overflow-x: auto;
            gap: 0.25rem;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .sidebar-menu-item button {
            padding: 0.6rem 1rem;
            white-space: nowrap;
          }
          .sidebar-menu-item.active button {
            box-shadow: inset 0 -3px 0 var(--primary-lighter);
          }
          .sidebar-footer {
            display: none;
          }
          .mobile-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.25rem;
            background: #1a2f5a;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .main-header {
            display: none;
          }
          .content-body {
            padding: 1.25rem;
          }
          .stats-grid-5 {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          .stat-card-premium {
            padding: 1rem;
          }
          .stat-number-large {
            font-size: 1.75rem;
          }
        }

        @media (max-width: 480px) {
          .stats-grid-5 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Mobile Top Header */}
      <div className="mobile-header">
        <span className="sidebar-brand-title" style={{ color: 'white' }}>DeviceWatch 👨‍🏫</span>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={handleLogout}
          style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
        >
          ออกระบบ
        </button>
      </div>

      {/* ── Left Sidebar Navigation (Desktop) ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="IT Faculty Logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', background: 'white', padding: '1px', flexShrink: 0 }} />
          <div className="sidebar-brand-title">DeviceWatch</div>
          <span className="sidebar-brand-badge">อาจารย์</span>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">👨‍🏫</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name" title={teacher.name}>{teacher.name}</span>
            <span className="sidebar-user-role">ผู้ตรวจการคณะ IT</span>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            <li className={`sidebar-menu-item ${activeTab === 'overview' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('overview')}>
                📊 ภาพรวมระบบ
              </button>
            </li>
            <li className={`sidebar-menu-item ${activeTab === 'rooms' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('rooms')}>
                🏫 รายละเอียดห้องเรียน
              </button>
            </li>
            <li className={`sidebar-menu-item ${activeTab === 'trend' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('trend')}>
                📈 แนวโน้มแจ้งซ่อม
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="btn btn-danger w-full"
            style={{ borderRadius: '10px', padding: '0.75rem', justifyContent: 'center' }}
            onClick={handleLogout}
          >
            ❌ ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Right Main Pane ── */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-title">
            {activeTab === 'overview' && '📊 ภาพรวมสภาพอุปกรณ์ในคณะ'}
            {activeTab === 'rooms' && '🏫 สถานะเครื่องคอมพิวเตอร์รายห้อง'}
            {activeTab === 'trend' && '📈 กราฟแนวโน้มแจ้งเสียย้อนหลัง 7 วัน'}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </div>
        </header>

        <div className="content-body">
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
          {/* ── 5-Column Stats Grid (Visible on all tabs) ── */}
          <section className="stats-grid-5">
            <div className="stat-card-premium stat-blue">
              <div className="stat-label-sub">🖥️ คอมพิวเตอร์ทั้งหมด</div>
              <div className="stat-number-large">{data.stats.total}</div>
            </div>
            <div className="stat-card-premium stat-green">
              <div className="stat-label-sub">✅ สถานะพร้อมใช้งาน</div>
              <div className="stat-number-large">{data.stats.normal}</div>
            </div>
            <div className="stat-card-premium stat-red">
              <div className="stat-label-sub">⚠️ อุปกรณ์ชำรุดรอซ่อม</div>
              <div className="stat-number-large">{data.stats.broken}</div>
            </div>
            <div className="stat-card-premium stat-orange">
              <div className="stat-label-sub">🔧 อยู่ระหว่างซ่อมแซม</div>
              <div className="stat-number-large">{data.stats.underRepair}</div>
            </div>
            <div className="stat-card-premium stat-cyan">
              <div className="stat-label-sub">📝 รายการแจ้งซ่อมวันนี้</div>
              <div className="stat-number-large">{data.stats.ticketsToday}</div>
            </div>
          </section>

          {/* ── TAB: Overview ── */}
          {activeTab === 'overview' && (
            <div className="dashboard-grid">
              {/* Left Panel: Table Summary preview */}
              <div className="premium-panel">
                <div className="panel-header">
                  <div className="panel-title">🚪 สรุปห้องเรียนที่มีปัญหาบ่อย</div>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setActiveTab('rooms')}
                    style={{ color: 'var(--primary)', fontWeight: 700 }}
                  >
                    ดูทั้งหมด →
                  </button>
                </div>
                <div className="panel-body" style={{ padding: '1rem' }}>
                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>ห้องเรียน</th>
                          <th>อาคาร</th>
                          <th style={{ textAlign: 'center' }}>เครื่องทั้งหมด</th>
                          <th style={{ textAlign: 'center' }}>ชำรุดรวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.roomsSummary
                          .filter(r => r.totalIssues > 0)
                          .slice(0, 5)
                          .map(room => (
                            <tr key={room.roomId}>
                              <td style={{ fontWeight: 600 }}>ห้อง {room.roomName}</td>
                              <td>{room.buildingName}</td>
                              <td style={{ textAlign: 'center' }}>{room.totalDevices} เครื่อง</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'var(--danger-bg)', color: 'var(--danger-dark)', fontWeight: 800 }}>
                                  {room.totalIssues} เครื่อง
                                </span>
                              </td>
                            </tr>
                          ))
                        }
                        {data.roomsSummary.filter(r => r.totalIssues > 0).length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              🎉 ขณะนี้ไม่มีห้องที่มีคอมพิวเตอร์ชำรุด
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Panel: Detailed Broken Devices Scroll */}
              <div className="premium-panel">
                <div className="panel-header">
                  <div className="panel-title">🛠️ รายการเครื่องชำรุด ({data.brokenDevices.length} เครื่อง)</div>
                </div>
                <div className="panel-body">
                  <div className="broken-list-scroll">
                    {data.brokenDevices.map(device => (
                      <div key={device.id} className="broken-item-card">
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>💻 {device.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            ห้อง {device.room?.name} • ชั้น {device.room?.floor?.number} ({device.room?.floor?.building?.name})
                          </div>
                        </div>
                        <div>
                          {device.status === 'broken' ? (
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', background: 'var(--danger-bg)', color: 'var(--danger-dark)', fontWeight: 700 }}>
                              ชำรุดรอซ่อม
                            </span>
                          ) : (
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', background: 'var(--warning-bg)', color: 'var(--warning-dark)', fontWeight: 700 }}>
                              กำลังซ่อมแซม
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {data.brokenDevices.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                        <div>เครื่องคอมพิวเตอร์ทุกห้องพร้อมใช้งานดีเยี่ยม!</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Rooms Summary (Sortable Table) ── */}
          {activeTab === 'rooms' && (
            <div className="premium-panel">
              <div className="panel-header">
                <div className="panel-title">🏫 ค้นหาและตรวจสอบเครื่องเสียรายห้อง</div>
              </div>
              <div className="panel-body">
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 พิมพ์ชื่อห้อง หรือ อาคาร เพื่อค้นหา..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th className="sortable" onClick={() => handleSort('roomName')}>
                          ห้องเรียน {sortField === 'roomName' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th>อาคาร</th>
                        <th>ชั้น</th>
                        <th className="sortable" style={{ textAlign: 'center' }} onClick={() => handleSort('totalDevices')}>
                          เครื่องทั้งหมด {sortField === 'totalDevices' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ textAlign: 'center' }}>ปกติ</th>
                        <th style={{ textAlign: 'center' }}>เสีย</th>
                        <th style={{ textAlign: 'center' }}>กำลังซ่อม</th>
                        <th className="sortable" style={{ textAlign: 'center' }} onClick={() => handleSort('totalIssues')}>
                          เสียรวม {sortField === 'totalIssues' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedRooms.map(room => (
                        <tr key={room.roomId}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>ห้อง {room.roomName}</td>
                          <td>{room.buildingName}</td>
                          <td>ชั้น {room.floorNumber}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{room.totalDevices} เครื่อง</td>
                          <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                            {room.totalDevices - room.brokenCount - room.underRepairCount}
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>{room.brokenCount}</td>
                          <td style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 600 }}>{room.underRepairCount}</td>
                          <td style={{ textAlign: 'center' }}>
                            {room.totalIssues > 0 ? (
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'var(--danger-bg)', color: 'var(--danger-dark)', fontWeight: 800 }}>
                                {room.totalIssues} เครื่อง
                              </span>
                            ) : (
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'var(--status-normal-bg)', color: 'var(--success-dark)', fontWeight: 600 }}>
                                0
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {processedRooms.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                            ❌ ไม่พบห้องเรียนที่ค้นหา
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Trend Chart (Premium SVG Chart) ── */}
          {activeTab === 'trend' && (
            <div className="premium-panel">
              <div className="panel-header">
                <div className="panel-title">📈 สถิติการส่งแจ้งเสียคอมพิวเตอร์ย้อนหลัง 7 วัน</div>
              </div>
              <div className="panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem', alignItems: 'center' }}>
                  
                  {/* Left: Custom SVG bar chart with rounded corners, gridlines and hover tooltips */}
                  <div>
                    <svg viewBox="0 0 600 320" className="chart-svg">
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary-light)" />
                          <stop offset="100%" stopColor="var(--primary)" />
                        </linearGradient>
                      </defs>

                      {/* X and Y Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
                        const yPos = 40 + val * 200;
                        const labelValue = Math.round(maxTrendVal * (1 - val));
                        return (
                          <g key={idx}>
                            <line 
                              x1="50" 
                              y1={yPos} 
                              x2="550" 
                              y2={yPos} 
                              stroke="#e2e8f0" 
                              strokeDasharray="4 4" 
                            />
                            <text x="25" y={yPos + 5} fontSize="12" fill="var(--text-muted)" textAnchor="middle">
                              {labelValue}
                            </text>
                          </g>
                        );
                      })}

                      {/* Render Bars */}
                      {trendData.map((item, index) => {
                        const colWidth = 46;
                        const colSpacing = 68;
                        const x = 70 + index * colSpacing;
                        const barHeight = item.count > 0 ? (item.count / maxTrendVal) * 200 : 0;
                        const y = 240 - barHeight;

                        return (
                          <g key={index}>
                            {/* Bar rect */}
                            <rect
                              x={x}
                              y={y}
                              width={colWidth}
                              height={barHeight}
                              rx="6"
                              fill="url(#barGrad)"
                              className="bar-rect"
                              onMouseEnter={() => setHoveredBar(index)}
                              onMouseLeave={() => setHoveredBar(null)}
                            />

                            {/* Label */}
                            <text x={x + colWidth / 2} y="265" fontSize="11" fill="var(--text-muted)" textAnchor="middle" fontWeight="600">
                              {item.date}
                            </text>

                            {/* Counts */}
                            <text x={x + colWidth / 2} y={y - 8} fontSize="12" fill={hoveredBar === index ? "var(--primary)" : "var(--text)"} fontWeight="bold" textAnchor="middle">
                              {item.count}
                            </text>
                          </g>
                        );
                      })}

                      {/* X axis line */}
                      <line x1="50" y1="240" x2="550" y2="240" stroke="#cbd5e1" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Right: Summary box */}
                  <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>💡 การวิเคราะห์ข้อมูลย้อนหลัง</h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      กราฟนี้แสดงสถิติการส่งแจ้งเสียของเครื่องคอมพิวเตอร์ทั้งหมดภายในคณะในช่วง 7 วันที่ผ่านมา 
                      <br /><br />
                      ช่วยให้อาจารย์และเจ้าหน้าที่สามารถติดตามดูแนวโน้มภาระงานแจ้งซ่อม และวางแผนตรวจสอบอุปกรณ์ในวิชาเรียนได้อย่างเป็นระบบ
                    </p>
                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>ยอดรวม 7 วัน:</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {trendData.reduce((acc, curr) => acc + curr.count, 0)} ครั้ง
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
