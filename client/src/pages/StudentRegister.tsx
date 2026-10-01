import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';

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

export default function StudentRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.student.register({ name, studentId, password });
      setSuccess(true);
      setTimeout(() => navigate('/student/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'การลงทะเบียนล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page auth-page-student">
      <section className="auth-brand-panel">
        <Link to="/" className="auth-brand" aria-label="กลับหน้าหลัก DeviceWatch">
          <img src="/logo.png" alt="" className="auth-brand-logo" />
          <span>DeviceWatch</span>
        </Link>
        <div className="auth-brand-copy">
          <span className="auth-kicker">Student Service</span>
          <h1>เริ่มต้นแจ้งปัญหา<br />ได้ด้วยบัญชีเดียว</h1>
          <p>ลงทะเบียนเพื่อแจ้งซ่อมอุปกรณ์ และติดตามความคืบหน้าของรายการคุณ</p>
        </div>
        <p className="auth-brand-footer">คณะเทคโนโลยีสารสนเทศ<br />มหาวิทยาลัยราชภัฏเพชรบุรี</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-role">สำหรับนักศึกษา</div>
          <h2>สร้างบัญชีใหม่</h2>
          <p className="auth-intro">กรอกข้อมูลของคุณเพื่อเริ่มใช้งาน DeviceWatch</p>

          {error && <div className="alert alert-error auth-alert">{error}</div>}
          {success ? (
            <div className="alert alert-success auth-alert">
              ลงทะเบียนสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="student-name">ชื่อ - นามสกุล</label>
                <input
                  id="student-name"
                  type="text"
                  className="form-input"
                  placeholder="เช่น สมชาย ใจดี"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="student-register-id">รหัสนักศึกษา</label>
                <input
                  id="student-register-id"
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="เช่น 64000000"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="student-register-password">รหัสผ่าน</label>
                <div className="auth-password-field">
                  <input
                    id="student-register-password"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="ตั้งรหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    required
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
                {loading ? 'กำลังลงทะเบียน...' : 'สร้างบัญชี'}
              </button>
            </form>
          )}

          {!success && (
            <p className="auth-switch">
              มีบัญชีอยู่แล้ว? <Link to="/student/login">เข้าสู่ระบบ</Link>
            </p>
          )}
          <Link to="/" className="auth-back-link">
            กลับหน้าหลัก
          </Link>
        </div>
      </section>
    </main>
  );
}
