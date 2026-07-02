interface Props {
  name: string;
  brokenCount: number;
  onClick: () => void;
}

export default function BuildingCard({ name, brokenCount, onClick }: Props) {
  const isBroken = brokenCount > 0;

  return (
    <div
      className="building-card"
      onClick={onClick}
      style={
        {
          '--status-color': isBroken ? '#ef4444' : '#10b981',
          '--status-color-light': isBroken ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
        } as React.CSSProperties
      }
    >
      <h3 className="building-card-title">{name}</h3>
      <div className="building-card-content">
        <span className={`status-badge ${isBroken ? 'status-badge-broken' : 'status-badge-ok'}`}>
          {isBroken ? '⚠️ อุปกรณ์ชำรุด' : '✅ ปกติ'}
        </span>
        <span className="broken-counter">
          เครื่องเสีย:{' '}
          <strong className={`broken-counter-number ${isBroken ? 'warning' : ''}`}>
            {brokenCount} เครื่อง
          </strong>
        </span>
      </div>
    </div>
  );
}
