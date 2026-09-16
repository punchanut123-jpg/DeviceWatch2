import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { RoomDetail, Device } from '../types';
import RoomLayout2D from '../components/RoomLayout2D';
import { useAuth } from '../context/AuthContext';

// Room 26201 uses full 2D map view by default
const POLL_INTERVAL = 10_000;  // 10 seconds

// ── Ticket Report Modal ─────────────────────────────────────
function ReportModal({
  device,
  onClose,
  onReported,
}: {
  device: Device;
  onClose: () => void;
  onReported: () => void;
}) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token, student } = useAuth();

  const submit = async () => {
    if (description.trim().length < 5) {
      setError('กรุณาอธิบายอาการให้ละเอียดขึ้น (อย่างน้อย 5 ตัวอักษร)');
      return;
    }
    
    if (!token || !student) {
      setError('คุณยังไม่ได้เข้าสู่ระบบ');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.tickets.create(device.id, description.trim(), token, undefined, student.id);
      onReported();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-drag-handle" />
        <div className="modal-header">
          <div>
            <div className="modal-title">แจ้งปัญหาเครื่อง {device.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              สถานที่: ห้อง 26201 (พิกัด: {device.posX}%, {device.posY}%)
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">อาการที่พบ *</label>
            <textarea
              className="form-textarea"
              placeholder="เช่น จอไม่ติด, เปิดเครื่องไม่ขึ้น, เมาส์ไม่ทำงาน..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              autoFocus
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              {description.length}/500
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <div className="section-title">เลือกอาการด่วน</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['จอไม่ติด', 'เปิดไม่ติด', 'เมาส์เสีย', 'คีย์บอร์ดเสีย', 'อินเทอร์เน็ตใช้ไม่ได้'].map((t) => (
                <button
                  key={t}
                  className="btn btn-ghost btn-sm quick-template-btn"
                  style={{ borderRadius: '20px', border: '1px solid var(--border)' }}
                  onClick={() => setDescription((prev) => prev ? `${prev}, ${t}` : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-full"
            style={{ width: '100%', marginBottom: '0.5rem' }}
            onClick={submit}
            disabled={loading || description.trim().length < 5}
          >
            {loading ? '⏳ กำลังส่ง...' : 'ส่งแจ้งซ่อม'}
          </button>
          <button className="btn btn-ghost btn-full" style={{ width: '100%' }} onClick={onClose} disabled={loading}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success Modal ───────────────────────────────────────────
function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-body text-center" style={{ padding: '2.5rem 1.5rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }}>✅</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            ส่งแจ้งซ่อมสำเร็จ!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            ช่างจะได้รับแจ้งผ่าน LINE ทันที
          </p>
          <button className="btn btn-primary btn-full" onClick={onClose}>
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main RoomView Component ─────────────────────────────────
export default function RoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportingDevice, setReportingDevice] = useState<Device | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await api.buildings.roomDetail(Number(roomId));
      setRoom(data);
      setError('');
    } catch {
      setError('ไม่สามารถโหลดข้อมูลห้องได้');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchRoom]);

  const handleDeviceClick = (device: Device) => {
    if (device.status !== 'normal') {
      alert(`เครื่อง ${device.name} อยู่ในสถานะ: ${device.status === 'broken' ? 'รอซ่อม' : 'กำลังซ่อม'}\n\n(ระบบยังไม่เปิดให้ดูประวัติการซ่อมในเวอร์ชันนี้)`);
      return;
    }
    setReportingDevice(device);
  };

  const handleReported = () => {
    setReportingDevice(null);
    setShowSuccess(true);
    fetchRoom();
  };

  return (
    <div className="page">
      <style>{`
        @media (max-width: 767px) {
          .back-text { display: none; }
          .quick-template-btn { min-height: 44px !important; font-size: 0.95rem !important; padding: 0.5rem 1rem !important; flex: 1 1 45%; justify-content: center; }
          .modal { border-radius: var(--radius-xl) var(--radius-xl) 0 0 !important; }
        }
      `}</style>

      <nav className="topnav">
        <div className="topnav-inner">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ padding: '0.4rem 0.75rem', minHeight: '36px' }}>
            ← <span className="back-text">กลับ</span>
          </button>
          <div className="topnav-brand" style={{ flex: 1, justifyContent: 'center' }}>
            <span className="topnav-logo">{room ? `ห้อง ${room.name}` : 'กำลังโหลด...'}</span>
          </div>
          <div className="topnav-right"><div className="online-indicator"><span className="online-dot" /><span>ออนไลน์</span></div></div>
        </div>
      </nav>

      <main style={{ flex: 1, paddingBottom: '6rem', paddingTop: '1.25rem' }}>
        <div className="container">
          {loading && <div className="loading-center"><div className="spinner" /><span>กำลังโหลด...</span></div>}
          {error && !loading && <div className="alert alert-error mt-2">⚠️ {error}</div>}
          
          {room && !loading && (
            <div className="room-view-wrapper">
              {/* Desktop Navigation Sidebar (>= 1024px) */}
              <aside className="room-sidebar">
                <div className="room-sidebar-card">
                  <div className="room-sidebar-title">ข้อมูลห้องเรียน</div>
                  <div className="room-sidebar-item">
                    <span>ห้อง:</span>
                    <strong style={{ color: '#185FA5' }}>{room.name}</strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span>จำนวนเครื่อง:</span>
                    <strong>{room.devices.length} เครื่อง</strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span>สถานที่:</span>
                    <span>อาคาร IT (ชั้น 2)</span>
                  </div>
                </div>

                <div className="room-sidebar-card">
                  <div className="room-sidebar-title">สรุปสถานะ</div>
                  <div className="room-sidebar-item">
                    <span style={{ color: '#27500A', fontWeight: 600 }}>🟢 ปกติ</span>
                    <strong style={{ color: '#27500A' }}>
                      {room.devices.filter((d) => d.status === 'normal').length}
                    </strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span style={{ color: '#854F0B', fontWeight: 600 }}>🟡 กำลังซ่อม</span>
                    <strong style={{ color: '#854F0B' }}>
                      {room.devices.filter((d) => d.status === 'under_repair').length}
                    </strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span style={{ color: '#A32D2D', fontWeight: 600 }}>🔴 เสีย</span>
                    <strong style={{ color: '#A32D2D' }}>
                      {room.devices.filter((d) => d.status === 'broken').length}
                    </strong>
                  </div>
                </div>

                <div className="room-sidebar-card">
                  <div className="room-sidebar-title">นำทางด่วน</div>
                  <button
                    className="btn btn-ghost btn-sm btn-full"
                    onClick={() => navigate('/')}
                    style={{ justifyContent: 'flex-start', marginBottom: '0.4rem', border: '1px solid #E2E8F0', background: '#F8FAFC' }}
                  >
                    🏠 เลือกห้องอื่น
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-full"
                    onClick={() => navigate('/my-reports')}
                    style={{ justifyContent: 'flex-start', border: '1px solid #E2E8F0', background: '#F8FAFC' }}
                  >
                    📋 รายงานของฉัน
                  </button>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="room-content-area">
                {/* Clean 2D Top-Down Operational View */}
                <RoomLayout2D
                  devices={room.devices}
                  roomName={room.name}
                  onDeviceClick={handleDeviceClick}
                  selectedDeviceId={reportingDevice?.id}
                />
                
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <div className="auto-refresh-badge" style={{ display: 'inline-flex' }}>
                    <span className="refresh-dot" />
                    รีเฟรชอัตโนมัติทุก 10 วิ
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer-bar">
        <div className="footer-bar-inner">
          <div className="footer-brand"><span className="footer-logo-text">DeviceWatch</span><div className="footer-divider" /><span className="footer-faculty">คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเพชรบุรี</span></div>
          <div className="footer-right"><div>v1.0.0</div><div>© 2026 IT Faculty</div></div>
        </div>
      </footer>

      {reportingDevice && (
        <ReportModal
          device={reportingDevice}
          onClose={() => setReportingDevice(null)}
          onReported={handleReported}
        />
      )}

      {showSuccess && (
        <SuccessModal onClose={() => setShowSuccess(false)} />
      )}
    </div>
  );
}
