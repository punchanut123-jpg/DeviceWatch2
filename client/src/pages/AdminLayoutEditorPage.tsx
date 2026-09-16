import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { RoomDetail } from '../types';
import RoomLayoutEditor from '../components/RoomLayoutEditor';

export default function AdminLayoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const roomId = Number(id);
  const { token, role } = useAuth();
  const navigate = useNavigate();

  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId || isNaN(roomId)) {
      setError('ID ห้องไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    api.buildings
      .roomDetail(roomId)
      .then((data) => {
        setRoomDetail(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roomId]);

  const handleSave = async (
    updatedDevices: Array<{ id: number; posX: number | null; posY: number | null }>
  ) => {
    if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนทำการบันทึก');
    if (role !== 'admin') throw new Error('เฉพาะ Admin เท่านั้นที่มีสิทธิ์แก้ไขผังห้อง');

    await api.admin.updateRoomLayout(token, roomId, updatedDevices);

    // Refresh room details from API to keep state synced
    const refreshed = await api.buildings.roomDetail(roomId);
    setRoomDetail(refreshed);
  };

  if (loading) {
    return (
      <div className="admin-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-center">
          <div className="spinner" />
          <span>กำลังโหลดข้อมูลห้อง...</span>
        </div>
      </div>
    );
  }

  if (error || !roomDetail) {
    return (
      <div className="admin-layout" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="alert alert-error">⚠️ {error || 'ไม่พบข้อมูลห้อง'}</div>
        <button
          onClick={() => navigate('/admin')}
          className="btn btn-ghost"
          style={{ marginTop: '1rem' }}
        >
          ← กลับหน้า Admin Dashboard
        </button>
      </div>
    );
  }

  return (
    <RoomLayoutEditor
      roomName={roomDetail.name}
      initialDevices={roomDetail.devices}
      onSave={handleSave}
      onBack={() => navigate('/admin')}
    />
  );
}
