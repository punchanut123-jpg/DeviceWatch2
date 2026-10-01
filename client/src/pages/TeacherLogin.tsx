import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function TeacherLogin() {
  const navigate = useNavigate();
  const { loginTeacher } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      await loginTeacher(username.trim(), password);
      navigate('/teacher/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page auth-page-teacher">
      <section className="auth-brand-panel">
        <Link to="/" className="auth-brand" aria-label="กลับหน้าหลัก DeviceWatch">
          <img src="/logo.png" alt="" className="auth-brand-logo" />
          <span>DeviceWatch</span>
        </Link>
        <div className="auth-brand-copy">
          <span className="auth-kicker">Faculty Overview</span>
          <h1>รู้สถานะห้องเรียน<br />ก่อนเริ่มสอน</h1>
          <p>ดูความพร้อมของอุปกรณ์และรายการที่ต้องดูแลได้อย่างรวดเร็ว</p>
        </div>
        <p className="auth-brand-footer">คณะเทคโนโลยีสารสนเทศ<br />มหาวิทยาลัยราชภัฏเพชรบุรี</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-role">อาจารย์ผู้สอน</div>
          <h2>เข้าสู่ระบบ</h2>
          <p className="auth-intro">ตรวจสอบภาพรวมอุปกรณ์ในความดูแลของคุณ</p>

          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error auth-alert">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="teacher-username">ชื่อผู้ใช้</label>
              <input
                id="teacher-username"
                type="text"
                className="form-input"
                placeholder="กรอกชื่อผู้ใช้"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="teacher-password">รหัสผ่าน</label>
              <div className="auth-password-field">
                <input
                  id="teacher-password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full auth-submit"
              disabled={loading}
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <Link to="/" className="auth-back-link">
            กลับหน้าหลัก
          </Link>
        </div>
      </section>
    </main>
  );
}
