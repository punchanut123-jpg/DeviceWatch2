import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import './Rooms.css';

interface Device {
  id: number;
  status: string;
}

interface Room {
  id: number;
  roomNumber: string;
  roomName: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  brokenCount: number;
  devices: Device[];
}

export default function Rooms() {
  const { buildingId, floorId } = useParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/api/floors/${floorId}/rooms`)
      .then(res => {
        // เรียงลำดับห้องตามเลขห้อง (roomNumber) จากน้อยไปหามาก
        const sorted = (res.data as Room[]).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
        setRooms(sorted);
      })
      .catch(err => console.error(err));
  }, [floorId]);


  return (
    <div className="rooms-container">
      <Header />
      <main className="rooms-main">
        <Breadcrumb buildingId={buildingId} floorId={floorId} />

        <div className="rooms-header">
          <h2 className="rooms-title">รายชื่อห้องปฏิบัติการคอมพิวเตอร์</h2>
        </div>

        <div className="rooms-grid">
          {rooms.map(room => {
            const devicesCount = room.devices?.length || 0;
            const brokenCount = room.devices?.filter(d => d.status === 'broken').length || 0;
            const repairCount = room.devices?.filter(d => d.status === 'under_repair').length || 0;

            let cardStatusClass = 'status-ok';
            let statusText = 'ปกติทุกเครื่อง';
            let statusBadgeClass = 'ok';

            if (brokenCount > 0) {
              cardStatusClass = 'status-broken';
              statusText = `ชำรุด ${brokenCount} เครื่อง`;
              statusBadgeClass = 'broken';
            } else if (repairCount > 0) {
              cardStatusClass = 'status-repair';
              statusText = `กำลังซ่อม ${repairCount} เครื่อง`;
              statusBadgeClass = 'repair';
            }

            const hasDevices = devicesCount > 0;

            return (
              <div
                key={room.id}
                onClick={() => {
                  if (hasDevices) {
                    navigate(`/buildings/${buildingId}/floors/${floorId}/rooms/${room.id}`);
                  }
                }}
                className={`room-card ${cardStatusClass}`}
                style={{ 
                  cursor: hasDevices ? 'pointer' : 'not-allowed',
                  opacity: hasDevices ? 1 : 0.8
                }}
              >
                <div>
                  <div className="room-card-header">
                    <span className="room-number-badge">{room.roomNumber}</span>
                    <span className={`room-status-badge ${statusBadgeClass}`}>
                      {statusText}
                    </span>
                  </div>
                  <h3 className="room-name">{room.roomName || `ห้องปฏิบัติการ ${room.roomNumber}`}</h3>
                </div>

                <div>
                  <div className="room-stats-summary">
                    <div className="room-stat-pill">
                      🖥️ อุปกรณ์ทั้งหมด: <span>{devicesCount}</span>
                    </div>
                    {brokenCount > 0 && (
                      <div className="room-stat-pill broken-pill">
                        🔴 เสีย: <span>{brokenCount}</span>
                      </div>
                    )}
                    {repairCount > 0 && (
                      <div className="room-stat-pill repair-pill">
                        🟡 ซ่อม: <span>{repairCount}</span>
                      </div>
                    )}
                  </div>
                  <div 
                    className="room-card-footer" 
                    style={{ 
                      color: hasDevices ? 'var(--color-primary)' : 'var(--color-text-muted)' 
                    }}
                  >
                    {hasDevices ? (
                      <>ดูเครื่องคอมพิวเตอร์และแจ้งซ่อม <span>➔</span></>
                    ) : (
                      <span>ไม่มีอุปกรณ์คอมพิวเตอร์</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}


