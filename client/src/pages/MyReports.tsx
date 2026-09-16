import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Ticket } from '../types';

export default function MyReports() {
  const navigate = useNavigate();
  const { token, student } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !student) {
      navigate('/');
      return;
    }
    fetchHistory(token);
  }, [token, student, navigate]);

  const fetchHistory = async (authToken: string) => {
    setLoading(true);
    try {
      const data = await api.student.history(authToken);
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>รอดำเนินการ</span>;
      case 'in_progress':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', background: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>กำลังซ่อม</span>;
      case 'resolved':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', background: '#DCFCE7', color: '#166534', fontWeight: 600 }}>เสร็จสิ้น</span>;
      default:
        return <span>{status}</span>;
    }
  };

  if (!student) return null;

  return (
    <div className="page" style={{ background: 'var(--background)' }}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="topnav">
        <div className="topnav-inner">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/')}
            style={{ padding: '0.4rem 0.75rem', minHeight: '36px' }}
          >
            ← กลับ
          </button>
          <div className="topnav-brand" style={{ flex: 1, justifyContent: 'center' }}>
            <span className="topnav-logo">DeviceWatch</span>
          </div>
          <div className="topnav-right" style={{ width: '60px' }}></div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '1rem' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>ประวัติการแจ้งของฉัน</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              รหัสนักศึกษา: <strong>{student.studentId}</strong><br />
              ชื่อ: <strong>{student.name}</strong>
            </p>
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
              <span>กำลังโหลด...</span>
            </div>
          ) : error ? (
            <div className="alert alert-error">⚠️ {error}</div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p style={{ color: 'var(--text-muted)' }}>คุณยังไม่มีประวัติการแจ้งซ่อม</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tickets.map(ticket => (
                <div key={ticket.id} style={{ background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      {ticket.device?.name}
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    ห้อง {ticket.device?.room?.name} (ชั้น {ticket.device?.room?.floor?.number} อาคาร {ticket.device?.room?.floor?.building?.name})
                  </div>
                  <p style={{ fontSize: '0.95rem', background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    {ticket.description}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                    แจ้งเมื่อ: {new Date(ticket.createdAt).toLocaleString('th-TH')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
