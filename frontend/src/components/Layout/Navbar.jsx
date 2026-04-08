import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin, isTeacher, isStudent } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleName = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'student': return 'Студент';
      default: return role;
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          📚 Тест-Система
        </Link>
        <div className="navbar-menu">
          {user && (
            <>
              {isStudent && (
                <>
                  <Link to="/tests">📝 Доступные тесты</Link>
                  <Link to="/my-attempts">📊 Мои результаты</Link>
                </>
              )}
              {(isTeacher || isAdmin) && (
                <>
                  <Link to="/teacher/tests">📋 Мои тесты</Link>
                  <Link to="/teacher/create-test">➕ Создать тест</Link>
                </>
              )}
              {isAdmin && (
                <>
                  <Link to="/admin/users">👥 Пользователи</Link>
                  <Link to="/admin/blocked-tests">🚫 Заблокированные тесты</Link>
                </>
              )}
              <div className="user-info">
                <span>👤 {user.username}</span>
                <span className={`role-badge role-${user.role}`}>
                  {getRoleName(user.role)}
                </span>
                <button onClick={handleLogout} className="btn btn-danger">
                  Выйти
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;