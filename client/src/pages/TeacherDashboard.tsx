import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Monitor,
  School,
  Search,
  SearchX,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Device } from '../types';
import StatCard from '../components/StatCard';

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

const TABS: { key: TabType; label: string; title: string; icon: typeof School }[] = [
  { key: 'overview', label: 'ภาพรวมระบบ', title: 'ภาพรวมสภาพอุปกรณ์ในคณะ', icon: LayoutDashboard },
  { key: 'rooms', label: 'รายละเอียดห้องเรียน', title: 'สถานะเครื่องคอมพิวเตอร์รายห้อง', icon: School },
  { key: 'trend', label: 'แนวโน้มแจ้งซ่อม', title: 'กราฟแนวโน้มแจ้งเสียย้อนหลัง 7 วัน', icon: TrendingUp },
];

const DEVICE_STATUS_LABEL: Record<string, string> = {
  broken: 'ชำรุดรอซ่อม',
  under_repair: 'กำลังซ่อมแซม',
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { teacher, token, logout } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher, token, navigate]);

  const fetchOverview = async (authToken: string) => {
    setLoading(true);
    try {
      const response = await api.identity.teacherOverview(authToken);
      setData(response);
      setLastUpdated(new Date());
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
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
        if (sortField === 'roomName') {
          return sortDirection === 'asc'
            ? a.roomName.localeCompare(b.roomName, 'th', { numeric: true })
            : b.roomName.localeCompare(a.roomName, 'th', { numeric: true });
        }

        const valA = a[sortField];
        const valB = b[sortField];
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [data, searchQuery, sortField, sortDirection]);

  const handleSort = (field: 'roomName' | 'totalDevices' | 'totalIssues') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortIcon = (field: 'roomName' | 'totalDevices' | 'totalIssues') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (!teacher) return null;

  const currentTab = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const trendData = data?.trend || [];
  const maxTrendVal = Math.max(...trendData.map((t) => t.count), 5);
  const trendTotal = trendData.reduce((acc, curr) => acc + curr.count, 0);
  const problemRooms = data?.roomsSummary.filter((r) => r.totalIssues > 0) ?? [];

  return (
    <div className="admin-layout">
      {/* Sidebar (desktop) */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/logo.png" alt="IT Faculty Logo" className="admin-brand-logo" />
          <div>
            <div className="admin-brand-name">DeviceWatch</div>
            <div className="admin-brand-role">อาจารย์</div>
          </div>
        </div>

        <div className="td-user-card">
          <div className="td-user-avatar">
            <GraduationCap size={22} />
          </div>
          <div className="td-user-info">
            <span className="td-user-name" title={teacher.name}>{teacher.name}</span>
            <span className="td-user-role">ผู้ตรวจการคณะ IT</span>
          </div>
        </div>

        <nav className="td-nav">
          <div className="td-menu">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`admin-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <tab.icon size={17} className="admin-nav-icon" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="admin-nav-spacer" />
        <button className="admin-nav-item admin-nav-logout" onClick={handleLogout}>
          <LogOut size={17} className="admin-nav-icon" />
          ออกจากระบบ
        </button>
      </aside>

      {/* Main */}
      <div className="admin-content">
        <div className="admin-topbar">
          <div className="admin-topbar-title">{currentTab.title}</div>
          <div className="admin-topbar-actions">
            <span className="td-updated">
              {lastUpdated
                ? `อัปเดตล่าสุด: ${lastUpdated.toLocaleTimeString('th-TH', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit',
                    minute: '2-digit',
                  })} น.`
                : ''}
            </span>
            <button className="btn btn-sm btn-danger-soft" onClick={handleLogout}>ออก</button>
          </div>
        </div>

        {/* Tabs (mobile only) */}
        <div className="filter-tabs td-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="admin-main">
          {error && (
            <div className="alert alert-error mb-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
              <span>กำลังโหลดข้อมูลแดชบอร์ด...</span>
            </div>
          ) : data ? (
            <>
              <section className="stats-grid stats-grid-5 mb-2">
                <StatCard icon={Monitor} label="คอมพิวเตอร์ทั้งหมด" value={data.stats.total} />
                <StatCard icon={CheckCircle2} label="สถานะพร้อมใช้งาน" value={data.stats.normal} tone="success" />
                <StatCard icon={AlertCircle} label="ชำรุดรอซ่อม" value={data.stats.broken} tone="danger" />
                <StatCard icon={Wrench} label="อยู่ระหว่างซ่อมแซม" value={data.stats.underRepair} tone="warning" />
                <StatCard icon={ClipboardList} label="แจ้งซ่อมวันนี้" value={data.stats.ticketsToday} />
              </section>

              {/* TAB: Overview */}
              {activeTab === 'overview' && (
                <div className="td-grid">
                  <div className="td-panel">
                    <div className="td-panel-header">
                      <div className="td-panel-title">
                        <DoorOpen size={18} /> สรุปห้องเรียนที่มีปัญหาบ่อย
                      </div>
                      <button className="btn btn-ghost btn-sm td-panel-action" onClick={() => setActiveTab('rooms')}>
                        ดูทั้งหมด
                      </button>
                    </div>
                    <div className="td-panel-body td-panel-body-flush">
                      <div className="td-table-wrap td-table-wrap-flush">
                        <table className="td-table">
                          <thead>
                            <tr>
                              <th>ห้องเรียน</th>
                              <th>อาคาร</th>
                              <th className="td-center">เครื่องทั้งหมด</th>
                              <th className="td-center">ชำรุดรวม</th>
                            </tr>
                          </thead>
                          <tbody>
                            {problemRooms.slice(0, 5).map((room) => (
                              <tr key={room.roomId}>
                                <td className="td-strong">ห้อง {room.roomName}</td>
                                <td>{room.buildingName}</td>
                                <td className="td-center">{room.totalDevices} เครื่อง</td>
                                <td className="td-center">
                                  <span className="badge badge-broken">{room.totalIssues} เครื่อง</span>
                                </td>
                              </tr>
                            ))}
                            {problemRooms.length === 0 && (
                              <tr>
                                <td colSpan={4} className="td-empty">
                                  <span>
                                    <CheckCircle2 size={16} /> ขณะนี้ไม่มีห้องที่มีคอมพิวเตอร์ชำรุด
                                  </span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="td-panel">
                    <div className="td-panel-header">
                      <div className="td-panel-title">
                        <Wrench size={18} /> รายการเครื่องชำรุด ({data.brokenDevices.length} เครื่อง)
                      </div>
                    </div>
                    <div className="td-panel-body">
                      <div className="td-broken-list">
                        {data.brokenDevices.map((device) => (
                          <div key={device.id} className="td-broken-item">
                            <div>
                              <div className="td-broken-name">
                                <Monitor size={15} /> {device.name}
                              </div>
                              <div className="td-broken-loc">
                                ห้อง {device.room?.name} • ชั้น {device.room?.floor?.number} ({device.room?.floor?.building?.name})
                              </div>
                            </div>
                            <span className={`badge badge-${device.status}`}>
                              {DEVICE_STATUS_LABEL[device.status] ?? device.status}
                            </span>
                          </div>
                        ))}
                        {data.brokenDevices.length === 0 && (
                          <div className="td-broken-empty">
                            <CheckCircle2 size={40} />
                            <div>เครื่องคอมพิวเตอร์ทุกห้องพร้อมใช้งานดีเยี่ยม!</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Rooms Summary (Sortable Table) */}
              {activeTab === 'rooms' && (
                <div className="td-panel">
                  <div className="td-panel-header">
                    <div className="td-panel-title">
                      <School size={18} /> ค้นหาและตรวจสอบเครื่องเสียรายห้อง
                    </div>
                  </div>
                  <div className="td-panel-body">
                    <div className="td-search">
                      <Search size={16} />
                      <input
                        type="text"
                        className="td-search-input"
                        placeholder="พิมพ์ชื่อห้อง หรือ อาคาร เพื่อค้นหา..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="td-table-wrap">
                      <table className="td-table">
                        <thead>
                          <tr>
                            <th className="td-sortable" onClick={() => handleSort('roomName')}>
                              <span className="td-sort-th">ห้องเรียน {sortIcon('roomName')}</span>
                            </th>
                            <th>อาคาร</th>
                            <th>ชั้น</th>
                            <th className="td-sortable td-center" onClick={() => handleSort('totalDevices')}>
                              <span className="td-sort-th">เครื่องทั้งหมด {sortIcon('totalDevices')}</span>
                            </th>
                            <th className="td-center">ปกติ</th>
                            <th className="td-center">เสีย</th>
                            <th className="td-center">กำลังซ่อม</th>
                            <th className="td-sortable td-center" onClick={() => handleSort('totalIssues')}>
                              <span className="td-sort-th">เสียรวม {sortIcon('totalIssues')}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedRooms.map((room) => (
                            <tr key={room.roomId}>
                              <td className="td-strong td-room-name">ห้อง {room.roomName}</td>
                              <td>{room.buildingName}</td>
                              <td>ชั้น {room.floorNumber}</td>
                              <td className="td-center td-strong">{room.totalDevices} เครื่อง</td>
                              <td className="td-center td-num-ok">
                                {room.totalDevices - room.brokenCount - room.underRepairCount}
                              </td>
                              <td className="td-center td-num-bad">{room.brokenCount}</td>
                              <td className="td-center td-num-warn">{room.underRepairCount}</td>
                              <td className="td-center">
                                {room.totalIssues > 0 ? (
                                  <span className="badge badge-broken">{room.totalIssues} เครื่อง</span>
                                ) : (
                                  <span className="badge badge-normal">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {processedRooms.length === 0 && (
                            <tr>
                              <td colSpan={8} className="td-empty">
                                <span>
                                  <SearchX size={16} /> ไม่พบห้องเรียนที่ค้นหา
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Trend Chart */}
              {activeTab === 'trend' && (
                <div className="td-panel">
                  <div className="td-panel-header">
                    <div className="td-panel-title">
                      <TrendingUp size={18} /> สถิติการส่งแจ้งเสียคอมพิวเตอร์ย้อนหลัง 7 วัน
                    </div>
                  </div>
                  <div className="td-panel-body">
                    <div className="td-trend-grid">
                      <div>
                        <svg viewBox="0 0 600 320" className="td-chart-svg">
                          <defs>
                            <linearGradient id="tdBarGrad" x1="0" y1="0" x2="0" y2="1">
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
                                  stroke="var(--border)"
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
                                <rect
                                  x={x}
                                  y={y}
                                  width={colWidth}
                                  height={barHeight}
                                  rx="6"
                                  fill="url(#tdBarGrad)"
                                  className="td-bar"
                                  onMouseEnter={() => setHoveredBar(index)}
                                  onMouseLeave={() => setHoveredBar(null)}
                                />

                                <text x={x + colWidth / 2} y="265" fontSize="11" fill="var(--text-muted)" textAnchor="middle" fontWeight="600">
                                  {item.date}
                                </text>

                                <text
                                  x={x + colWidth / 2}
                                  y={y - 8}
                                  fontSize="12"
                                  fill={hoveredBar === index ? 'var(--primary)' : 'var(--text)'}
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {item.count}
                                </text>
                              </g>
                            );
                          })}

                          {/* X axis line */}
                          <line x1="50" y1="240" x2="550" y2="240" stroke="var(--border-strong)" strokeWidth="2" />
                        </svg>
                      </div>

                      <div className="td-trend-summary">
                        <h3 className="td-trend-summary-title">
                          <Lightbulb size={18} /> การวิเคราะห์ข้อมูลย้อนหลัง
                        </h3>
                        <p>
                          กราฟนี้แสดงสถิติการส่งแจ้งเสียของเครื่องคอมพิวเตอร์ทั้งหมดภายในคณะในช่วง 7 วันที่ผ่านมา
                          <br />
                          <br />
                          ช่วยให้อาจารย์และเจ้าหน้าที่สามารถติดตามดูแนวโน้มภาระงานแจ้งซ่อม และวางแผนตรวจสอบอุปกรณ์ในวิชาเรียนได้อย่างเป็นระบบ
                        </p>
                        <div className="td-trend-total">
                          <span>ยอดรวม 7 วัน:</span>
                          <strong>{trendTotal} ครั้ง</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
