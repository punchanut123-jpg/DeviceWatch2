import { useState, useRef, useEffect, useCallback } from 'react';
import type { Device } from '../types';
import {
  Save,
  RotateCcw,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  ArrowLeft,
  Move,
  Trash2,
  PlusCircle,
  HelpCircle,
  Trophy,
  Zap,
} from 'lucide-react';

interface RoomLayoutEditorProps {
  roomName: string;
  initialDevices: Device[];
  onSave: (devices: Array<{ id: number; posX: number | null; posY: number | null }>) => Promise<void>;
  onBack?: () => void;
}

// Drop particle effect: small burst rings when device is dropped
function DropRipple({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 99,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 10 + i * 14,
            height: 10 + i * 14,
            border: '2px solid rgba(37,99,235,' + (0.7 - i * 0.2) + ')',
            borderRadius: '50%',
            animation: `dropRipple ${0.5 + i * 0.1}s ease-out forwards`,
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function RoomLayoutEditor({
  roomName,
  initialDevices,
  onSave,
  onBack,
}: RoomLayoutEditorProps) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [draggedDeviceId, setDraggedDeviceId] = useState<number | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  // Gamification state
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [lastDroppedId, setLastDroppedId] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const rippleCounter = useRef(0);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);

  const assignedDevices = devices.filter((d) => d.posX !== null && d.posY !== null);
  const unassignedDevices = devices.filter((d) => d.posX === null || d.posY === null);

  const progressPct = devices.length > 0 ? Math.round((assignedDevices.length / devices.length) * 100) : 0;
  const progressColor =
    progressPct === 100 ? '#16A34A' : progressPct >= 60 ? '#D97706' : '#2563EB';

  // Check for 100% completion
  useEffect(() => {
    if (progressPct === 100 && devices.length > 0) {
      setShowCelebration(true);
      const t = setTimeout(() => setShowCelebration(false), 4000);
      return () => clearTimeout(t);
    }
  }, [progressPct, devices.length]);

  const addRipple = useCallback((x: number, y: number) => {
    const id = ++rippleCounter.current;
    setRipples((prev) => [...prev, { id, x, y }]);
  }, []);

  const removeRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = () => setIsDragOverCanvas(false);

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    if (!canvasRef.current || draggedDeviceId === null) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.round(Math.min(95, Math.max(3, rawX)) * 10) / 10;
    const clampedY = Math.round(Math.min(95, Math.max(3, rawY)) * 10) / 10;

    setDevices((prev) =>
      prev.map((dev) =>
        dev.id === draggedDeviceId ? { ...dev, posX: clampedX, posY: clampedY } : dev
      )
    );
    setSelectedDeviceId(draggedDeviceId);
    setLastDroppedId(draggedDeviceId);
    addRipple(clampedX, clampedY);
    setTimeout(() => setLastDroppedId(null), 600);
    setDraggedDeviceId(null);
  };

  const handleUnassignDevice = (id: number) => {
    setDevices((prev) =>
      prev.map((dev) => (dev.id === id ? { ...dev, posX: null, posY: null } : dev))
    );
    if (selectedDeviceId === id) setSelectedDeviceId(null);
  };

  const handleReset = () => {
    setDevices(initialDevices);
    setSelectedDeviceId(null);
    setSaveMessage(null);
    setShowCelebration(false);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload = devices.map((d) => ({ id: d.id, posX: d.posX, posY: d.posY }));
      await onSave(payload);
      setSaveMessage({ text: '✅ บันทึกตำแหน่งผังห้องสำเร็จแล้ว!', type: 'success' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ text: `❌ เกิดข้อผิดพลาด: ${err.message || 'บันทึกไม่สำเร็จ'}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <>
      {/* CSS Keyframes injected into DOM once */}
      <style>{`
        @keyframes dropRipple {
          0%   { opacity: 1; transform: translate(-50%,-50%) scale(0.2); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(2.4); }
        }
        @keyframes dropBounce {
          0%   { transform: translate(-50%,-50%) scale(1.35); }
          40%  { transform: translate(-50%,-50%) scale(0.88); }
          70%  { transform: translate(-50%,-50%) scale(1.08); }
          100% { transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes celebrationSlide {
          0%   { opacity: 0; transform: translateY(-24px) scale(0.9); }
          15%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes progressShine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes paletteHover {
          0%   { box-shadow: 0 2px 6px rgba(37,99,235,0.15); }
          100% { box-shadow: 0 4px 14px rgba(37,99,235,0.35); }
        }
        .palette-item:hover {
          background: #EFF6FF !important;
          border-color: #93C5FD !important;
          transform: translateX(-2px);
          transition: all 0.15s ease;
        }
        .canvas-device:hover {
          transform: translate(-50%,-50%) scale(1.06);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
      `}</style>

      <div className="rleditor-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 80px)' }}>
        {/* Celebration Banner */}
        {showCelebration && (
          <div
            style={{
              position: 'fixed',
              top: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: '#16A34A',
              color: '#FFFFFF',
              padding: '0.9rem 2.5rem',
              borderRadius: '50px',
              fontWeight: 800,
              fontSize: '1.05rem',
              boxShadow: '0 8px 30px rgba(5,150,105,0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              animation: 'celebrationSlide 4s ease forwards',
              pointerEvents: 'none',
            }}
          >
            <Trophy size={22} />
            🎉 จัดวางครบทุกเครื่องแล้ว! กดบันทึกเพื่อบันทึกผัง
          </div>
        )}

        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontWeight: 600,
                  color: '#475569', background: '#F1F5F9', border: '1px solid #CBD5E1',
                  borderRadius: '8px', cursor: 'pointer',
                }}
              >
                <ArrowLeft size={16} /> ย้อนกลับ
              </button>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                🗺️ จัดตำแหน่งผังห้อง <span style={{ color: '#2563EB' }}>{roomName}</span>
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                ลากการ์ดอุปกรณ์มาวางบนผังห้อง และกดบันทึกพิกัดจริง
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {saveMessage && (
              <span
                style={{
                  fontSize: '0.82rem', fontWeight: 600,
                  color: saveMessage.type === 'success' ? '#166534' : '#991B1B',
                  background: saveMessage.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  padding: '0.4rem 0.75rem', borderRadius: '6px',
                  border: `1px solid ${saveMessage.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
                }}
              >
                {saveMessage.text}
              </span>
            )}
            <button
              onClick={handleReset}
              disabled={isSaving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 0.9rem', fontSize: '0.85rem', fontWeight: 600,
                color: '#475569', background: '#FFFFFF', border: '1px solid #CBD5E1',
                borderRadius: '8px', cursor: 'pointer',
              }}
            >
              <RotateCcw size={15} /> รีเซ็ต
            </button>
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 1.25rem', fontSize: '0.88rem', fontWeight: 700,
                color: '#FFFFFF',
                background: progressPct === 100 ? '#16A34A' : '#2563EB',
                border: 'none', borderRadius: '8px',
                cursor: isSaving ? 'wait' : 'pointer',
                boxShadow: progressPct === 100
                  ? '0 2px 12px rgba(5,150,105,0.4)'
                  : '0 2px 6px rgba(37,99,235,0.25)',
                opacity: isSaving ? 0.7 : 1,
                transition: 'background 0.4s ease, box-shadow 0.3s ease',
              }}
            >
              {progressPct === 100 ? <Trophy size={16} /> : <Save size={16} />}
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกผังห้อง'}
            </button>
          </div>
        </div>

        {/* ── Progress Bar ─────────────────────────────────────────── */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Zap size={15} color={progressColor} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
            จัดวางแล้ว {assignedDevices.length} / {devices.length} เครื่อง
          </span>
          {/* Bar track */}
          <div
            style={{
              flex: 1,
              height: 10,
              background: '#E2E8F0',
              borderRadius: '99px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                borderRadius: '99px',
                background:
                  progressPct === 100
                    ? '#16A34A'
                    : progressPct >= 60
                    ? '#D97706'
                    : '#2563EB',
                transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                backgroundSize: '200% 100%',
                animation: progressPct > 0 && progressPct < 100 ? 'progressShine 2s linear infinite' : undefined,
              }}
            />
          </div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: progressColor,
              minWidth: 40,
              textAlign: 'right',
              transition: 'color 0.4s ease',
            }}
          >
            {progressPct}%
          </span>
        </div>

        {/* Main Workspace */}
        <div style={{ display: 'flex', flex: 1, background: '#F8FAFC', minHeight: 480, overflow: 'hidden' }}>
          {/* Canvas Area */}
          <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <HelpCircle size={14} /> ลากอุปกรณ์ไปวางบนผังเพื่อกำหนดพิกัด
              </span>
            </div>

            {/* Drop Canvas */}
            <div
              ref={canvasRef}
              onDragOver={handleCanvasDragOver}
              onDragLeave={handleCanvasDragLeave}
              onDrop={handleCanvasDrop}
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 480,
                background: '#FFFFFF',
                borderRadius: '12px',
                border: isDragOverCanvas ? '2px dashed #2563EB' : '2px dashed #CBD5E1',
                boxShadow: isDragOverCanvas
                  ? 'inset 0 0 0 4px rgba(37,99,235,0.08), 0 4px 20px rgba(37,99,235,0.12)'
                  : 'inset 0 2px 8px rgba(0,0,0,0.03)',
                backgroundImage: isDragOverCanvas
                  ? 'radial-gradient(#93C5FD 1px, transparent 1px)'
                  : 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                overflow: 'hidden',
                userSelect: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-image 0.2s ease',
              }}
            >
              {/* Room front label */}
              <div
                style={{
                  position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                  background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD',
                  padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.75rem',
                  fontWeight: 700, pointerEvents: 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Monitor size={14} /> กระดาน / หน้าห้อง
              </div>

              {/* Drop-zone overlay hint */}
              {isDragOverCanvas && (
                <div
                  style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none', zIndex: 50,
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(37,99,235,0.08)', borderRadius: 12,
                      padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 700,
                      color: '#2563EB', border: '1.5px dashed #93C5FD',
                    }}
                  >
                    วางเครื่องตรงนี้ได้เลย ✨
                  </div>
                </div>
              )}

              {/* Ripple effects */}
              {ripples.map((r) => (
                <DropRipple key={r.id} x={r.x} y={r.y} onDone={() => removeRipple(r.id)} />
              ))}

              {/* Assigned devices on canvas */}
              {assignedDevices.map((dev) => {
                const isSelected = selectedDeviceId === dev.id;
                const isJustDropped = lastDroppedId === dev.id;
                const isBroken = dev.status === 'broken';
                const isRepair = dev.status === 'under_repair';
                const cardBg = isBroken ? '#FEF2F2' : isRepair ? '#FFFBEB' : '#F0FDF4';
                const cardBorder = isSelected ? '#2563EB' : isBroken ? '#EF4444' : isRepair ? '#F59E0B' : '#22C55E';
                const textColor = isBroken ? '#991B1B' : isRepair ? '#92400E' : '#166534';

                return (
                  <div
                    key={dev.id}
                    className="canvas-device"
                    draggable
                    onDragStart={(e) => {
                      setDraggedDeviceId(dev.id);
                      e.dataTransfer.setData('text/plain', dev.id.toString());
                    }}
                    onClick={() => setSelectedDeviceId(dev.id)}
                    style={{
                      position: 'absolute',
                      left: `${dev.posX}%`,
                      top: `${dev.posY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 72,
                      height: 52,
                      background: cardBg,
                      border: `2px solid ${cardBorder}`,
                      borderRadius: '8px',
                      padding: '4px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      boxShadow: isSelected
                        ? '0 0 0 3px rgba(37,99,235,0.3)'
                        : '0 2px 4px rgba(0,0,0,0.06)',
                      zIndex: isSelected ? 10 : 2,
                      animation: isJustDropped ? 'dropBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' : undefined,
                    }}
                    title={`${dev.name} (${dev.posX}%, ${dev.posY}%)`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', fontWeight: 700, color: textColor }}>
                      {isBroken ? (
                        <AlertTriangle size={12} color="#EF4444" />
                      ) : isRepair ? (
                        <Wrench size={12} color="#F59E0B" />
                      ) : (
                        <CheckCircle2 size={12} color="#22C55E" />
                      )}
                      {dev.name.replace(/^PC-/i, '')}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: 2, fontFamily: 'monospace' }}>
                      {dev.posX}%, {dev.posY}%
                    </div>
                  </div>
                );
              })}

              {assignedDevices.length === 0 && (
                <div
                  style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', color: '#94A3B8',
                  }}
                >
                  <Move size={36} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>ยังไม่มีอุปกรณ์วางบนผังห้องนี้</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    ลากอุปกรณ์จากรายการด้านขวามาวางบนผังห้องได้เลย
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div
            style={{
              width: 280,
              background: '#FFFFFF',
              borderLeft: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Palette header */}
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <PlusCircle size={16} color="#2563EB" /> รายการที่ยังไม่ได้วาง ({unassignedDevices.length})
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                ลากรายการออกไปยัง Canvas เพื่อวางตำแหน่ง
              </div>
            </div>

            {/* Unassigned list */}
            <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {unassignedDevices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Trophy size={28} color="#059669" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>จัดวางครบทุกเครื่องแล้ว!</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>กดบันทึกเพื่อบันทึกผัง</div>
                </div>
              ) : (
                unassignedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="palette-item"
                    draggable
                    onDragStart={(e) => {
                      setDraggedDeviceId(dev.id);
                      e.dataTransfer.setData('text/plain', dev.id.toString());
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '7px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'grab',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#334155',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Monitor size={14} color="#64748B" />
                      <span>{dev.name}</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>ลากเพื่อวาง</span>
                  </div>
                ))
              )}
            </div>

            {/* Selected device inspector */}
            {selectedDevice && (
              <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  📌 เครื่องที่เลือก: {selectedDevice.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 8 }}>
                  พิกัดปัจจุบัน: ({selectedDevice.posX}%, {selectedDevice.posY}%)
                </div>
                <button
                  onClick={() => handleUnassignDevice(selectedDevice.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '0.4rem', fontSize: '0.78rem', fontWeight: 600,
                    color: '#DC2626', background: '#FEE2E2', border: '1px solid #FCA5A5',
                    borderRadius: '6px', cursor: 'pointer',
                  }}
                >
                  <Trash2 size={13} /> ดึงออกจากผัง (ตั้งเป็น null)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
