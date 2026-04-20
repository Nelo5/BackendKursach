// src/api/questions.js
import axiosInstance from './axios';

// Получить список вопросов
export const getQuestions = async (skip = 0, limit = 100) => {
  try {
    const response = await axiosInstance.get('/questions/', {
      params: { skip, limit }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки вопросов' 
    };
  }
};

// Создать вопрос
export const createQuestion = async (questionData) => {
  try {
    const response = await axiosInstance.post('/questions/', questionData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка создания вопроса' 
    };
  }
};

// Получить вопрос по ID
export const getQuestion = async (questionId) => {
  try {
    const response = await axiosInstance.get(`/questions/${questionId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка загрузки вопроса' 
    };
  }
};

// Обновить вопрос
export const updateQuestion = async (questionId, questionData) => {
  try {
    const response = await axiosInstance.patch(`/questions/${questionId}`, questionData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка обновления вопроса' 
    };
  }
};

// Удалить вопрос
export const deleteQuestion = async (questionId) => {
  try {
    const response = await axiosInstance.delete(`/questions/${questionId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.detail || 'Ошибка удаления вопроса' 
    };
  }
};