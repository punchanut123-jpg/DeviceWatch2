// client/src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // พฤติกรรมที่ต้องคงไว้จากระบบ Auth เดิม
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    try {
      // ใช้ relative URL /api/admin/login เพื่อผ่าน proxy ของ Vite และชี้ไปที่ path ล็อกอินของแอดมินที่แท้จริง
      const res = await axios.post('/api/admin/login', {
        username,
        password,
      });
      login(res.data.token); // บันทึก Token ลง Context (AuthContext) เพื่อให้ระบบจดจำสิทธิ์ใน Memory
      navigate('/admin/tickets'); // นำทางไปยังแดชบอร์ดแอดมิน
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'เข้าสู่ระบบไม่สำเร็จ ตรวจสอบ Username/Password';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Header showAdminLink={false} />
      <div className="login-content-wrapper">
        <div className="login-card">
          
          {/* โลโก้คณะ IT */}
          <img src="/logo.jpg" alt="IT Faculty Logo" className="login-logo" />
          
          {/* หัวข้อ */}
          <h1 className="login-title">เข้าสู่ระบบ</h1>
          <p className="login-subtitle">
            <span className="brand-primary">DeviceWatch</span> — ระบบแจ้งซ่อมอุปกรณ์
          </p>

          {/* ฟอร์มเข้าสู่ระบบ */}
          <form className="login-form" onSubmit={handleLogin}>
            
            {/* ช่อง Username */}
            <div className="input-group">
              <span className="input-icon">
                {/* ไอคอน User (SVG) */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}>
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
              </span>
              <input 
                type="text" 
                className="login-input" 
                placeholder="Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* ช่อง Password */}
            <div className="input-group">
              <span className="input-icon">
                {/* ไอคอน Lock (SVG) */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}>
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                </svg>
              </span>
              <input 
                type="password" 
                className="login-input" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* ปุ่ม Sign In */}
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? 'กำลังตรวจสอบ...' : 'Sign In'}
              {!isLoading && <span className="btn-arrow">→</span>}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
