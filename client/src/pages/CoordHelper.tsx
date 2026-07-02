import { useRef, useState, useCallback } from 'react';

interface Pin {
  id: number;
  label: string;
  x: number;
  y: number;
}

const ROOMS = ['26201', '26202', '26203', '26204', '26205', '26206'];

export default function CoordHelper() {
  const imgRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [counter, setCounter] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState('26201');
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [labelPrefix, setLabelPrefix] = useState('');

  const getRelativePos = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imgRef.current!.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));
    return { x, y };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = getRelativePos(e);
    const deviceNum = String(counter).padStart(2, '0');
    const label = labelPrefix
      ? `${labelPrefix}-${deviceNum}`
      : `${selectedRoom}-${deviceNum}`;

    setPins(prev => [...prev, { id: Date.now(), label, x, y }]);
    setCounter(c => c + 1);
  }, [getRelativePos, counter, selectedRoom, labelPrefix]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = getRelativePos(e);
    setCursor({ x, y });
  }, [getRelativePos]);

  const removePin = (id: number) => {
    setPins(prev => prev.filter(p => p.id !== id));
  };

  const clearAll = () => {
    setPins([]);
    setCounter(1);
  };

  const undoLast = () => {
    setPins(prev => {
      if (prev.length === 0) return prev;
      setCounter(c => c - 1);
      return prev.slice(0, -1);
    });
  };

  const generateSeedCode = () => {
    if (pins.length === 0) return '// ยังไม่มีพิกัด — คลิกบนรูปเพื่อวางจุด';
    const lines = pins.map(p =>
      `  { deviceCode: "${p.label}", posX: ${p.x}, posY: ${p.y}, status: "normal", roomId: room.id, deviceName: "คอมพิวเตอร์ ${p.label.split('-').pop()}" },`
    );
    return `const devices = [\n${lines.join('\n')}\n];\nawait prisma.device.createMany({ data: devices });`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSeedCode()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const exportJSON = () => {
    const data = pins.map(p => ({ deviceCode: p.label, posX: p.x, posY: p.y }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coords-${selectedRoom}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const seedCode = generateSeedCode();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      color: '#e2e8f0',
      padding: '0',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
      }}>
        <span style={{ fontSize: '22px' }}>📍</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em' }}>
            Coordinate Picker Tool
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            คลิกบนรูปผังห้อง → รับค่า posX / posY (%) → Copy ไปใส่ใน seed.ts
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href="/"
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            ← กลับหน้าหลัก
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0', height: 'calc(100vh - 62px)' }}>
        {/* LEFT: Floor Plan */}
        <div style={{ flex: 1, padding: '16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Controls */}
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
            border: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="room-select" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>ห้อง:</label>
              <select
                id="room-select"
                title="เลือกห้อง"
                value={selectedRoom}
                onChange={e => { setSelectedRoom(e.target.value); clearAll(); }}
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="prefix-input" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Prefix (ไม่บังคับ):</label>
              <input
                id="prefix-input"
                value={labelPrefix}
                onChange={e => setLabelPrefix(e.target.value)}
                placeholder={`${selectedRoom}`}
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '13px',
                  outline: 'none',
                  width: '110px',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="counter-input" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>เริ่มที่ #:</label>
              <input
                id="counter-input"
                type="number"
                min="1"
                value={counter}
                onChange={e => setCounter(Number(e.target.value))}
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '13px',
                  outline: 'none',
                  width: '70px',
                }}
              />
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                onClick={undoLast}
                disabled={pins.length === 0}
                style={{
                  background: pins.length > 0 ? '#374151' : '#1f2937',
                  color: pins.length > 0 ? '#e2e8f0' : '#6b7280',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: pins.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                ↩ Undo
              </button>
              <button
                onClick={clearAll}
                disabled={pins.length === 0}
                style={{
                  background: pins.length > 0 ? '#7f1d1d' : '#1f2937',
                  color: pins.length > 0 ? '#fca5a5' : '#6b7280',
                  border: '1px solid #991b1b',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: pins.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                🗑 Clear All
              </button>
            </div>
          </div>

          {/* Image container */}
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {/* Cursor display */}
            {cursor && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.8)',
                color: '#a5f3fc',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: '"Fira Code", monospace',
                fontWeight: 700,
                zIndex: 30,
                pointerEvents: 'none',
                border: '1px solid rgba(165,243,252,0.3)',
              }}>
                X: {cursor.x}% &nbsp; Y: {cursor.y}%
              </div>
            )}

            <div
              ref={imgRef}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setCursor(null)}
              style={{
                width: '100%',
                aspectRatio: '4/3',
                backgroundImage: 'url(/floor-plan.jpg)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: '#f8fafc',
                cursor: 'crosshair',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              {pins.map((pin, idx) => (
                <div
                  key={pin.id}
                  onMouseEnter={() => setHoveredPin(pin.id)}
                  onMouseLeave={() => setHoveredPin(null)}
                  onClick={(e) => { e.stopPropagation(); removePin(pin.id); }}
                  style={{
                    position: 'absolute',
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: hoveredPin === pin.id ? '18px' : '12px',
                    height: hoveredPin === pin.id ? '18px' : '12px',
                    borderRadius: '50%',
                    backgroundColor: hoveredPin === pin.id ? '#ef4444' : '#6366f1',
                    border: '2px solid white',
                    boxShadow: `0 0 0 2px ${hoveredPin === pin.id ? '#ef444488' : '#6366f188'}, 0 2px 8px rgba(0,0,0,0.4)`,
                    cursor: 'pointer',
                    zIndex: 20,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={`คลิกเพื่อลบ: ${pin.label} (${pin.x}%, ${pin.y}%)`}
                >
                  {/* Number label */}
                  <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 4px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b',
                    color: '#e2e8f0',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    border: '1px solid #475569',
                  }}>
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Instruction overlay when empty */}
            {pins.length === 0 && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(99,102,241,0.9)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
              }}>
                👆 คลิกบนตำแหน่งโต๊ะในรูปเพื่อวางพิกัด
              </div>
            )}
          </div>

          {/* Hint */}
          <div style={{
            background: '#172554',
            border: '1px solid #1e40af',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#93c5fd',
            lineHeight: 1.6,
          }}>
            <strong>💡 วิธีใช้:</strong> คลิกที่โต๊ะในรูปตามลำดับ → จุดสีม่วงจะปรากฏ → คลิกจุดอีกครั้งเพื่อลบ → Copy โค้ดจากแผงขวา
          </div>
        </div>

        {/* RIGHT: Pin list + Code */}
        <div style={{
          width: '380px',
          flexShrink: 0,
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Pin count header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>
              📌 จุดที่วาง{' '}
              <span style={{
                background: '#6366f1',
                color: 'white',
                borderRadius: '20px',
                padding: '1px 8px',
                fontSize: '11px',
                marginLeft: '4px',
              }}>
                {pins.length}
              </span>
            </div>
            <button
              onClick={exportJSON}
              disabled={pins.length === 0}
              style={{
                background: pins.length > 0 ? '#164e63' : '#1f2937',
                color: pins.length > 0 ? '#67e8f9' : '#6b7280',
                border: '1px solid #0e7490',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: pins.length > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              ⬇ Export JSON
            </button>
          </div>

          {/* Pin list */}
          <div style={{ flex: '0 0 200px', overflowY: 'auto', padding: '8px' }}>
            {pins.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                ยังไม่มีจุด
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>รหัส</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>posX</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>posY</th>
                    <th style={{ padding: '4px 6px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pins.map((pin, idx) => (
                    <tr
                      key={pin.id}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        background: hoveredPin === pin.id ? '#1e293b' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={() => setHoveredPin(pin.id)}
                      onMouseLeave={() => setHoveredPin(null)}
                    >
                      <td style={{ padding: '5px 6px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 6px', color: '#a5b4fc', fontFamily: 'monospace', fontWeight: 600 }}>{pin.label}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: '#86efac', fontFamily: 'monospace' }}>{pin.x}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: '#fca5a5', fontFamily: 'monospace' }}>{pin.y}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                        <button
                          onClick={() => removePin(pin.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '0 4px',
                            opacity: 0.6,
                            lineHeight: 1,
                          }}
                          title="ลบจุดนี้"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Generated code section */}
          <div style={{
            flex: 1,
            borderTop: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
            }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>
                📋 โค้ด seed.ts
              </div>
              <button
                onClick={handleCopy}
                disabled={pins.length === 0}
                style={{
                  background: copied ? '#14532d' : pins.length > 0 ? '#6366f1' : '#1f2937',
                  color: copied ? '#86efac' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  cursor: pins.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  minWidth: '90px',
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <pre style={{
              flex: 1,
              overflow: 'auto',
              margin: 0,
              padding: '12px 14px',
              fontSize: '11px',
              lineHeight: 1.65,
              color: '#cbd5e1',
              fontFamily: '"Fira Code", "Cascadia Code", monospace',
              background: '#070d1a',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {seedCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
