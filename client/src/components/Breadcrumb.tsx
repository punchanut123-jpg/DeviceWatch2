import { Link, useNavigate } from 'react-router-dom';

interface Props {
  items: { label: string; path?: string | number }[];
}

export default function Breadcrumb({ items }: Props) {
  const navigate = useNavigate();

  return (
    <nav style={{ margin: '1rem 0', color: 'var(--color-text-muted)' }}>
      {items.map((item, index) => (
        <span key={index}>
          {item.path !== undefined ? (
            typeof item.path === 'number' ? (
              <span 
                onClick={() => navigate(item.path as number)} 
                style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {item.label}
              </span>
            ) : (
              <Link to={item.path} style={{ color: 'var(--color-primary)' }}>{item.label}</Link>
            )
          ) : (
            item.label
          )}
          {index < items.length - 1 && <span style={{ margin: '0 8px' }}>&gt;</span>}
        </span>
      ))}
    </nav>
  );
}
