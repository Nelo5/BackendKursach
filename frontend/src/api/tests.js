// src/api/tests.js
import axiosInstance from './axios';

// Получить все тесты пользователя (учителя)
export const getMyTests = async (skip = 0, limit = 100) => {
  try {
    const response = await axiosInstance.get('/tests/', {
      params: { skip, limit }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки тестов' 
    };
  }
};

// Получить доступные тесты для студентов (с фильтром по предмету)
export const getAvailableTests = async (subject = null) => {
  try {
    const params = subject ? { subject } : {};
    const response = await axiosInstance.get('/tests/', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки тестов' 
    };
  }
};

// Создать новый тест
export const createTest = async (testData) => {
  try {
    const response = await axiosInstance.post('/tests/', testData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка создания теста' 
    };
  }
};

// Получить детали теста
export const getTestDetails = async (testId) => {
  try {
    const response = await axiosInstance.get(`/tests/${testId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки теста' 
    };
  }
};

// Обновить тест
export const updateTest = async (testId, testData) => {
  try {
    const response = await axiosInstance.patch(`/tests/${testId}`, testData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка обновления теста' 
    };
  }
};

// Выдать доступ к тесту студентам
export const grantTestAccess = async (testId, studentIds) => {
  try {
    const response = await axiosInstance.post(`/tests/${testId}/grant-access`, {
      student_ids: studentIds
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка выдачи доступа' 
    };
  }
};

// Получить уникальные предметы
export const getUniqueSubjects = async () => {
  try {
    const response = await axiosInstance.get('/tests/subjects');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки предметов' 
    };
  }
};

// Получить всех пользователей (для выдачи доступа)
export const getAllUsers = async (skip = 0, limit = 100) => {
  try {
    const response = await axiosInstance.get('/tests/users', {
      params: { skip, limit }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки пользователей' 
    };
  }
};