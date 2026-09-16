import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import RoomView from './pages/RoomView';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminTickets from './pages/AdminTickets';
import AdminLayoutEditorPage from './pages/AdminLayoutEditorPage';
import CoordHelper from './pages/CoordHelper';
import MyReports from './pages/MyReports';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import TeacherLogin from './pages/TeacherLogin';
import TeacherDashboard from './pages/TeacherDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  return isAuthenticated && role === 'admin' ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

function StudentProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuth();
  return token && role === 'student' ? <>{children}</> : <Navigate to="/student/login" replace />;
}

function TeacherProtectedRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  return role === 'teacher' ? <>{children}</> : <Navigate to="/teacher/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Student Auth Routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/register" element={<StudentRegister />} />

          {/* Student Protected Routes */}
          <Route path="/" element={<StudentProtectedRoute><Dashboard /></StudentProtectedRoute>} />
          <Route path="/room/:roomId" element={<StudentProtectedRoute><RoomView /></StudentProtectedRoute>} />
          <Route path="/my-reports" element={<StudentProtectedRoute><MyReports /></StudentProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tickets"
            element={
              <ProtectedRoute>
                <AdminTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rooms/:id/editor"
            element={
              <ProtectedRoute>
                <AdminLayoutEditorPage />
              </ProtectedRoute>
            }
          />

          {/* Teacher routes */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route
            path="/teacher/dashboard"
            element={
              <TeacherProtectedRoute>
                <TeacherDashboard />
              </TeacherProtectedRoute>
            }
          />

          {/* Developer tool */}
          <Route path="/coord-helper" element={<CoordHelper />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
