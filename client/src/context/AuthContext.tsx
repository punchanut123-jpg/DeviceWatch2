import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string | null;
  student: any | null;
  teacher: any | null;
  login: (username: string, password: string) => Promise<void>;
  loginStudent: (studentId: string, password: string) => Promise<void>;
  loginTeacher: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // JWT stored in memory only (NOT localStorage) — prevents XSS
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [teacher, setTeacher] = useState<any | null>(null);

  const login = useCallback(async (user: string, pass: string) => {
    const data = await api.auth.login(user, pass);
    setToken(data.token);
    setUsername(data.username);
    setRole(data.role);
  }, []);

  const loginStudent = useCallback(async (studentId: string, pass: string) => {
    const data = await api.student.login(studentId, pass);
    setToken(data.token);
    setStudent(data.student);
    setRole('student');
  }, []);

  const loginTeacher = useCallback(async (user: string, pass: string) => {
    const data = await api.auth.login(user, pass);
    setToken(data.token);
    setTeacher({ name: data.username });
    setRole('teacher');
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
    setRole(null);
    setStudent(null);
    setTeacher(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        role,
        student,
        teacher,
        login,
        loginStudent,
        loginTeacher,
        logout,
        isAuthenticated: !!token || !!teacher,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
