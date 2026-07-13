import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import './AdminDashboard.css';

interface Ticket {
  id: number;
  symptom: string;
  status: 'open' | 'in_progress' | 'resolved' | 'cancelled';
  reportedAt: string;
  device: { deviceCode: string; room: { roomNumber: string } };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { token, logout } = useAuth(); // ดึง token จาก AuthContext
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  // ฟังก์ชัน Logout แบบแมนนวล
  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // ดักจับสถานะ 401 Unauthorized (Token หมดอายุ)
  const handleUnauthorized = () => {
    toast.error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    logout();
    navigate('/admin/login');
  };

  const fetchTickets = () => {
    if (!token) return;
    axios.get('/api/tickets', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => setTickets(res.data))
      .catch(err => {
        if (err.response && err.response.status === 401) {
          handleUnauthorized();
        } else {
          console.error(err);
        }
      });
  };

  useEffect(() => {
    if (token) {
      fetchTickets();
    } else {
      navigate('/admin/login');
    }
  }, [token]);

  // อัปเดตสถานะ Ticket พร้อมส่ง Authorization Header
  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // แนบ Token
        },
        body: JSON.stringify({ status }),
      });

      if (res.status === 401) {
        handleUnauthorized(); // ถ้า token หมดอายุให้เด้งออก
        return;
      }

      if (res.ok) {
        fetchTickets();
        toast.success('อัปเดตสถานะเรียบร้อยแล้ว');
      } else {
        toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  const getStatusBadgeClass = (status: string) => {
    if (status === 'open') return 'status-badge status-badge--open';
    if (status === 'resolved') return 'status-badge status-badge--resolved';
    return 'status-badge status-badge--in_progress';
  };

  return (
    <div className="admin-page">
      <Header />
      <main className="admin-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Breadcrumb items={[{ label: 'หน้าแรก', path: '/' }, { label: 'Admin Dashboard' }]} />
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
          >
            ออกจากระบบ
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="admin-filter-bar">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`admin-filter-btn${filter === s ? ' active' : ''}`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tickets Table */}
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>อุปกรณ์</th>
                <th>อาการ</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.id}>
                  <td>
                    {t.device.deviceCode}
                    <br />
                    <small className="device-room">ห้อง {t.device.room.roomNumber}</small>
                  </td>
                  <td>{t.symptom}</td>
                  <td>
                    <span className={getStatusBadgeClass(t.status)}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="td-actions">
                    {t.status === 'open' && (
                      <button
                        onClick={() => updateStatus(t.id, 'in_progress')}
                        className="btn-start-repair"
                      >
                        เริ่มซ่อม
                      </button>
                    )}
                    {t.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(t.id, 'resolved')}
                        className="btn-done-repair"
                      >
                        ซ่อมเสร็จ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
