import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Floors from './pages/Floors';
import Rooms from './pages/Rooms';
import Devices from './pages/Devices';
import AdminDashboard from './pages/AdminDashboard';
import CoordHelper from './pages/CoordHelper';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/buildings/:buildingId" element={<Floors />} />
        <Route path="/buildings/:buildingId/floors/:floorId" element={<Rooms />} />
        <Route path="/buildings/:buildingId/floors/:floorId/rooms/:roomId" element={<Devices />} />
        <Route path="/admin/tickets" element={<AdminDashboard />} />
        <Route path="/coord-helper" element={<CoordHelper />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


