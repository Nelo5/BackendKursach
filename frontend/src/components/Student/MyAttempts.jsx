import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

const MyAttempts = () => {
  const [history, setHistory] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await attemptService.getMyAttemptsHistory();
      setHistory(data);
    } catch (error) {
      toast.error('Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  };

  const loadTestAttempts = async (testId) => {
    try {
      const data = await attemptService.getMyTestAttempts(testId);
      setAttempts(data.attempts);
      setSelectedTest(data);
    } catch (error) {
      toast.error('Ошибка загрузки попыток');
    }
  };

  const viewAttemptDetail = (attemptId) => {
    navigate(`/attempt/${attemptId}`);
  };

  const getScoreClass = (percentage) => {
    if (percentage >= 80) return 'score-high';
    if (percentage >= 60) return 'score-medium';
    return 'score-low';
  };

  if (loading) {
    return <div className="loading">Загрузка результатов...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Мои результаты</h2>
        
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>
            Вы еще не прошли ни одного теста
          </p>
        ) : (
          <>
            <div className="tests-list">
              {history.map(item => (
                <div 
                  key={item.test_id} 
                  className="card" 
                  style={{ cursor: 'pointer', marginBottom: '10px' }}
                  onClick={() => loadTestAttempts(item.test_id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3>{item.test_title}</h3>
                      <p>Попыток: {item.attempts_count} | Лучший результат: {item.best_score} ({item.best_score_percentage.toFixed(1)}%)</p>
                      <p>Последняя попытка: {format(new Date(item.last_attempt_date), 'dd MMM yyyy HH:mm', { locale: ru })}</p>
                    </div>
                    <span className="btn btn-secondary" style={{ fontSize: '20px' }}>
                      {selectedTest?.test_id === item.test_id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {selectedTest && attempts.length > 0 && (
              <div className="card" style={{ marginTop: '20px' }}>
                <h3>Попытки теста: {selectedTest.test_title}</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>№ попытки</th>
                      <th>Дата и время</th>
                      <th>Результат</th>
                      <th>Процент</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map(attempt => (
                      <tr key={attempt.attempt_id}>
                        <td>{attempt.attempt_number}</td>
                        <td>{format(new Date(attempt.completed_at), 'dd.MM.yyyy HH:mm')}</td>
                        <td>{attempt.score} / {attempt.max_possible_score}</td>
                        <td>
                          <span className={`score-badge ${getScoreClass(attempt.percentage)}`}>
                            {attempt.percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary"
                            onClick={() => viewAttemptDetail(attempt.attempt_id)}
                            style={{ padding: '5px 10px', fontSize: '14px' }}
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
          </>
        )}
      </div>
    </div>
  );
};

export default MyAttempts;