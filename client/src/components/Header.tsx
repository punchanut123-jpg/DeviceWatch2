export default function Header() {
  return (
    <header style={{ 
      backgroundColor: 'var(--color-primary)', 
      color: 'white', 
      padding: '1rem 2rem', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem' 
    }}>
      <img src="/logo.jpg" alt="Logo" style={{ height: '40px', width: '40px', background: 'white', borderRadius: '50%' }} />
      <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>DeviceWatch - ระบบแจ้งซ่อมอุปกรณ์ คณะเทคโนโลยีสารสนเทศ</span>
    </header>
  );
}
