import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';
import toast from 'react-hot-toast';

const TestTaking = () => {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const attemptId = location.state?.attemptId;

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    try {
      const data = await testService.getTestDetails(testId);
      setTest(data);
      // Initialize answers
      const initialAnswers = {};
      data.questions.forEach(q => {
        initialAnswers[q.id] = {
          question_id: q.id,
          answer_text: '',
          selected_options: []
        };
      });
      setAnswers(initialAnswers);
    } catch (error) {
      toast.error('Ошибка загрузки теста');
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleClosedAnswer = (questionId, optionIndex, isMultiple) => {
    setAnswers(prev => {
      const current = prev[questionId].selected_options || [];
      let newSelected;
      
      if (isMultiple) {
        if (current.includes(optionIndex)) {
          newSelected = current.filter(i => i !== optionIndex);
        } else {
          newSelected = [...current, optionIndex];
        }
      } else {
        newSelected = [optionIndex];
      }
      
      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          selected_options: newSelected
        }
      };
    });
  };

  const handleOpenAnswer = (questionId, text) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer_text: text
      }
    }));
  };

  const handleSubmit = async () => {
    if (!window.confirm('Вы уверены, что хотите завершить тест?')) {
      return;
    }

    setSubmitting(true);
    try {
      const answersList = Object.values(answers);
      const result = await attemptService.submitAttempt(attemptId, answersList);
      
      toast.success(`Тест завершен! Ваш результат: ${result.score}/${result.max_score} (${result.percentage.toFixed(1)}%)`);
      navigate('/my-attempts');
    } catch (error) {
      toast.error('Ошибка при отправке теста');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка теста...</div>;
  }

  if (!test) {
    return <div className="loading">Тест не найден</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>{test.title}</h2>
        <p><strong>Предмет:</strong> {test.subject}</p>
        <p><strong>Описание:</strong> {test.description}</p>
        <p><strong>Максимальный балл:</strong> {test.max_score}</p>
        <p><strong>Количество вопросов:</strong> {test.questions.length}</p>
      </div>

      {test.questions.sort((a, b) => a.order_number - b.order_number).map((question, idx) => (
        <div key={question.id} className="question-card">
          <div className="question-header">
            <strong>Вопрос {idx + 1}</strong>
            <span>Баллов: {question.points}</span>
          </div>
          <div className="question-text">
            {question.question_text}
          </div>
          
          {question.question_type === 'closed' && (
            <div className="options-list">
              {question.closed_question_data.options.map((option, optIdx) => {
                const isMultiple = question.closed_question_data.correct.length > 1;
                return (
                  <label key={optIdx} className="option-item">
                    <input
                      type={isMultiple ? 'checkbox' : 'radio'}
                      name={`question-${question.id}`}
                      checked={answers[question.id]?.selected_options?.includes(optIdx) || false}
                      onChange={() => handleClosedAnswer(question.id, optIdx, isMultiple)}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          )}
          
          {question.question_type === 'open' && (
            <div className="open-answer">
              <textarea
                value={answers[question.id]?.answer_text || ''}
                onChange={(e) => handleOpenAnswer(question.id, e.target.value)}
                placeholder="Введите ваш ответ здесь..."
              />
            </div>
          )}
        </div>
      ))}

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          className="btn btn-success"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ padding: '12px 30px', fontSize: '18px' }}
        >
          {submitting ? 'Отправка...' : 'Завершить тест'}
        </button>
      </div>
    </div>
  );
};

export default TestTaking;