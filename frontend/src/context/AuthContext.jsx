// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, registerUser, logoutUser } from '../api/auth';

const AuthContext = createContext(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // При загрузке проверяем, есть ли сохранённый пользователь
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Регистрация (если бэкенд возвращает пользователя, сохраняем)
  const register = async (userData) => {
    setError(null);
    const result = await registerUser(userData);
    
    if (result.success) {
      // Если при регистрации бэкенд возвращает данные пользователя, используем их
      // (по вашей схеме UserResponse, там есть id, role, status и т.д.)
      setUser(result.data);
      localStorage.setItem('user', JSON.stringify(result.data));
      return { success: true };
    } else {
      setError(result.error);
      return { success: false, error: result.error };
    }
  };

  // Вход – берём данные из ответа loginUser
  const login = async (credentials) => {
    setError(null);
    const result = await loginUser(credentials);
    
    if (result.success) {
      // Формируем объект пользователя из полей, которые вернул бэкенд
      const userData = {
        id: result.data.user_id,
        name: result.data.name,
        surname: result.data.surname,
        email: result.data.email,
        role: result.data.role,
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true };
    } else {
      setError(result.error);
      return { success: false, error: result.error };
    }
  };

  // Выход
  const logout = () => {
    logoutUser();
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};