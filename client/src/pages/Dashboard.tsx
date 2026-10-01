import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, ChevronRight, ClipboardList, DoorOpen, Layers3, MapPin, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Building, Floor, Room } from '../types';

type Step = 'building' | 'floor' | 'room';

const STEP_ORDER: Step[] = ['building', 'floor', 'room'];
const STEP_LABELS: Record<Step, string> = { building: 'อาคาร', floor: 'ชั้น', room: 'ห้อง' };

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

  useEffect(() => {
    setLoading(true);
    api.buildings.list()
      .then(setBuildings)
      .catch(() => setError('ไม่สามารถโหลดข้อมูลอาคารได้'))
      .finally(() => setLoading(false));
  }, []);

  const selectBuilding = useCallback(async (building: Building) => {
    setSelectedBuilding(building);
    setLoading(true);
    setError('');
    try {
      setFloors(await api.buildings.floors(building.id));
      setStep('floor');
    } catch {
      setError('ไม่สามารถโหลดข้อมูลชั้นได้');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFloor = useCallback(async (floor: Floor) => {
    setSelectedFloor(floor);
    setLoading(true);
    setError('');
    try {
      setRooms(await api.buildings.rooms(floor.id));
      setStep('room');
    } catch {
      setError('ไม่สามารถโหลดข้อมูลห้องได้');
    } finally {
      setLoading(false);
    }
  }, []);

  const goToStep = (nextStep: Step) => {
    if (nextStep === 'building') {
      setStep('building');
      setSelectedBuilding(null);
      setSelectedFloor(null);
    }
    if (nextStep === 'floor' && selectedBuilding) {
      setStep('floor');
      setSelectedFloor(null);
    }
  };

  const goBack = () => goToStep(step === 'room' ? 'floor' : 'building');
  const currentIndex = STEP_ORDER.indexOf(step);
  const pageTitle = step === 'building' ? 'เลือกอาคารเรียน' : step === 'floor' ? 'เลือกชั้นเรียน' : 'เลือกห้องปฏิบัติการ';
  const pageDescription = step === 'building'
    ? 'เริ่มต้นด้วยการเลือกอาคารที่คุณกำลังใช้งาน'
    : step === 'floor'
      ? selectedBuilding?.name
      : `ชั้น ${selectedFloor?.number} · ${selectedBuilding?.name}`;

  return (
    <div className="page dashboard-page">
      <nav className="topnav">
        <div className="topnav-inner dashboard-topnav">
          <div className="topnav-brand">
            <img src="/logo.png" alt="โลโก้คณะเทคโนโลยีสารสนเทศ" className="topnav-logo-img" />
            <span className="topnav-logo">DeviceWatch</span>
          </div>
          <div className="dashboard-topnav-actions">
            <button className="dashboard-reports-link" onClick={() => navigate('/my-reports')}>
              <ClipboardList size={17} />
              <span>รายการของฉัน</span>
            </button>
            {student && <span className="dashboard-user-name">{student.name}</span>}
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="container">
          <section className="dashboard-heading">
            <div>
              <p className="dashboard-eyebrow">แจ้งปัญหาอุปกรณ์</p>
              <h1>{pageTitle}</h1>
              <p>{pageDescription}</p>
            </div>
            {step !== 'building' && (
              <button className="btn btn-ghost btn-sm dashboard-back-button" onClick={goBack}>
                <ArrowLeft size={16} /> กลับ
              </button>
            )}
          </section>

          <nav className="dashboard-steps" aria-label="ขั้นตอนเลือกห้อง">
            {STEP_ORDER.map((item, index) => {
              const canNavigate = index < currentIndex;
              return (
                <button key={item} className={`dashboard-step ${item === step ? 'active' : ''} ${index < currentIndex ? 'complete' : ''}`} onClick={() => canNavigate && goToStep(item)} disabled={!canNavigate && item !== step}>
                  <span>{index + 1}</span>{STEP_LABELS[item]}
                </button>
              );
            })}
          </nav>

          {error && <div className="alert alert-error dashboard-alert">{error}</div>}
          {loading ? (
            <div className="loading-center"><div className="spinner" /><span>กำลังโหลดข้อมูล...</span></div>
          ) : (
            <section className="dashboard-choice-grid">
              {step === 'building' && buildings.map((building) => (
                <button key={building.id} className="dashboard-choice-card" onClick={() => selectBuilding(building)}>
                  <span className="dashboard-choice-icon"><Building2 size={26} /></span>
                  <span className="dashboard-choice-content"><strong>{building.name}</strong><small><MapPin size={14} /> เลือกอาคารเพื่อดูชั้นเรียน</small></span>
                  <ChevronRight className="dashboard-choice-arrow" size={20} />
                </button>
              ))}
              {step === 'floor' && floors.map((floor) => (
                <button key={floor.id} className="dashboard-choice-card" onClick={() => selectFloor(floor)}>
                  <span className="dashboard-choice-icon"><Layers3 size={26} /></span>
                  <span className="dashboard-choice-content"><strong>ชั้น {floor.number}</strong><small><DoorOpen size={14} /> {floor._count?.rooms ?? 0} ห้องปฏิบัติการ</small></span>
                  <ChevronRight className="dashboard-choice-arrow" size={20} />
                </button>
              ))}
              {step === 'room' && rooms.map((room) => (
                <button key={room.id} className="dashboard-choice-card" onClick={() => navigate(`/room/${room.id}`)}>
                  <span className="dashboard-choice-icon"><Monitor size={26} /></span>
                  <span className="dashboard-choice-content"><strong>ห้อง {room.name}</strong><small>{room._count?.devices ?? 0} เครื่องพร้อมตรวจสอบสถานะ</small></span>
                  <ChevronRight className="dashboard-choice-arrow" size={20} />
                </button>
              ))}
              {((step === 'building' && buildings.length === 0) || (step === 'floor' && floors.length === 0) || (step === 'room' && rooms.length === 0)) && (
                <div className="empty-state dashboard-empty"><Building2 size={42} /><div className="empty-state-text">ไม่พบข้อมูล{STEP_LABELS[step]}</div></div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="footer-bar">
        <div className="footer-bar-inner">
          <div className="footer-brand"><span className="footer-logo-text">DeviceWatch</span><div className="footer-divider" /><span className="footer-faculty">คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเพชรบุรี</span></div>
          <button className="dashboard-teacher-link" onClick={() => navigate('/teacher/login')}>สำหรับอาจารย์</button>
        </div>
      </footer>
    </div>
  );
}
