import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Home,
  Loader2,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import type { RoomDetail, Device } from '../types';
import { STATUS_TOKENS } from '../utils/roomGrouping';
import RoomLayout2D from '../components/RoomLayout2D';
import { useAuth } from '../context/AuthContext';

// Room poll interval
const POLL_INTERVAL = 10_000;

// ── Device Status Modal (replaces alert()) ───────────────────
function DeviceStatusModal({
  device,
  onClose,
  onReport,
}: {
  device: Device;
  onClose: () => void;
  onReport: () => void;
}) {
  const conf = STATUS_TOKENS[device.status] || STATUS_TOKENS.normal;
  const isNonNormal = device.status !== 'normal';

  const StatusIcon =
    device.status === 'broken'
      ? AlertTriangle
      : device.status === 'under_repair'
      ? Wrench
      : CheckCircle2;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-drag-handle" />
        <div className="modal-header">
          <div className="modal-title">สถานะเครื่อง {device.name}</div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body text-center" style={{ padding: '1.75rem 1.5rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: conf.iconBg,
              border: `2px solid ${conf.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <StatusIcon size={30} color={conf.border} />
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: conf.badgeBg,
              color: conf.badgeText,
              border: `1px solid ${conf.border}`,
              padding: '0.3rem 0.9rem',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.88rem',
              marginBottom: '0.75rem',
            }}
          >
            <StatusIcon size={14} />
            {conf.label}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {device.status === 'broken'
              ? 'เครื่องนี้อยู่ในสถานะรอซ่อม ยังไม่สามารถรับแจ้งซ่อมซ้ำได้'
              : 'เครื่องนี้กำลังอยู่ระหว่างดำเนินการซ่อม ช่างได้รับทราบแล้ว'}
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
          {isNonNormal && (
            <button className="btn btn-ghost btn-sm" onClick={onReport}>
              แจ้งซ่อมเพิ่ม
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            รับทราบ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ticket Report Modal ─────────────────────────────────────
function ReportModal({
  device,
  room,
  onClose,
  onReported,
}: {
  device: Device;
  room: RoomDetail;
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

  const locationLabel = `ห้อง ${room.name} · ชั้น ${room.floor.number} · ${room.floor.building.name}`;
  const coordLabel =
    device.posX !== null && device.posY !== null
      ? `พิกัด: ${device.posX}%, ${device.posY}%`
      : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-drag-handle" />
        <div className="modal-header">
          <div>
            <div className="modal-title">แจ้งปัญหาเครื่อง {device.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {locationLabel}
              {coordLabel && (
                <span style={{ marginLeft: '0.5rem', color: 'var(--text-dim)' }}>
                  · {coordLabel}
                </span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
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
            {loading ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                กำลังส่ง...
              </>
            ) : (
              'ส่งแจ้งซ่อม'
            )}
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
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--success-bg)',
              border: '2px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              animation: 'float 2s ease-in-out infinite',
            }}
          >
            <CheckCircle2 size={36} color="var(--success-dark)" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            ส่งแจ้งซ่อมสำเร็จ
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
  const [statusDevice, setStatusDevice] = useState<Device | null>(null);
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
      setStatusDevice(device);
      return;
    }
    setReportingDevice(device);
  };

  const handleReported = () => {
    setReportingDevice(null);
    setShowSuccess(true);
    fetchRoom();
  };

  const normalCount = room?.devices.filter((d) => d.status === 'normal').length ?? 0;
  const brokenCount = room?.devices.filter((d) => d.status === 'broken').length ?? 0;
  const repairCount = room?.devices.filter((d) => d.status === 'under_repair').length ?? 0;

  return (
    <div className="page">
      {/* ── Top Nav ── */}
      <nav className="topnav">
        <div className="topnav-inner dashboard-topnav">
          <div className="topnav-brand">
            <img src="/logo.png" alt="โลโก้" className="topnav-logo-img" />
            <span className="topnav-logo">
              {room ? `ห้อง ${room.name}` : 'DeviceWatch'}
            </span>
          </div>
          <div className="dashboard-topnav-actions">
            <button className="dashboard-reports-link" onClick={() => navigate('/my-reports')}>
              <ClipboardList size={17} />
              <span>รายการของฉัน</span>
            </button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, paddingBottom: '6rem', paddingTop: '1.25rem' }}>
        <div className="container">
          {loading && (
            <div className="loading-center">
              <div className="spinner" />
              <span>กำลังโหลด...</span>
            </div>
          )}
          {error && !loading && <div className="alert alert-error mt-2">⚠️ {error}</div>}

          {room && !loading && (
            <div className="room-view-wrapper">
              {/* ── Desktop Sidebar (>= 1024px) ── */}
              <aside className="room-sidebar">
                <div className="room-sidebar-card">
                  <div className="room-sidebar-title">ข้อมูลห้องเรียน</div>
                  <div className="room-sidebar-item">
                    <span>ห้อง:</span>
                    <strong style={{ color: '#185FA5' }}>{room.name}</strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span>ชั้น:</span>
                    <strong>ชั้น {room.floor.number}</strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span>อาคาร:</span>
                    <span>{room.floor.building.name}</span>
                  </div>
                  <div className="room-sidebar-item">
                    <span>จำนวนเครื่อง:</span>
                    <strong>{room.devices.length} เครื่อง</strong>
                  </div>
                </div>

                <div className="room-sidebar-card">
                  <div className="room-sidebar-title">สรุปสถานะ</div>
                  <div className="room-sidebar-item">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: STATUS_TOKENS.normal.text, fontWeight: 600 }}>
                      <CheckCircle2 size={14} color={STATUS_TOKENS.normal.border} /> ปกติ
                    </span>
                    <strong style={{ color: STATUS_TOKENS.normal.text }}>{normalCount}</strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: STATUS_TOKENS.under_repair.text, fontWeight: 600 }}>
                      <Wrench size={14} color={STATUS_TOKENS.under_repair.border} /> กำลังซ่อม
                    </span>
                    <strong style={{ color: STATUS_TOKENS.under_repair.text }}>{repairCount}</strong>
                  </div>
                  <div className="room-sidebar-item">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: STATUS_TOKENS.broken.text, fontWeight: 600 }}>
                      <AlertTriangle size={14} color={STATUS_TOKENS.broken.border} /> เสีย
                    </span>
                    <strong style={{ color: STATUS_TOKENS.broken.text }}>{brokenCount}</strong>
                  </div>
                </div>

                <div className="room-sidebar-card">
                  <div className="room-sidebar-title">นำทางด่วน</div>
                  <button
                    className="btn btn-ghost btn-sm btn-full"
                    onClick={() => navigate('/')}
                    style={{ justifyContent: 'flex-start', marginBottom: '0.4rem', border: '1px solid #E2E8F0', background: '#F8FAFC' }}
                  >
                    <Home size={15} /> เลือกห้องอื่น
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-full"
                    onClick={() => navigate('/my-reports')}
                    style={{ justifyContent: 'flex-start', border: '1px solid #E2E8F0', background: '#F8FAFC' }}
                  >
                    <ClipboardList size={15} /> รายงานของฉัน
                  </button>
                </div>
              </aside>

              {/* ── Main Content Area ── */}
              <div className="room-content-area">
                {/* Mobile bar (< 1024px) */}
                <div className="room-mobile-bar">
                  <div className="room-mobile-bar-stats">
                    <span className="room-mobile-stat room-mobile-stat-normal">
                      <CheckCircle2 size={13} /> {normalCount} ปกติ
                    </span>
                    <span className="room-mobile-stat room-mobile-stat-repair">
                      <Wrench size={13} /> {repairCount} ซ่อม
                    </span>
                    <span className="room-mobile-stat room-mobile-stat-broken">
                      <AlertTriangle size={13} /> {brokenCount} เสีย
                    </span>
                  </div>
                  <div className="room-mobile-bar-links">
                    <button className="room-mobile-link" onClick={() => navigate('/')}>
                      <Home size={13} /> ห้องอื่น
                    </button>
                    <span className="room-mobile-bar-sep" />
                    <button className="room-mobile-link" onClick={() => navigate('/my-reports')}>
                      <ClipboardList size={13} /> รายงานของฉัน <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

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
          <div className="footer-brand">
            <span className="footer-logo-text">DeviceWatch</span>
            <div className="footer-divider" />
            <span className="footer-faculty">คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเพชรบุรี</span>
          </div>
          <div className="footer-right">
            <div>v1.0.0</div>
            <div>© 2026 IT Faculty</div>
          </div>
        </div>
      </footer>

      {/* ── Device Status Modal (non-normal click) ── */}
      {statusDevice && (
        <DeviceStatusModal
          device={statusDevice}
          onClose={() => setStatusDevice(null)}
          onReport={() => {
            setStatusDevice(null);
            setReportingDevice(statusDevice);
          }}
        />
      )}

      {/* ── Report Modal ── */}
      {reportingDevice && room && (
        <ReportModal
          device={reportingDevice}
          room={room}
          onClose={() => setReportingDevice(null)}
          onReported={handleReported}
        />
      )}

      {/* ── Success Modal ── */}
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
    </div>
  );
}
