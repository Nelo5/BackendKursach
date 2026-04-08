import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

const AttemptDetail = () => {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAttemptDetail();
  }, [attemptId]);

  const loadAttemptDetail = async () => {
    try {
      const data = await attemptService.getMyAttemptDetail(attemptId);
      setAttempt(data);
    } catch (error) {
      toast.error('Ошибка загрузки деталей попытки');
      navigate('/my-attempts');
    } finally {
      setLoading(false);
    }
  };

  const getScoreClass = (percentage) => {
    if (percentage >= 80) return 'score-high';
    if (percentage >= 60) return 'score-medium';
    return 'score-low';
  };

  if (loading) {
    return <div className="loading">Загрузка деталей...</div>;
  }

  if (!attempt) {
    return <div className="loading">Попытка не найдена</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Детали попытки</h2>
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Тест:</strong> {attempt.test_title}</p>
          <p><strong>Попытка №:</strong> {attempt.attempt_number}</p>
          <p><strong>Дата прохождения:</strong> {format(new Date(attempt.completed_at), 'dd MMMM yyyy HH:mm', { locale: ru })}</p>
          <p><strong>Время выполнения:</strong> {attempt.time_spent_minutes} минут</p>
          <p><strong>Результат:</strong> {attempt.score} / {attempt.max_possible_score}</p>
          <p><strong>Процент выполнения:</strong> 
            <span className={`score-badge ${getScoreClass(attempt.percentage)}`} style={{ marginLeft: '10px' }}>
              {attempt.percentage.toFixed(1)}%
            </span>
          </p>
        </div>

        <h3>Ответы на вопросы</h3>
        {attempt.answers.map((answer, idx) => (
          <div key={answer.question_id} className="question-card">
            <div className="question-header">
              <strong>Вопрос {idx + 1}</strong>
              <span>
                Баллов: {answer.points_earned} / {answer.points}
                {answer.is_correct && <span style={{ color: '#48bb78', marginLeft: '10px' }}>✓ Верно</span>}
                {!answer.is_correct && <span style={{ color: '#e53e3e', marginLeft: '10px' }}>✗ Неверно</span>}
              </span>
            </div>
            <div className="question-text">
              {answer.question_text}
            </div>
            
            <div style={{ marginTop: '15px' }}>
              <strong>Ваш ответ:</strong>
              <div style={{ marginTop: '5px', padding: '10px', background: '#f7fafc', borderRadius: '5px' }}>
                {answer.question_type === 'closed' && answer.selected_options && (
                  <div>
                    {answer.selected_options.map(optIdx => (
                      <div key={optIdx}>• {answer.correct_answer?.split(', ')[optIdx] || `Вариант ${optIdx + 1}`}</div>
                    ))}
                  </div>
                )}
                {answer.question_type === 'open' && (
                  <div>{answer.user_answer || 'Нет ответа'}</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <strong>Правильный ответ:</strong>
              <div style={{ marginTop: '5px', padding: '10px', background: '#e6fffa', borderRadius: '5px' }}>
                {answer.correct_answer}
              </div>
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/my-attempts')}>
            Вернуться к результатам
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttemptDetail;