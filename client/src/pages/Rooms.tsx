import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';

interface Room {
  id: number;
  roomNumber: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  brokenCount: number;
}

export default function Rooms() {
  const { buildingId, floorId } = useParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:3000/api/floors/${floorId}/rooms`)
      .then(res => setRooms(res.data))
      .catch(err => console.error(err));
  }, [floorId]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', padding: '2rem' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '1rem auto' }}>
        <Breadcrumb items={[{ label: 'หน้าแรก', path: '/' }, { label: 'อาคาร IT', path: -1 }, { label: 'ผังห้อง' }]} />
        
        {/* Container */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '600px', 
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ position: 'absolute', top: '10px', left: '10px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
            ผังชั้น {floorId}
          </div>

          {rooms.map(room => (
            <div
              key={room.id}
              onClick={() => navigate(`/buildings/${buildingId}/floors/${floorId}/rooms/${room.id}`)}
              style={{
                position: 'absolute',
                left: `${room.posX}%`,
                top: `${room.posY}%`,
                width: `${room.width}%`,
                height: `${room.height}%`,
                border: `2px solid ${room.brokenCount > 0 ? 'var(--color-status-broken)' : 'var(--color-status-normal)'}`,
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: 'var(--color-text)',
                boxSizing: 'border-box' // สำคัญมากเพื่อให้ border ไม่ทำให้ขนาดกล่องเกิน
              }}
            >
              {room.roomNumber}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}


