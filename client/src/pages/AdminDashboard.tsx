import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  const fetchTickets = () => {
    axios.get('/api/tickets')
      .then(res => setTickets(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await axios.patch(`/api/tickets/${id}`, { status });
      fetchTickets();
      toast.success('อัปเดตสถานะเรียบร้อยแล้ว');
    } catch (err) {
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
        <Breadcrumb items={[{ label: 'หน้าแรก', path: '/' }, { label: 'Admin Dashboard' }]} />

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
