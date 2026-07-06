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

  const fetchDevices = () => {
    axios.get(`/api/rooms/${roomId}/devices`)
      .then(res => setDevices(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchDevices();
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
      fetchDevices();
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
        <Breadcrumb items={[
          { label: 'หน้าแรก', path: '/' },
          { label: 'อาคาร IT', path: `/buildings/${buildingId}` },
          { label: 'ผังห้อง', path: `/buildings/${buildingId}/floors/${floorId}` },
          { label: 'อุปกรณ์' }
        ]} />

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item total"><span>{devices.length}</span> ทั้งหมด</div>
          <div className="stat-item normal">{normalCount} ปกติ</div>
          <div className="stat-item broken">{brokenCount} เสีย</div>
          <div className="stat-item repair">{repairCount} กำลังซ่อม</div>
        </div>

        {/* CSS Grid Container */}
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
