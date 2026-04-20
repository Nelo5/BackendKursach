// src/api/auth.js
import axiosInstance from './axios';

// Регистрация пользователя
export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post('/auth/register', userData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка регистрации' 
    };
  }
};

// Вход пользователя – используем все поля из ответа Token
export const loginUser = async (credentials) => {
  try {
    const response = await axiosInstance.post('/auth/login', credentials);
    const { access_token, token_type, user_id, name, surname, email, role } = response.data;
    
    // Сохраняем токен
    localStorage.setItem('access_token', access_token);
    
    // Возвращаем все данные пользователя
    return { 
      success: true, 
      data: {
        access_token,
        token_type,
        user_id,
        name,
        surname,
        email,
        role
      }
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка входа' 
    };
  }
};

// Выход
export const logoutUser = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};