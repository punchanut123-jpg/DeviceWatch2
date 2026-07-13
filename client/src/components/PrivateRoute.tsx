import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute: React.FC = () => {
  const { token } = useAuth(); // ดึง token จาก memory (AuthContext) แทน localStorage

  // ถ้ามี token ให้ผ่านไปได้ (Outlet) ถ้าไม่มีให้เด้งไปหน้า Login
  return token ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default PrivateRoute;

