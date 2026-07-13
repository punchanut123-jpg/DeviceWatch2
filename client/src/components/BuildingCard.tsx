
interface Props {
  name: string;
  brokenCount: number;
  totalCount: number;
  onClick: () => void;
}

export default function BuildingCard({ name, brokenCount, totalCount, onClick }: Props) {
  const isBroken = brokenCount > 0;

  return (
    <div
      className="building-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        maxWidth: '520px',
        flex: '1 1 420px',
        '--status-color': isBroken ? '#ef4444' : '#10b981',
        '--status-color-light': isBroken ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
      }}
    >
      {/* รูปอาคาร */}
      <div style={{ width: '100%', height: '280px', overflow: 'hidden', position: 'relative' }}>
        <img
          src="/building.png"
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e) => {
            // Fallback ถ้ารูปยังไม่มี
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.parentElement as HTMLElement).style.background =
              'linear-gradient(135deg, #1A4FA0 0%, #2563eb 100%)';
          }}
        />
        {/* Status Badge บนรูป */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
            backgroundColor: isBroken
              ? 'rgba(239,68,68,0.85)'
              : 'rgba(16,185,129,0.85)',
            color: '#fff',
          }}
        >
          {isBroken ? `🔴 เสีย ${brokenCount}` : '✅ ปกติ'}
        </div>
      </div>

      {/* ข้อมูลอาคาร */}
      <div style={{ padding: '1.5rem 1.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* ชื่ออาคาร */}
        <h3 style={{ margin: 0, fontSize: '1.45rem', color: '#1A4FA0', fontWeight: 700 }}>
          {name}
        </h3>

        {/* จำนวนอุปกรณ์ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: '1rem' }}>
            อุปกรณ์ทั้งหมด: <strong style={{ color: '#374151' }}>{totalCount}</strong> เครื่อง
          </span>
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: isBroken ? '#ef4444' : '#10b981',
            }}
          >
            {isBroken ? `เสีย ${brokenCount} เครื่อง` : 'ปกติทั้งหมด'}
          </span>
        </div>
      </div>
    </div>
  );
}
