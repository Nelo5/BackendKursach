// src/pages/student/AttemptResultPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAttemptDetail } from '../../api/attempts';
import { getTestDetails } from '../../api/tests';

const AttemptResultPage = () => {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    loadAttemptAndTest();
  }, [attemptId]);

  const loadAttemptAndTest = async () => {
    setLoading(true);
    // 1. Загружаем попытку
    const attemptResult = await getAttemptDetail(attemptId);
    if (!attemptResult.success) {
      console.error(attemptResult.error);
      setLoading(false);
      return;
    }
    setAttempt(attemptResult.data);

    // 2. Загружаем тест, чтобы получить данные вопросов (варианты, ключевые слова)
    const testResult = await getTestDetails(attemptResult.data.test_id);
    if (testResult.success) {
      setTest(testResult.data);
    }
    setLoading(false);
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    if (percentage >= 40) return 'score-average';
    return 'score-poor';
  };

  // Вспомогательная функция: получить текст ответа студента в читаемом виде
  const getUserAnswerText = (answer, question) => {
    if (!answer.answer_data) return 'Нет ответа';

    if (question.question_type === 'single_choice') {
      const selectedId = answer.answer_data.selected_options?.[0];
      const option = question.data.options?.find(opt => opt.id === selectedId);
      return option?.text || 'Не выбран';
    }

    if (question.question_type === 'multiple_choice') {
      const selectedIds = answer.answer_data.selected_options || [];
      if (selectedIds.length === 0) return 'Не выбрано ни одного варианта';
      return selectedIds.map(id => {
        const opt = question.data.options?.find(o => o.id === id);
        return opt?.text || `ID ${id}`;
      }).join(', ');
    }

    if (question.question_type === 'open') {
      return answer.answer_data.text || 'Нет ответа';
    }

    return JSON.stringify(answer.answer_data);
  };

  if (loading) return <div className="loading">Загрузка результатов...</div>;
  if (!attempt) return <div className="error-message">Не удалось загрузить результаты</div>;

  // Создаём карту вопросов для быстрого доступа
  const questionsMap = test ? Object.fromEntries(test.questions.map(q => [q.id, q])) : {};

  // Сумма максимальных баллов
  const maxScore = attempt.answers.reduce((sum, a) => sum + (questionsMap[a.question_id]?.points || a.points), 0);

  return (
    <div className="attempt-result-page">
      <div className="result-header">
        <h1>Результаты теста</h1>
        <Link to="/student/tests" className="back-link">← Назад к тестам</Link>
      </div>

      <div className="result-summary">
        <div className="summary-card">
          <h3>{attempt.test_title}</h3>
          <div className="score-container">
            <div className={`score-circle ${getScoreColor(attempt.percentage)}`}>
              <span className="score-value">{Math.round(attempt.percentage)}%</span>
            </div>
            <div className="score-details">
              <p><strong>Набрано баллов:</strong> {attempt.score} / {maxScore}</p>
              <p><strong>Время выполнения:</strong> {attempt.time_spent_minutes?.toFixed(1)} мин.</p>
              <p><strong>Дата завершения:</strong> {new Date(attempt.completed_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="answers-toggle">
        <button onClick={() => setShowAnswers(!showAnswers)} className="toggle-btn">
          {showAnswers ? 'Скрыть ответы' : 'Показать ответы и ошибки'}
        </button>
      </div>

      {showAnswers && (
        <div className="answers-details">
          <h2>Детальный разбор</h2>
          {attempt.answers.map((answer, index) => {
            const question = questionsMap[answer.question_id];
            if (!question) {
              return (
                <div key={answer.question_id} className="answer-detail-card error">
                  <div className="answer-header">
                    <span className="question-number">Вопрос {index + 1}</span>
                    <span className="answer-status">Ошибка загрузки вопроса</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={answer.question_id} className={`answer-detail-card ${answer.is_correct ? 'correct' : 'incorrect'}`}>
                <div className="answer-header">
                  <span className="question-number">Вопрос {index + 1}</span>
                  <span className={`answer-status ${answer.is_correct ? 'correct' : 'incorrect'}`}>
                    {answer.is_correct ? '✓ Правильно' : '✗ Неправильно'}
                  </span>
                  <span className="earned-points">
                    {answer.points_earned} / {question.points} баллов
                  </span>
                </div>

                <div className="answer-question">
                  <strong>Вопрос:</strong> {question.question_text}
                </div>

                <div className="answer-user">
                  <strong>Ваш ответ:</strong>
                  <div className="user-answer">
                    {getUserAnswerText(answer, question)}
                  </div>
                </div>

                {/* Блок правильных ответов – удалён по требованию */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttemptResultPage;