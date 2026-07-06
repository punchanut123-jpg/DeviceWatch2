import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      {/* ส่วนโลโก้และชื่อแบรนด์ (คลิกกลับหน้าแรก) */}
      <Link to="/" className="header__brand">
        <div className="header__logo-wrapper">
          <img src="/logo.jpg" alt="Logo" className="header__logo" />
        </div>
        <div className="header__title-group">
          <span className="header__title">DeviceWatch</span>
          <span className="header__subtitle">คณะเทคโนโลยีสารสนเทศ</span>
        </div>
      </Link>

      {/* ส่วนเมนูด้านขวา */}
      <Link to="/admin/tickets" className="header__admin-link">
        <span>⚙️</span> จัดการระบบ
      </Link>
    </header>
  );
}
