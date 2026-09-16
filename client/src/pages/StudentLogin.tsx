import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StudentLogin() {
  const navigate = useNavigate();
  const { loginStudent } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginStudent(studentId, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="IT Faculty Logo" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem', background: 'white', padding: '2px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          <h1 className="login-title" style={{ marginTop: '0.5rem' }}>🎓 Student Login</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            เข้าสู่ระบบสำหรับนักศึกษา เพื่อแจ้งซ่อมและติดตามสถานะ
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
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
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>ยังไม่มีบัญชีใช่ไหม? </span>
            <Link to="/student/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              ลงทะเบียนที่นี่
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
