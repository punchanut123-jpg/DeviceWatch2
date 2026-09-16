import { useState, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  label: string;
}

export default function CoordHelper() {
  const [points, setPoints] = useState<Point[]>([]);
  const [imgUrl, setImgUrl] = useState<string>('/rooms/26201.jpg');
  const [customUrl, setCustomUrl] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [copied, setCopied] = useState(false);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const label = `PC-${String(points.length + 1).padStart(2, '0')}`;
    setPoints((prev) => [...prev, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, label }]);
  };

  const removePoint = (idx: number) => {
    setPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const generateCode = () => {
    if (points.length === 0) return '// ยังไม่มีพิกัด';
    const lines = points
      .map(
        (p, i) =>
          `  { name: 'PC-${String(i + 1).padStart(2, '0')}', posX: ${p.x}, posY: ${p.y}, status: 'normal' },`
      )
      .join('\n');
    return `// Room 26201 — ${points.length} devices\ncreate: [\n${lines}\n]`;
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImgUrl(url);
      setPoints([]);
    }
  };

  return (
    <div className="page">
      <nav className="topnav">
        <div className="topnav-inner">
          <a href="/" className="btn btn-ghost btn-sm">← กลับ</a>
          <span className="topnav-logo">🗺️ Coord Helper</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Dev Tool</span>
        </div>
      </nav>

      <div style={{ padding: '1rem', maxWidth: 960, margin: '0 auto', flex: 1 }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            📍 ตัวช่วยวางพิกัดอุปกรณ์
          </h1>
          <p className="text-muted text-sm">
            คลิกบนรูปผังห้องเพื่อวางพิกัด → copy โค้ดไปใส่ใน seed.ts
          </p>
        </div>

        {/* Image controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="URL รูปผัง (หรืออัปโหลดด้านล่าง)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
          />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { if (customUrl) { setImgUrl(customUrl); setPoints([]); } }}
          >
            โหลดรูป
          </button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            📁 อัปโหลด
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            onClick={() => setPoints([])} disabled={points.length === 0}>
            🗑️ ล้างทั้งหมด
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {/* Image Area */}
          <div
            className="coord-img-wrapper"
            style={{ width: '100%' }}
            onClick={handleImageClick}
          >
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Room layout"
              style={{ width: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).alt = '❌ โหลดรูปไม่ได้ — ลองอัปโหลดรูปแทน';
              }}
            />
            {points.map((p, i) => (
              <div
                key={i}
                className="coord-point"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                title={`${p.label} (${p.x}, ${p.y})`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Points list + Generated code */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Points list */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 พิกัดที่วาง ({points.length})</span>
              </div>
              <div className="card-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {points.length === 0 ? (
                  <p className="text-muted text-sm">คลิกบนรูปเพื่อเพิ่มพิกัด</p>
                ) : (
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>เครื่อง</th>
                        <th style={{ padding: '0.25rem 0.5rem' }}>X</th>
                        <th style={{ padding: '0.25rem 0.5rem' }}>Y</th>
                        <th style={{ padding: '0.25rem 0.5rem' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {points.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'var(--font-en)', fontWeight: 600 }}>{p.label}</td>
                          <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center', color: 'var(--primary)' }}>{p.x}</td>
                          <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center', color: 'var(--gold)' }}>{p.y}</td>
                          <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); removePoint(i); }}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }}
                              title="ลบ"
                            >×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Generated Code */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📄 โค้ด seed.ts</span>
                <button className="btn btn-sm btn-primary" onClick={copyCode} disabled={points.length === 0}>
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <pre style={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  overflowX: 'auto',
                  maxHeight: 280,
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {generateCode()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
