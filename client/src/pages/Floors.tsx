import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';

interface Floor {
  id: number;
  floorNumber: number;
  brokenCount: number;
}

export default function Floors() {
  const { buildingId } = useParams();
  const [floors, setFloors] = useState<Floor[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:3000/api/buildings/${buildingId}/floors`)
      .then(res => setFloors(res.data))
      .catch(err => console.error(err));
  }, [buildingId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <Breadcrumb items={[{ label: 'หน้าแรก', path: '/' }, { label: 'อาคาร IT' }, { label: 'เลือกชั้น' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {floors.map(f => (
            <div 
              key={f.id} 
              onClick={() => navigate(`/buildings/${buildingId}/floors/${f.id}`)} 
              style={{
                background: 'var(--color-surface)', 
                borderRadius: '12px', 
                padding: '1.5rem',
                borderLeft: `4px solid ${f.brokenCount > 0 ? 'var(--color-status-broken)' : 'var(--color-status-normal)'}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
                cursor: 'pointer'
              }}
            >
              <h3>ชั้นที่ {f.floorNumber}</h3>
              <p style={{ color: f.brokenCount > 0 ? 'var(--color-status-broken)' : 'var(--color-status-normal)' }}>
                {f.brokenCount > 0 ? `${f.brokenCount} เครื่องที่แจ้งเสีย` : 'ปกติ'}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

