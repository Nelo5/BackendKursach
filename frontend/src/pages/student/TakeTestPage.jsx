// src/pages/student/TakeTestPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttemptDetail, saveAnswer, submitAttempt } from '../../api/attempts';
import { getTestDetails } from '../../api/tests';

const TakeTestPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: answerData }
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAttemptAndTest();
  }, [attemptId]);

  // Загружаем попытку и тест
  const loadAttemptAndTest = async () => {
    setLoading(true);
    // 1. Получаем попытку
    const attemptResult = await getAttemptDetail(attemptId);
    if (!attemptResult.success) {
      alert(attemptResult.error);
      navigate('/student/tests');
      return;
    }
    setAttempt(attemptResult.data);

    // 2. Получаем тест (чтобы взять актуальные вопросы)
    const testResult = await getTestDetails(attemptResult.data.test_id);
    if (!testResult.success) {
      alert(testResult.error);
      navigate('/student/tests');
      return;
    }
    setTest(testResult.data);

    // 3. Загружаем уже сохранённые ответы из попытки (если есть)
    if (attemptResult.data.answers) {
      const savedAnswers = {};
      attemptResult.data.answers.forEach(answer => {
        savedAnswers[answer.question_id] = answer.answer_data;
      });
      setAnswers(savedAnswers);
    }

    setLoading(false);
  };

  const handleAnswerChange = async (questionId, answerData) => {
    // Обновляем локальное состояние
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerData
    }));

    // Сохраняем на сервере
    setSaving(true);
    await saveAnswer(attemptId, questionId, answerData);
    setSaving(false);
  };

  const renderQuestionInput = (question) => {
    const currentAnswer = answers[question.id] || {};

    switch(question.question_type) {
      case 'single_choice':
        return (
          <div className="single-choice-options">
            {question.data.options.map(option => (
              <label key={option.id} className="radio-option">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option.id}
                  checked={currentAnswer.selected_options?.[0] === option.id}
                  onChange={() => handleAnswerChange(question.id, {
                    selected_options: [option.id]
                  })}
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="multiple-choice-options">
            {question.data.options.map(option => (
              <label key={option.id} className="checkbox-option">
                <input
                  type="checkbox"
                  value={option.id}
                  checked={currentAnswer.selected_options?.includes(option.id) || false}
                  onChange={(e) => {
                    const currentSelected = currentAnswer.selected_options || [];
                    let newSelected;
                    if (e.target.checked) {
                      newSelected = [...currentSelected, option.id];
                    } else {
                      newSelected = currentSelected.filter(id => id !== option.id);
                    }
                    handleAnswerChange(question.id, {
                      selected_options: newSelected
                    });
                  }}
                />
                <span>{option.text}</span>
                {option.weight > 0 && <span className="weight-hint">(вес: {option.weight})</span>}
              </label>
            ))}
          </div>
        );

      case 'open':
        return (
          <div className="open-question-input">
            <textarea
              value={currentAnswer.text || ''}
              onChange={(e) => handleAnswerChange(question.id, {
                text: e.target.value
              })}
              rows="5"
              placeholder="Введите ваш ответ..."
              className="open-textarea"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (window.confirm('Вы уверены, что хотите завершить тест? Вы не сможете изменить ответы после завершения.')) {
      setSubmitting(true);
      const result = await submitAttempt(attemptId);
      if (result.success) {
        navigate(`/student/attempt/${attemptId}/result`);
      } else {
        alert(result.error);
      }
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Загрузка теста...</div>;
  if (!attempt || !test) return null;

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  return (
    <div className="take-test-page">
      <div className="test-header">
        <h1>{test.title}</h1>
        <div className="test-progress">
          <span>Вопрос {currentQuestionIndex + 1} из {test.questions.length}</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      {saving && <div className="saving-indicator">Сохранение...</div>}

      <div className="question-container">
        <div className="question-card">
          <div className="question-header">
            <span className="question-type">
              {currentQuestion.question_type === 'single_choice' && 'Одиночный выбор'}
              {currentQuestion.question_type === 'multiple_choice' && 'Множественный выбор'}
              {currentQuestion.question_type === 'open' && 'Открытый вопрос'}
            </span>
            <span className="question-points">Баллов: {currentQuestion.points}</span>
          </div>
          
          <div className="question-text">
            {currentQuestion.question_text}
          </div>
          
          <div className="answer-area">
            {renderQuestionInput(currentQuestion)}
          </div>
        </div>
      </div>

      <div className="navigation-buttons">
        <button 
          onClick={handlePrevious} 
          disabled={currentQuestionIndex === 0}
          className="nav-btn prev"
        >
          ← Предыдущий
        </button>
        {currentQuestionIndex === test.questions.length - 1 ? (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? 'Завершение...' : 'Завершить тест'}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="nav-btn next"
          >
            Следующий →
          </button>
        )}
      </div>
    </div>
  );
};

export default TakeTestPage;