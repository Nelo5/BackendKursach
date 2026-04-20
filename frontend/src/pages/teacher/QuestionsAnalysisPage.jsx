// src/pages/teacher/QuestionsAnalysisPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTestQuestionsAnalysis } from '../../api/statistics';

const QuestionsAnalysisPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  useEffect(() => {
    loadAnalysis();
  }, [testId]);

  const loadAnalysis = async () => {
    setLoading(true);
    const result = await getTestQuestionsAnalysis(testId);
    if (result.success) {
      setAnalysis(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const getDifficultyClass = (correctPercentage) => {
    if (correctPercentage < 30) return 'difficult';
    if (correctPercentage < 70) return 'medium';
    return 'easy';
  };

  const toggleExpand = (questionId) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  if (loading) return <div className="loading">Загрузка анализа...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!analysis) return null;

  return (
    <div className="analysis-page">
      <div className="header">
        <button onClick={() => navigate(`/teacher/tests/${testId}/statistics`)} className="btn-back">
          ← Назад к статистике
        </button>
        <h1>Анализ вопросов: {analysis.test_title}</h1>
      </div>

      <div className="analysis-summary">
        <div className="stat-card">
          <h3>Всего попыток</h3>
          <div className="stat-value">{analysis.total_attempts}</div>
        </div>
        <div className="stat-card">
          <h3>Всего вопросов</h3>
          <div className="stat-value">{analysis.questions_analysis.length}</div>
        </div>
      </div>

      <div className="questions-analysis-list">
        <h2>Детали по вопросам</h2>
        {analysis.questions_analysis.map((q, index) => (
          <div key={q.question_id} className="question-analysis-card">
            <div className="question-analysis-header" onClick={() => toggleExpand(q.question_id)}>
              <div className="question-num">Вопрос {index + 1}</div>
              <div className="question-title">{q.question_text}</div>
              <div className="question-stats">
                <span className="stat-badge">Правильных: {q.correct_percentage}%</span>
                <span className={`difficulty-badge ${getDifficultyClass(q.correct_percentage)}`}>
                  {q.correct_percentage < 30 ? 'Сложный' : q.correct_percentage < 70 ? 'Средний' : 'Лёгкий'}
                </span>
                <span className="expand-icon">{expandedQuestions.has(q.question_id) ? '▲' : '▼'}</span>
              </div>
            </div>
            {expandedQuestions.has(q.question_id) && (
              <div className="question-analysis-details">
                <p><strong>Тип вопроса:</strong> {
                  q.question_type === 'single_choice' ? 'Одиночный выбор' :
                  q.question_type === 'multiple_choice' ? 'Множественный выбор' : 'Открытый'
                }</p>
                <p><strong>Макс. баллов:</strong> {q.max_points}</p>
                <p><strong>Всего ответов:</strong> {q.total_answers}</p>
                <p><strong>Средний балл:</strong> {q.average_score}</p>
                <p><strong>Процент правильных ответов:</strong> {q.correct_percentage}%</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionsAnalysisPage;