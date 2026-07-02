import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';

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
    axios.get('http://localhost:3000/api/tickets')
      .then(res => setTickets(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await axios.patch(`http://localhost:3000/api/tickets/${id}`, { status });
      fetchTickets(); // Refresh ข้อมูลหลังอัปเดต
      toast.success('อัปเดตสถานะเรียบร้อยแล้ว');
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <Breadcrumb items={[{ label: 'หน้าแรก', path: '/' }, { label: 'Admin Dashboard' }]} />

        {/* Filter Buttons */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px' }}>
          {(['all', 'open', 'in_progress', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} 
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: filter === s ? 'var(--color-primary)' : 'var(--color-surface)', 
                color: filter === s ? 'white' : 'var(--color-text)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: '600'
              }}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tickets Table */}
        <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>อุปกรณ์</th>
                <th style={{ padding: '1rem' }}>อาการ</th>
                <th style={{ padding: '1rem' }}>สถานะ</th>
                <th style={{ padding: '1rem' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>{t.device.deviceCode} <br/><small style={{color:'var(--color-text-muted)'}}>ห้อง {t.device.room.roomNumber}</small></td>
                  <td style={{ padding: '1rem' }}>{t.symptom}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', 
                      background: t.status === 'open' ? '#fee2e2' : t.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                      color: t.status === 'open' ? 'var(--color-status-broken)' : t.status === 'resolved' ? 'var(--color-status-normal)' : 'var(--color-status-repair)'
                    }}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '8px' }}>
                    {t.status === 'open' && (
                      <button onClick={() => updateStatus(t.id, 'in_progress')} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px' }}>เริ่มซ่อม</button>
                    )}
                    {t.status === 'in_progress' && (
                      <button onClick={() => updateStatus(t.id, 'resolved')} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: 'var(--color-status-normal)', color: 'white', border: 'none', borderRadius: '4px' }}>ซ่อมเสร็จ</button>
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
