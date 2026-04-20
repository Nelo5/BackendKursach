// src/pages/student/MyAttemptsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAttempts } from '../../api/attempts';

const MyAttemptsPage = () => {
  const navigate = useNavigate();
  const [attemptsByTest, setAttemptsByTest] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTests, setExpandedTests] = useState(new Set());

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    setLoading(true);
    const result = await getMyAttempts();
    if (result.success) {
      // Группируем попытки по тестам
      const grouped = {};
      result.data.forEach(attempt => {
        if (!grouped[attempt.test_id]) {
          grouped[attempt.test_id] = {
            test_id: attempt.test_id,
            test_title: attempt.test_title,
            attempts: []
          };
        }
        grouped[attempt.test_id].attempts.push(attempt);
      });
      
      // Сортируем попытки по дате
      Object.keys(grouped).forEach(testId => {
        grouped[testId].attempts.sort((a, b) => 
          new Date(b.started_at) - new Date(a.started_at)
        );
      });
      
      setAttemptsByTest(grouped);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const toggleTest = (testId) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  const getAttemptScoreColor = (percentage) => {
    if (!percentage) return 'score-unknown';
    if (percentage >= 80) return 'score-high';
    if (percentage >= 60) return 'score-medium';
    return 'score-low';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAverageScore = (attempts) => {
    const completedAttempts = attempts.filter(a => a.completed_at);
    if (completedAttempts.length === 0) return 0;
    const sum = completedAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0);
    return sum / completedAttempts.length;
  };

  const getBestScore = (attempts) => {
    const completedAttempts = attempts.filter(a => a.completed_at && a.percentage);
    if (completedAttempts.length === 0) return null;
    return Math.max(...completedAttempts.map(a => a.percentage));
  };

  if (loading) return <div className="loading">Загрузка попыток...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="my-attempts-page">
      <div className="header">
        <h1>Мои результаты</h1>
      </div>

      {Object.keys(attemptsByTest).length === 0 && (
        <div className="empty-state">
          <p>У вас пока нет пройденных тестов</p>
          <button onClick={() => navigate('/student/tests')} className="btn-primary">
            Перейти к тестам
          </button>
        </div>
      )}

      <div className="tests-attempts-list">
        {Object.values(attemptsByTest).map(testData => {
          const bestScore = getBestScore(testData.attempts);
          const averageScore = calculateAverageScore(testData.attempts);
          const isExpanded = expandedTests.has(testData.test_id);
          
          return (
            <div key={testData.test_id} className="test-attempts-card">
              <div className="test-summary" onClick={() => toggleTest(testData.test_id)}>
                <div className="test-info">
                  <h3>{testData.test_title}</h3>
                  <div className="test-stats">
                    <div className="stat">
                      <span className="stat-label">Всего попыток:</span>
                      <span className="stat-value">{testData.attempts.length}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Лучший результат:</span>
                      <span className={`stat-value ${getAttemptScoreColor(bestScore)}`}>
                        {bestScore ? `${Math.round(bestScore)}%` : '—'}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Средний балл:</span>
                      <span className="stat-value">{Math.round(averageScore)}%</span>
                    </div>
                  </div>
                </div>
                <div className="expand-icon">
                  {isExpanded ? '▲' : '▼'}
                </div>
              </div>
              
              {isExpanded && (
                <div className="attempts-list">
                  <table className="attempts-table">
                    <thead>
                      <tr>
                        <th>Попытка №</th>
                        <th>Дата начала</th>
                        <th>Дата завершения</th>
                        <th>Результат</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testData.attempts.map((attempt, idx) => (
                        <tr key={attempt.attempt_id} className={attempt.completed_at ? 'completed' : 'in-progress'}>
                          <td>{idx + 1}</td>
                          <td>{formatDate(attempt.started_at)}</td>
                          <td>
                            {attempt.completed_at 
                              ? formatDate(attempt.completed_at)
                              : <span className="in-progress-badge">В процессе</span>
                            }
                          </td>
                          <td>
                            {attempt.completed_at ? (
                              <span className={`score-badge ${getAttemptScoreColor(attempt.percentage)}`}>
                                {Math.round(attempt.percentage)}% ({attempt.score} баллов)
                              </span>
                            ) : (
                              <span className="not-completed">—</span>
                            )}
                          </td>
                          <td>
                            {attempt.completed_at ? (
                              <button 
                                onClick={() => navigate(`/student/attempt/${attempt.attempt_id}/result`)}
                                className="view-btn"
                              >
                                Посмотреть детали
                              </button>
                            ) : (
                              <button 
                                onClick={() => navigate(`/student/attempt/${attempt.attempt_id}`)}
                                className="continue-btn"
                              >
                                Продолжить
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyAttemptsPage;