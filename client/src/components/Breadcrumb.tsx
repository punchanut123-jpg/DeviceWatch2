import React from 'react';
import { Link } from 'react-router-dom';
import { useBreadcrumb } from '../hooks/useBreadcrumb';

interface Props {
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  items?: { label: string; path?: string }[];
}

const Breadcrumb: React.FC<Props> = ({ buildingId, floorId, roomId, items }) => {
  const { buildingName, floorName, roomName } = useBreadcrumb(buildingId, floorId, roomId);

  if (items) {
    return (
      <nav style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#64748b' }}>
        {items.map((item, index) => (
          <span key={index}>
            {item.path ? (
              <Link to={item.path} style={{ color: 'var(--color-primary, #1A4FA0)', textDecoration: 'none' }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: index === items.length - 1 ? 'var(--color-text, #334155)' : '#64748b', fontWeight: index === items.length - 1 ? 'bold' : 'normal' }}>
                {item.label}
              </span>
            )}
            {index < items.length - 1 && <span style={{ margin: '0 8px' }}>/</span>}
          </span>
        ))}
      </nav>
    );
  }

  return (
    <nav style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#64748b' }}>
      <Link to="/" style={{ color: 'var(--color-primary, #1A4FA0)', textDecoration: 'none' }}>🏠 หน้าแรก</Link>
      
      {buildingId && (
        <>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link to={`/buildings/${buildingId}`} style={{ color: 'var(--color-primary, #1A4FA0)', textDecoration: 'none' }}>
            {buildingName}
          </Link>
        </>
      )}

      {floorId && (
        <>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link to={`/buildings/${buildingId}/floors/${floorId}`} style={{ color: 'var(--color-primary, #1A4FA0)', textDecoration: 'none' }}>
            {floorName}
          </Link>
        </>
      )}

      {roomId && (
        <>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: 'var(--color-text, #334155)', fontWeight: 'bold' }}>{roomName}</span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumb;
