import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Floors from './pages/Floors';
import Rooms from './pages/Rooms';
import Devices from './pages/Devices';
import AdminDashboard from './pages/AdminDashboard';
import AdminHome from './pages/AdminHome';
import CoordHelper from './pages/CoordHelper';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/buildings/:buildingId" element={<Floors />} />
        <Route path="/buildings/:buildingId/floors/:floorId" element={<Rooms />} />
        <Route path="/buildings/:buildingId/floors/:floorId/rooms/:roomId" element={<Devices />} />
        <Route path="/coord-helper" element={<CoordHelper />} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<Login />} />

        {/* Protected Admin Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/tickets" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
