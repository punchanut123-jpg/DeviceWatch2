import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function StudentRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.student.register({ name, studentId, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/student/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'การลงทะเบียนล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="login-title">📝 ลงทะเบียนนักศึกษา</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          สร้างบัญชีใหม่สำหรับนักศึกษาเพื่อเข้าใช้งาน DeviceWatch
        </p>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem', background: '#DCFCE7', color: '#166534', border: 'none' }}>✅ ลงทะเบียนสำเร็จ! กำลังพาไปหน้า Login...</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">ชื่อ - นามสกุล</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น สมชาย ใจดี"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">รหัสนักศึกษา</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น 64000000"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">รหัสผ่าน</label>
              <input
                type="password"
                className="form-input"
                placeholder="ตั้งรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>มีบัญชีอยู่แล้วใช่ไหม? </span>
              <Link to="/student/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                เข้าสู่ระบบ
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
