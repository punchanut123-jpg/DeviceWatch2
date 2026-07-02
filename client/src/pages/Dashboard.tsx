import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';

interface Building {
  id: number;
  name: string;
  brokenCount: number;
}

export default function Dashboard() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:3000/api/buildings')
      .then(res => setBuildings(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <Breadcrumb items={[{ label: 'หน้าแรก' }]} />
        <h2 style={{ marginBottom: '1.5rem' }}>รายการอาคาร</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {buildings.map(b => (
            <div
              key={b.id}
              onClick={() => navigate(`/buildings/${b.id}`)}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '12px',
                padding: '1.5rem',
                borderLeft: `4px solid ${b.brokenCount > 0 ? 'var(--color-status-broken)' : 'var(--color-status-normal)'}`,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{b.name}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>สถานะปัจจุบัน</p>
              <div style={{ 
                fontWeight: '600', 
                color: b.brokenCount > 0 ? 'var(--color-status-broken)' : 'var(--color-status-normal)' 
              }}>
                {b.brokenCount > 0 ? `พบอุปกรณ์เสีย ${b.brokenCount} เครื่อง` : 'อุปกรณ์ใช้งานได้ปกติ'}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

