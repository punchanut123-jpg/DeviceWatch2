import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';

interface Device {
  id: number;
  deviceCode: string;
  deviceName: string;
  posX: number; // เก็บไว้เผื่ออัปเกรดในอนาคต
  posY: number; // เก็บไว้เผื่ออัปเกรดในอนาคต
  status: 'normal' | 'broken' | 'under_repair';
}

export default function Devices() {
  const { buildingId, floorId, roomId } = useParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [symptom, setSymptom] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchDevices = () => {
    axios.get(`http://localhost:3000/api/rooms/${roomId}/devices`)
      .then(res => setDevices(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchDevices();
  }, [roomId]);

  const handleReport = async () => {
    if (!selectedDevice || !symptom) return;
    try {
      await axios.post('http://localhost:3000/api/tickets', { 
        deviceId: selectedDevice.id, 
        symptom 
      });
      setShowModal(false);
      setSymptom('');
      fetchDevices(); // Refresh ข้อมูลหลังแจ้งซ่อมสำเร็จ
      toast.success('แจ้งซ่อมเรียบร้อยแล้ว');
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการแจ้งซ่อม');
    }
  };

  // คำนวณสถิติ
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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <Breadcrumb items={[
          { label: 'หน้าแรก', path: '/' },
          { label: 'อาคาร IT', path: `/buildings/${buildingId}` },
          { label: 'ผังห้อง', path: `/buildings/${buildingId}/floors/${floorId}` },
          { label: 'อุปกรณ์' }
        ]} />

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--color-primary)' }}>{devices.length}</span> ทั้งหมด
          </div>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-status-normal)', borderRadius: '6px', fontWeight: 'bold', color: 'var(--color-status-normal)' }}>
            {normalCount} ปกติ
          </div>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-status-broken)', borderRadius: '6px', fontWeight: 'bold', color: 'var(--color-status-broken)' }}>
            {brokenCount} เสีย
          </div>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-status-repair)', borderRadius: '6px', fontWeight: 'bold', color: 'var(--color-status-repair)' }}>
            {repairCount} กำลังซ่อม
          </div>
        </div>

        {/* CSS Grid Container */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: '15px',
          padding: '2rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          {devices.map(device => (
            <div
              key={device.id}
              title={`${device.deviceName} (${getStatusText(device.status)})`} // Hover Tooltip
              onClick={() => { setSelectedDevice(device); setShowModal(true); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 5px',
                backgroundColor: getStatusColor(device.status),
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'white',
                transition: 'transform 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🖥️</span>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: '600', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                width: '100%', 
                textAlign: 'center' 
              }}>
                {device.deviceCode}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '15px', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-status-normal)' }}></div> ปกติ
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-status-broken)' }}></div> เสีย
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-status-repair)' }}></div> กำลังซ่อม
          </span>
        </div>
      </main>

      {/* Modal */}
      {showModal && selectedDevice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', width: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '1rem', fontWeight: 'bold' }}>
              แจ้งซ่อม: {selectedDevice.deviceCode}
            </div>
            <div style={{ padding: '1.5rem' }}>
              {/* ตรวจสอบสถานะเครื่องเพื่อแสดงเนื้อหา Modal */}
              {selectedDevice.status === 'normal' ? (
                <>
                  <textarea 
                    value={symptom} 
                    onChange={(e) => setSymptom(e.target.value)}
                    placeholder="ระบุอาการเสีย..."
                    style={{ width: '100%', height: '100px', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', resize: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={handleReport} 
                      disabled={!symptom.trim()}
                      style={{ flex: 1, backgroundColor: symptom.trim() ? 'var(--color-primary)' : 'var(--color-text-muted)', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '6px', cursor: symptom.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
                    >
                      ส่งแจ้งซ่อม
                    </button>
                    <button onClick={() => { setShowModal(false); setSymptom(''); }} style={{ flex: 1, backgroundColor: 'var(--color-border)', color: 'var(--color-text)', border: 'none', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>ยกเลิก</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--color-text-muted)' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>⚠️</span>
                    เครื่องนี้อยู่ระหว่างดำเนินการแจ้งซ่อม/ซ่อมแซม<br/>ไม่สามารถแจ้งซ่อมซ้ำได้
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex' }}>
                    <button onClick={() => { setShowModal(false); setSymptom(''); }} style={{ width: '100%', backgroundColor: 'var(--color-border)', color: 'var(--color-text)', border: 'none', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>ปิด</button>
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
