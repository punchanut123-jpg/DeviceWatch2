import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import './Devices.css'; // นำเข้า CSS ที่เราเพิ่งสร้าง

interface Device {
  id: number;
  deviceCode: string;
  deviceName: string;
  posX: number;
  posY: number;
  status: 'normal' | 'broken' | 'under_repair';
}

export default function Devices() {
  const { buildingId, floorId, roomId } = useParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [symptom, setSymptom] = useState('');
  const [showModal, setShowModal] = useState(false);

  // ดึงข้อมูลอุปกรณ์
  const fetchDevicesData = async () => {
    try {
      const res = await axios.get(`/api/rooms/${roomId}/devices`);
      setDevices(res.data);
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  // useEffect สำหรับจัดการ Auto Refresh ในเบื้องหลัง
  useEffect(() => {
    fetchDevicesData();

    // ดึงข้อมูลใหม่ทุกๆ 10 วินาทีแบบเงียบๆ
    const timer = setInterval(() => {
      fetchDevicesData();
    }, 10000);

    return () => clearInterval(timer);
  }, [roomId]);

  const handleReport = async () => {
    if (!selectedDevice || !symptom) return;
    try {
      await axios.post('/api/tickets', { 
        deviceId: selectedDevice.id, 
        symptom 
      });
      setShowModal(false);
      setSymptom('');
      await fetchDevicesData();
      toast.success('แจ้งซ่อมเรียบร้อยแล้ว');
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการแจ้งซ่อม');
    }
  };

  const normalCount = devices.filter(d => d.status === 'normal').length;
  const brokenCount = devices.filter(d => d.status === 'broken').length;
  const repairCount = devices.filter(d => d.status === 'under_repair').length;

  const getStatusColor = (status: string) => {
    if (status === 'broken') return 'var(--color-status-broken)';
    if (status === 'under_repair') return 'var(--color-status-repair)';
    return 'var(--color-status-normal)';
  };

  const getStatusText = (status: string) => {
    if (status === 'broken') return 'เสีย';
    if (status === 'under_repair') return 'กำลังซ่อม';
    return 'ปกติ';
  };

  return (
    <div className="devices-container">
      <Header />
      <main className="devices-main">
        <Breadcrumb buildingId={buildingId} floorId={floorId} roomId={roomId} />

        {devices.length === 0 ? (
          <div className="empty-devices-state">
            <div className="empty-icon">📂</div>
            <h3 className="empty-title">ไม่พบเครื่องคอมพิวเตอร์</h3>
            <p className="empty-subtitle">ห้องปฏิบัติการนี้ไม่มีอุปกรณ์คอมพิวเตอร์ติดตั้งอยู่</p>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="stats-bar">
              <div className="stat-item total"><span>{devices.length}</span> ทั้งหมด</div>
              <div className="stat-item normal">{normalCount} ปกติ</div>
              <div className="stat-item broken">{brokenCount} เสีย</div>
              <div className="stat-item repair">{repairCount} กำลังซ่อม</div>
            </div>

            {devices.length <= 2 ? (
              /* List View for 1-2 devices */
              <div className="devices-list-view">
                {devices.map(device => {
                  let badgeText = 'ปกติ';
                  let badgeClass = 'ok';
                  if (device.status === 'broken') {
                    badgeText = 'เสีย';
                    badgeClass = 'broken';
                  } else if (device.status === 'under_repair') {
                    badgeText = 'กำลังซ่อม';
                    badgeClass = 'repair';
                  }

                  return (
                    <div
                      key={device.id}
                      onClick={() => { setSelectedDevice(device); setShowModal(true); }}
                      className={`device-list-item-card status-${device.status}`}
                    >
                      <div className="device-list-info">
                        <span className="device-list-avatar">🖥️</span>
                        <div className="device-list-details">
                          <h3>{device.deviceName}</h3>
                          <span>{device.deviceCode}</span>
                        </div>
                      </div>
                      <span className={`list-badge ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Grid View for > 2 devices */
              <>
                <div className="devices-grid">
                  {devices.map(device => (
                    <div
                      key={device.id}
                      title={`${device.deviceName} (${getStatusText(device.status)})`}
                      onClick={() => { setSelectedDevice(device); setShowModal(true); }}
                      className="device-card"
                      style={{ backgroundColor: getStatusColor(device.status) }}
                    >
                      <span className="device-icon">🖥️</span>
                      <span className="device-code">{device.deviceCode}</span>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="legend">
                  <span className="legend-item"><div className="legend-dot normal"></div> ปกติ</span>
                  <span className="legend-item"><div className="legend-dot broken"></div> เสีย</span>
                  <span className="legend-item"><div className="legend-dot repair"></div> กำลังซ่อม</span>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Modal แจ้งซ่อม */}
      {showModal && selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              แจ้งซ่อม: {selectedDevice.deviceCode}
            </div>
            <div className="modal-body">
              {selectedDevice.status === 'normal' ? (
                <>
                  <textarea 
                    className="modal-textarea"
                    value={symptom} 
                    onChange={(e) => setSymptom(e.target.value)}
                    placeholder="ระบุอาการเสีย..."
                  />
                  <div className="modal-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={handleReport} 
                      disabled={!symptom.trim()}
                    >
                      ส่งแจ้งซ่อม
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setShowModal(false); setSymptom(''); }}>
                      ยกเลิก
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-warning">
                    <span>⚠️</span>
                    เครื่องนี้อยู่ระหว่างดำเนินการแจ้งซ่อม/ซ่อมแซม<br/>ไม่สามารถแจ้งซ่อมซ้ำได้
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setShowModal(false); setSymptom(''); }}>
                      ปิด
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
