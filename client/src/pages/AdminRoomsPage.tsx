import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilRuler, Monitor, AlertCircle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { api } from '../api/client';

interface RoomItem {
  id: number;
  name: string;
  floor: { number: number; building: { name: string } };
  _count: { devices: number };
}

export default function AdminRoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.buildings
      .allRooms()
      .then(setRooms)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Group rooms by floor
  const roomsByFloor = rooms.reduce<Record<number, RoomItem[]>>((acc, room) => {
    const floorNum = room.floor.number;
    if (!acc[floorNum]) acc[floorNum] = [];
    acc[floorNum].push(room);
    return acc;
  }, {});

  const floorNumbers = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <AdminLayout active="rooms" title="เลือกห้องปฏิบัติการเพื่อจัดผัง">
      {error && (
        <div className="alert alert-error mb-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <span>กำลังโหลดรายการห้องเรียน...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {floorNumbers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">ไม่พบรายการห้องปฏิบัติการ</div>
            </div>
          ) : (
            floorNumbers.map((floorNum) => (
              <div key={floorNum}>
                <h3
                  style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  🏢 ชั้น {floorNum} ({roomsByFloor[floorNum].length} ห้อง)
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {roomsByFloor[floorNum].map((room) => (
                    <div
                      key={room.id}
                      onClick={() => navigate(`/admin/rooms/${room.id}/editor`)}
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '1.2rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      }}
                      className="room-card-hover"
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              color: '#0F172A',
                            }}
                          >
                            ห้อง {room.name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#2563EB',
                              background: '#EFF6FF',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                            }}
                          >
                            ชั้น {room.floor.number}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            color: '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <Monitor size={15} color="#475569" />
                          <span>{room._count.devices} เครื่อง</span>
                        </div>
                      </div>

                      <button
                        style={{
                          marginTop: '1.2rem',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#2563EB',
                          background: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <PencilRuler size={15} /> จัดผังห้องนี้
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AdminLayout>
  );
}
