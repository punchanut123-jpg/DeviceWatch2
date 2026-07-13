import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BuildingCard from '../components/BuildingCard';
import Header from '../components/Header';

import './Dashboard.css';

interface Building {
  id: number;
  name: string;
  brokenCount: number;
  totalCount: number;
}

const Dashboard: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/buildings')
      .then(res => res.json())
      .then(data => setBuildings(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching buildings:', err));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main>
        <div className="dashboard-container user-view">
          <div className="building-section">
            <div className="building-list">
              {buildings.length > 0 ? (
                buildings.map(b => (
                  <BuildingCard
                    key={b.id}
                    name={b.name}
                    brokenCount={b.brokenCount}
                    totalCount={b.totalCount}
                    onClick={() => navigate(`/buildings/${b.id}`)}
                  />
                ))
              ) : (
                <p style={{ color: 'var(--color-text-muted, #888)', padding: '1rem 0' }}>
                  ไม่พบข้อมูลอาคาร...
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
