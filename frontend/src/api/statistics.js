// src/api/statistics.js
import axiosInstance from './axios';

// Получить общую статистику по тесту (список попыток)
export const getTestStatisticsSummary = async (testId) => {
  try {
    const response = await axiosInstance.get(`/statistics/test/${testId}/summary`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Ошибка загрузки статистики'
    };
  }
};

// Получить анализ вопросов теста
export const getTestQuestionsAnalysis = async (testId) => {
  try {
    const response = await axiosInstance.get(`/statistics/test/${testId}/questions-analysis`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Ошибка загрузки анализа вопросов'
    };
  }
};