// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
// Teacher imports
import MyTestsPage from './pages/teacher/MyTestsPage';
import CreateTestPage from './pages/teacher/CreateTestPage';
import EditTestPage from './pages/teacher/EditTestPage';
import TestDetailsPage from './pages/teacher/TestDetailsPage';
import QuestionBankPage from './pages/teacher/QuestionBankPage';
import TestStatisticsPage from './pages/teacher/TestStatisticsPage';
import QuestionsAnalysisPage from './pages/teacher/QuestionsAnalysisPage';
import TeacherAttemptDetailPage from './pages/teacher/TeacherAttemptDetailPage';
// Student imports
import AvailableTestsPage from './pages/student/AvailableTestsPage';
import TakeTestPage from './pages/student/TakeTestPage';
import AttemptResultPage from './pages/student/AttemptResultPage';
import MyAttemptsPage from './pages/student/MyAttemptsPage';
import './index.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Защищённые маршруты с Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Teacher routes */}
              <Route path="/teacher/tests" element={<MyTestsPage />} />
              <Route path="/teacher/tests/create" element={<CreateTestPage />} />
              <Route path="/teacher/tests/:testId" element={<TestDetailsPage />} />
              <Route path="/teacher/tests/:testId/edit" element={<EditTestPage />} />
              <Route path="/teacher/questions" element={<QuestionBankPage />} />
              <Route path="/teacher/tests/:testId/statistics" element={<TestStatisticsPage />} />
              <Route path="/teacher/tests/:testId/questions-analysis" element={<QuestionsAnalysisPage />} />
              <Route path="/teacher/attempt/:attemptId" element={<TeacherAttemptDetailPage />} />
              
              {/* Student routes */}
              <Route path="/student/tests" element={<AvailableTestsPage />} />
              <Route path="/student/attempt/:attemptId" element={<TakeTestPage />} />
              <Route path="/student/attempt/:attemptId/result" element={<AttemptResultPage />} />
              <Route path="/student/attempts" element={<MyAttemptsPage />} />
            </Route>
          </Route>
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;