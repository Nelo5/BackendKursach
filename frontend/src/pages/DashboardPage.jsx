// src/pages/DashboardPage.jsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const { user } = useAuth();

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>
            Добро пожаловать, {user?.name} {user?.surname}!
          </h1>
          <p>Вы вошли как {isTeacher ? 'учитель' : 'студент'}</p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Быстрые действия</h3>
            <div className="quick-actions">
              {isTeacher ? (
                <>
                  <Link to="/teacher/tests/create" className="action-btn">
                    + Создать новый тест
                  </Link>
                  <Link to="/teacher/questions" className="action-btn">
                    📝 Добавить вопрос
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/student/tests" className="action-btn">
                    📚 Доступные тесты
                  </Link>
                  <Link to="/student/attempts" className="action-btn">
                    📊 Мои результаты
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="stat-card">
            <h3>Советы</h3>
            <ul>
              {isTeacher ? (
                <>
                  <li>Создавайте вопросы в банке вопросов перед созданием теста</li>
                  <li>Не забудьте опубликовать тест перед выдачей доступа студентам</li>
                  <li>Используйте разные типы вопросов для разнообразия</li>
                </>
              ) : (
                <>
                  <li>Внимательно читайте вопросы перед ответом</li>
                  <li>Вы можете сохранять ответы и продолжить позже</li>
                  <li>После завершения теста вы увидите подробный разбор ошибок</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;