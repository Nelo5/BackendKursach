// src/pages/teacher/TestStatisticsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTestStatisticsSummary } from '../../api/statistics';

const TestStatisticsPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatistics();
  }, [testId]);

  const loadStatistics = async () => {
    setLoading(true);
    const result = await getTestStatisticsSummary(testId);
    if (result.success) {
      setStats(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreClass = (percentage) => {
    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';
    return 'low';
  };

  if (loading) return <div className="loading">Загрузка статистики...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!stats) return null;

  return (
    <div className="statistics-page">
      <div className="header">
        <button onClick={() => navigate('/teacher/tests')} className="btn-back">
          ← Назад к тестам
        </button>
        <h1>Статистика теста: {stats.test_title}</h1>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Всего попыток</h3>
          <div className="stat-value">{stats.total_attempts}</div>
        </div>
        <div className="stat-card">
          <h3>Средний балл</h3>
          <div className="stat-value">{stats.average_score}</div>
        </div>
        <div className="stat-card">
          <h3>Максимальный балл</h3>
          <div className="stat-value">{stats.highest_score}</div>
        </div>
        <div className="stat-card">
          <h3>Минимальный балл</h3>
          <div className="stat-value">{stats.lowest_score}</div>
        </div>
      </div>

      <div className="section-header">
        <h2>Список попыток студентов</h2>
        <Link to={`/teacher/tests/${testId}/questions-analysis`} className="btn-analysis">
          Анализ по вопросам
        </Link>
      </div>

      {stats.attempts.length === 0 ? (
        <div className="empty-state">Нет завершённых попыток</div>
      ) : (
        <div className="attempts-table-container">
          <table className="attempts-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Студент</th>
                <th>Дата начала</th>
                <th>Дата завершения</th>
                <th>Баллы</th>
                <th>Результат</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {stats.attempts.map((attempt, idx) => (
                <tr key={attempt.attempt_id}>
                  <td>{idx + 1}</td>
                  <td>{attempt.student_name}</td>
                  <td>{formatDate(attempt.started_at)}</td>
                  <td>{formatDate(attempt.completed_at)}</td>
                  <td>{attempt.score !== null ? attempt.score : '—'}</td>
                  <td>
                    {attempt.percentage !== null && (
                      <span className={`score-badge ${getScoreClass(attempt.percentage)}`}>
                        {Math.round(attempt.percentage)}%
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/teacher/attempt/${attempt.attempt_id}`)}
                      className="view-btn"
                    >
                      Детали
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestStatisticsPage;