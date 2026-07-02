import { useParams, useNavigate } from 'react-router-dom';

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Building Detail</h1>
        <p className="dashboard-subtitle">ข้อมูลชั้นและห้องของตึก ID: {id} (กำลังพัฒนา...)</p>
      </header>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}
