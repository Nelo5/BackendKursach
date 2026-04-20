// src/api/attempts.js
import axiosInstance from './axios';

// Получить доступные тесты для студента
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

// Начать прохождение теста
export const startAttempt = async (testId) => {
  try {
    const response = await axiosInstance.post('/attempts/start', { test_id: testId });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка начала теста' 
    };
  }
};

// Получить все попытки студента
export const getMyAttempts = async () => {
  try {
    const response = await axiosInstance.get('/attempts/my');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки попыток' 
    };
  }
};

// Получить детали попытки
export const getAttemptDetail = async (attemptId) => {
  try {
    const response = await axiosInstance.get(`/attempts/${attemptId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки деталей попытки' 
    };
  }
};

// Отправить ответ на вопрос
export const saveAnswer = async (attemptId, questionId, answerData) => {
  try {
    // Сначала пытаемся получить существующий ответ
    const getResponse = await axiosInstance.get(`/answers/${attemptId}/questions/${questionId}`);
    if (getResponse.data) {
      // Если ответ существует, обновляем его
      const response = await axiosInstance.patch(`/answers/${attemptId}/questions/${questionId}`, {
        answer_data: answerData
      });
      return { success: true, data: response.data };
    }
  } catch (error) {
    // Если ответ не найден (404), создаём новый
    if (error.response?.status === 404) {
      const response = await axiosInstance.post(`/answers/${attemptId}/questions/${questionId}`, {
        answer_data: answerData
      });
      return { success: true, data: response.data };
    }
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка сохранения ответа' 
    };
  }
};

// Завершить попытку
export const submitAttempt = async (attemptId) => {
  try {
    const response = await axiosInstance.post(`/attempts/${attemptId}/submit`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка завершения теста' 
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