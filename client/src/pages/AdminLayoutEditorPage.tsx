import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type {
  ApplyLayoutResult,
  LayoutSavePayload,
  LayoutSaveResult,
  RoomDetail,
} from '../types';
import RoomLayoutEditor from '../components/RoomLayoutEditor';

export default function AdminLayoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const roomId = Number(id);
  const { token, role } = useAuth();
  const navigate = useNavigate();

  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [allRooms, setAllRooms] = useState<Array<{ id: number; name: string; floor: { number: number } }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.buildings.allRooms().then(setAllRooms).catch(console.error);
  }, []);

  useEffect(() => {
    if (!roomId || isNaN(roomId)) {
      setError('ID ห้องไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    setLoading(true);
    api.buildings
      .roomDetail(roomId)
      .then((data) => {
        setRoomDetail(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roomId]);

  const refresh = useCallback(async () => {
    const refreshed = await api.buildings.roomDetail(roomId);
    setRoomDetail(refreshed);
  }, [roomId]);

  const handleSave = useCallback(
    async (payload: LayoutSavePayload): Promise<LayoutSaveResult> => {
      if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนทำการบันทึก');
      if (role !== 'admin') throw new Error('เฉพาะ Admin เท่านั้นที่มีสิทธิ์แก้ไขผังห้อง');

      const res = await api.admin.updateRoomLayout(token, roomId, payload);
      await refresh();
      return res;
    },
    [token, role, roomId, refresh]
  );

  const handleApplyLayout = useCallback(
    async (sourceRoomId: number, confirm: boolean): Promise<ApplyLayoutResult> => {
      if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนทำการบันทึก');
      if (role !== 'admin') throw new Error('เฉพาะ Admin เท่านั้นที่มีสิทธิ์แก้ไขผังห้อง');

      const res = await api.admin.applyRoomLayout(token, roomId, sourceRoomId, confirm);
      if (confirm) await refresh();
      return res;
    },
    [token, role, roomId, refresh]
  );

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
          onClick={() => navigate('/admin/rooms')}
          className="btn btn-ghost"
          style={{ marginTop: '1rem' }}
        >
          ← กลับหน้าเลือกห้องปฏิบัติการ
        </button>
      </div>
    );
  }

  return (
    <RoomLayoutEditor
      roomId={roomId}
      roomName={roomDetail.name}
      initialDesks={roomDetail.desks}
      initialDevices={roomDetail.devices}
      allRooms={allRooms}
      onSelectRoom={(newRoomId) => navigate(`/admin/rooms/${newRoomId}/editor`)}
      onSave={handleSave}
      onApplyLayout={handleApplyLayout}
      onBack={() => navigate('/admin/rooms')}
    />
  );
}
