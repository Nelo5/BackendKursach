import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AvailableTests from './components/Student/AvailableTests';
import TestTaking from './components/Student/TestTaking';
import MyAttempts from './components/Student/MyAttempts';
import AttemptDetail from './components/Student/AttemptDetail';
import MyTests from './components/Teacher/MyTests';
import CreateTest from './components/Teacher/CreateTest';
import EditTest from './components/Teacher/EditTest';
import TestResults from './components/Teacher/TestResults';
import AttemptDetailTeacher from './components/Teacher/AttemptDetailTeacher';
import UsersManagement from './components/Admin/UsersManagement';
import BlockedTests from './components/Admin/BlockedTests';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" />;
  }
  
  return children;
};

const HomePage = () => {
  const { user, isStudent, isTeacher, isAdmin } = useAuth();
  
  if (isStudent) {
    return <Navigate to="/tests" />;
  } else if (isTeacher) {
    return <Navigate to="/teacher/tests" />;
  } else if (isAdmin) {
    return <Navigate to="/admin/users" />;
  }
  
  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>Добро пожаловать в систему онлайн тестирования!</h1>
        <p style={{ marginTop: '20px' }}>Выберите раздел в меню навигации</p>
      </div>
    </div>
  );
};

function AppContent() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        
        {/* Student routes */}
        <Route path="/tests" element={
          <ProtectedRoute allowedRoles={['student']}>
            <AvailableTests />
          </ProtectedRoute>
        } />
        <Route path="/test/:testId/take" element={
          <ProtectedRoute allowedRoles={['student']}>
            <TestTaking />
          </ProtectedRoute>
        } />
        <Route path="/my-attempts" element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyAttempts />
          </ProtectedRoute>
        } />
        <Route path="/attempt/:attemptId" element={
          <ProtectedRoute allowedRoles={['student']}>
            <AttemptDetail />
          </ProtectedRoute>
        } />
        
        {/* Teacher routes */}
        <Route path="/teacher/tests" element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <MyTests />
          </ProtectedRoute>
        } />
        <Route path="/teacher/create-test" element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <CreateTest />
          </ProtectedRoute>
        } />
        <Route path="/teacher/edit-test/:testId" element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <EditTest />
          </ProtectedRoute>
        } />
        <Route path="/teacher/test/:testId/results" element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TestResults />
          </ProtectedRoute>
        } />
        <Route path="/teacher/attempt/:attemptId" element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <AttemptDetailTeacher />
          </ProtectedRoute>
        } />
        
        {/* Admin routes */}
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UsersManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/blocked-tests" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <BlockedTests />
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;