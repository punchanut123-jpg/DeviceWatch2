import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: '#EBF4FF',
        backgroundImage: 'radial-gradient(circle, rgba(30,111,217,0.12) 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          border: '1px solid rgba(30,111,217,0.15)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 16px 60px rgba(30,111,217,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#1a2f5a',
            padding: '2rem 2rem 1.75rem',
            textAlign: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="IT Faculty Logo"
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem', background: 'white', padding: 2 }}
          />
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.2rem', color: 'white' }}>
            Admin Login
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)' }}>
            ระบบแจ้งซ่อมอุปกรณ์ IT
          </p>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.15rem' }}>
            คณะเทคโนโลยีสารสนเทศ มรภ.เพชรบุรี
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              🚫 {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">👤 ชื่อผู้ใช้</label>
            <input
              id="admin-username"
              type="text"
              className="form-input"
              placeholder="กรอกชื่อผู้ใช้"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">🔑 รหัสผ่าน</label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0.25rem',
                  lineHeight: 1,
                }}
                aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="admin-login-btn"
            type="submit"
            className="btn btn-gold btn-full"
            style={{ marginTop: '0.5rem', fontSize: '1rem', minHeight: '52px' }}
            disabled={loading}
          >
            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '🔐 เข้าสู่ระบบ'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a
              href="/"
              style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}
            >
              ← กลับหน้าแจ้งซ่อม
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
