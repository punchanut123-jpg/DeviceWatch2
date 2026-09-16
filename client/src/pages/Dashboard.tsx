import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Building, Floor, Room } from '../types';

type Step = 'building' | 'floor' | 'room';

export default function Dashboard() {
  const navigate = useNavigate();
  const { student } = useAuth();
  const [step, setStep] = useState<Step>('building');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load buildings on mount
  useEffect(() => {
    setLoading(true);
    api.buildings.list()
      .then(setBuildings)
      .catch(() => setError('ไม่สามารถโหลดข้อมูลได้'))
      .finally(() => setLoading(false));
  }, []);

  const selectBuilding = useCallback(async (b: Building) => {
    setSelectedBuilding(b);
    setLoading(true);
    setError('');
    try {
      const data = await api.buildings.floors(b.id);
      setFloors(data);
      setStep('floor');
    } catch {
      setError('ไม่สามารถโหลดข้อมูลชั้นได้');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFloor = useCallback(async (f: Floor) => {
    setSelectedFloor(f);
    setLoading(true);
    setError('');
    try {
      const data = await api.buildings.rooms(f.id);
      setRooms(data);
      setStep('room');
    } catch {
      setError('ไม่สามารถโหลดข้อมูลห้องได้');
    } finally {
      setLoading(false);
    }
  }, []);

  const goBack = () => {
    if (step === 'room') { setStep('floor'); setSelectedFloor(null); }
    else if (step === 'floor') { setStep('building'); setSelectedBuilding(null); }
  };

  return (
    <div className="page">
      <style>{`
        @media (max-width: 767px) {
          .desktop-breadcrumb { display: none !important; }
          .mobile-breadcrumb { display: flex !important; }
          .hero-section { padding-top: 1.5rem; padding-bottom: 1rem; }
          .hero-label, .hero-subtitle { display: none; }
          .page-section-header .btn-ghost { padding: 0.4rem; min-width: 40px; }
          .page-section-header .btn-ghost span { display: none; }
        }
        @media (min-width: 768px) {
          .mobile-breadcrumb { display: none !important; }
          .desktop-breadcrumb { display: flex !important; }
        }
      `}</style>

      {/* ── Top Nav ─────────────────────────────────────────── */}
      <nav className="topnav">
        <div className="topnav-inner" style={{ justifyContent: 'space-between' }}>
          <div className="topnav-brand">
            <img src="/logo.png" alt="IT Faculty Logo" className="topnav-logo-img" />
            <span className="topnav-logo">DeviceWatch</span>
          </div>
          <div className="topnav-right" style={{ marginLeft: 0, gap: '1rem' }}>
            {student && (
              <span 
                style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}
                onClick={() => navigate('/my-reports')}
              >
                ประวัติการแจ้ง
              </span>
            )}
            <div className="online-indicator">
              <span className="online-dot" />
              <span>ออนไลน์</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 2 }}>
        <div className="breadcrumb desktop-breadcrumb">
          <span
            className={`breadcrumb-item${step !== 'building' ? ' clickable' : ' active'}`}
            style={{ cursor: step !== 'building' ? 'pointer' : 'default' }}
            onClick={() => step !== 'building' && (setStep('building'), setSelectedBuilding(null))}
          >
            🏢 อาคาร
          </span>

          {selectedBuilding && (
            <>
              <span className="breadcrumb-sep">›</span>
              <span
                className={`breadcrumb-item${step === 'floor' ? ' active' : ' clickable'}`}
                style={{ cursor: step === 'room' ? 'pointer' : 'default' }}
                onClick={() => step === 'room' && (setStep('floor'), setSelectedFloor(null))}
              >
                {selectedBuilding.name}
              </span>
            </>
          )}

          {selectedFloor && (
            <>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-item active">ชั้น {selectedFloor.number}</span>
            </>
          )}
        </div>

        {/* Mobile Breadcrumb (one line with back arrow) */}
        <div className="breadcrumb mobile-breadcrumb" style={{ display: 'none' }}>
          {step === 'building' && (
            <span className="breadcrumb-item active">🏢 อาคาร</span>
          )}
          {step === 'floor' && (
            <>
              <span className="breadcrumb-item clickable" onClick={goBack}>← กลับ</span>
              <span className="breadcrumb-sep">|</span>
              <span className="breadcrumb-item active">{selectedBuilding?.name}</span>
            </>
          )}
          {step === 'room' && (
            <>
              <span className="breadcrumb-item clickable" onClick={goBack}>← กลับ</span>
              <span className="breadcrumb-sep">|</span>
              <span className="breadcrumb-item active">ชั้น {selectedFloor?.number}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main style={{ flex: 1, paddingBottom: '6rem' }}>
        <div className="container">

          {error && <div className="alert alert-error mt-2">⚠️ {error}</div>}

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
              <span>กำลังโหลด...</span>
            </div>
          ) : (
            <>
              {/* ── Step: Building ──────────────────────────── */}
              {step === 'building' && (
                <>
                  <div className="hero-section">
                    <h1 className="hero-title" style={{ fontSize: '22px', marginBottom: 0 }}>เลือกอาคาร</h1>
                  </div>

                  <div className="buildings-grid">
                    {buildings.map((b, idx) => (
                      <div
                        key={b.id}
                        className="building-card"
                        style={{ animationDelay: `${idx * 80}ms`, padding: '1.25rem', minHeight: 'auto', display: 'flex', flexDirection: 'column' }}
                        onClick={() => selectBuilding(b)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                            🏢
                          </div>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: '0.2rem' }}>{b.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ข้อมูลอาคารเรียน</div>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary w-full"
                          style={{ borderRadius: '12px', justifyContent: 'center' }}
                          onClick={(e) => { e.stopPropagation(); selectBuilding(b); }}
                        >
                          เข้าสู่อาคาร →
                        </button>
                      </div>
                    ))}

                    {buildings.length === 0 && (
                      <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <div className="empty-state-icon">🏗️</div>
                        <div className="empty-state-text">ไม่พบข้อมูลอาคาร</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step: Floor ─────────────────────────────── */}
              {step === 'floor' && (
                <>
                  <div className="page-section-header">
                    <button className="btn btn-ghost btn-sm" onClick={goBack}>← กลับ</button>
                    <div className="page-section-text">
                      <h1 className="page-title">เลือกชั้น</h1>
                      <p className="page-subtitle">{selectedBuilding?.name}</p>
                    </div>
                  </div>

                  <div className="floors-grid">
                    {floors.map((f, idx) => (
                      <div
                        key={f.id}
                        className="floor-card"
                        style={{ animationDelay: `${idx * 60}ms` }}
                        onClick={() => selectFloor(f)}
                      >
                        <div className="floor-card-inner">
                          <div className="floor-card-icon">🏗️</div>
                          <div className="floor-card-name">ชั้น {f.number}</div>
                          <div className="floor-card-meta">
                            {(f._count?.rooms ?? 0) > 0 && (
                              <span className="meta-pill">🚪 {f._count?.rooms} ห้อง</span>
                            )}
                          </div>
                        </div>
                        <div className="floor-card-footer">
                          <button
                            className="floor-card-btn"
                            onClick={(e) => { e.stopPropagation(); selectFloor(f); }}
                          >
                            ดูห้อง →
                          </button>
                        </div>
                      </div>
                    ))}

                    {floors.length === 0 && (
                      <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <div className="empty-state-icon">🏗️</div>
                        <div className="empty-state-text">ไม่พบข้อมูลชั้น</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step: Room ──────────────────────────────── */}
              {step === 'room' && (
                <>
                  <div className="page-section-header">
                    <button className="btn btn-ghost btn-sm" onClick={goBack}>← กลับ</button>
                    <div className="page-section-text">
                      <h1 className="page-title">เลือกห้อง</h1>
                      <p className="page-subtitle">ชั้น {selectedFloor?.number} — {selectedBuilding?.name}</p>
                    </div>
                  </div>

                  <div className="rooms-grid">
                    {rooms.map((r, idx) => (
                      <div
                        key={r.id}
                        className="room-card"
                        style={{ animationDelay: `${idx * 50}ms` }}
                        onClick={() => navigate(`/room/${r.id}`)}
                      >
                        <div className="room-card-inner">
                          <div className="room-card-icon">🖥️</div>
                          <div className="room-card-name">ห้อง {r.name}</div>
                          <div className="room-card-total">
                            {r._count?.devices ?? 0} เครื่อง
                          </div>
                        </div>
                        <div className="room-card-footer">
                          <button
                            className="room-card-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/room/${r.id}`); }}
                          >
                            ดูรายละเอียด →
                          </button>
                        </div>
                      </div>
                    ))}

                    {rooms.length === 0 && (
                      <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <div className="empty-state-icon">🚪</div>
                        <div className="empty-state-text">ไม่พบข้อมูลห้อง</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="footer-bar">
        <div className="footer-bar-inner">
          <div className="footer-brand">
            <span className="footer-logo-text">DeviceWatch</span>
            <div className="footer-divider" />
            <span className="footer-faculty">คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเพชรบุรี</span>
          </div>
          <div className="footer-right" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem' }} onClick={() => navigate('/teacher/login')}>
              สำหรับอาจารย์
            </span>
            <div>v1.0.0</div>
            <div>© 2026 IT Faculty</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
