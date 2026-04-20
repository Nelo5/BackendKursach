// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  if (!user) return null; // или ничего не показываем

  return (
    <nav className={`navbar ${isTeacher ? 'teacher-navbar' : 'student-navbar'}`}>
      <div className="nav-container">
        <div className="nav-brand">
          <h2>{isTeacher ? 'Учительская панель' : 'Студенческая панель'}</h2>
        </div>

        <div className="nav-links">
          {isTeacher && (
            <>
              <NavLink to="/teacher/tests" className={({ isActive }) => isActive ? 'active' : ''}>
                Мои тесты
              </NavLink>
              <NavLink to="/teacher/tests/create" className={({ isActive }) => isActive ? 'active' : ''}>
                Создать тест
              </NavLink>
              <NavLink to="/teacher/questions" className={({ isActive }) => isActive ? 'active' : ''}>
                Банк вопросов
              </NavLink>
            </>
          )}
          {isStudent && (
            <>
              <NavLink to="/student/tests" className={({ isActive }) => isActive ? 'active' : ''}>
                Доступные тесты
              </NavLink>
              <NavLink to="/student/attempts" className={({ isActive }) => isActive ? 'active' : ''}>
                Мои результаты
              </NavLink>
            </>
          )}
        </div>

        <div className="nav-user">
          <span className="user-name">{user?.name} {user?.surname}</span>
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;