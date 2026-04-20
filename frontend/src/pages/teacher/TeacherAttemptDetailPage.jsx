// src/pages/teacher/TeacherAttemptDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttemptDetail } from '../../api/attempts';
import { getTestDetails } from '../../api/tests';

const TeacherAttemptDetailPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttemptAndTest();
  }, [attemptId]);

  const loadAttemptAndTest = async () => {
    setLoading(true);
    const attemptResult = await getAttemptDetail(attemptId);
    if (!attemptResult.success) {
      alert(attemptResult.error);
      navigate('/teacher/tests');
      return;
    }
    setAttempt(attemptResult.data);

    const testResult = await getTestDetails(attemptResult.data.test_id);
    if (testResult.success) {
      setTest(testResult.data);
    }
    setLoading(false);
  };

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

  const getCorrectAnswerText = (question) => {
    if (question.question_type === 'single_choice') {
      const correctId = question.data.correct?.[0];
      const option = question.data.options?.find(opt => opt.id === correctId);
      return option?.text || 'Не указан';
    }
    if (question.question_type === 'multiple_choice') {
      const correctOptions = question.data.options?.filter(opt => opt.weight > 0);
      if (!correctOptions.length) return 'Нет правильных вариантов';
      return correctOptions.map(opt => `${opt.text} (вес: ${opt.weight})`).join(', ');
    }
    if (question.question_type === 'open') {
      return question.data.keywords?.join(', ') || 'Нет ключевых слов';
    }
    return '';
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!attempt || !test) return null;

  const questionsMap = Object.fromEntries(test.questions.map(q => [q.id, q]));
  const maxScore = attempt.answers.reduce((sum, a) => sum + (questionsMap[a.question_id]?.points || 0), 0);

  return (
    <div className="teacher-attempt-detail">
      <div className="header">
        <button onClick={() => navigate(-1)} className="btn-back">← Назад</button>
        <h1>Детали попытки студента</h1>
      </div>
      <div className="attempt-info">
        <p><strong>Студент:</strong> {attempt.student_name || 'Неизвестно'}</p>
        <p><strong>Тест:</strong> {attempt.test_title}</p>
        <p><strong>Результат:</strong> {attempt.score} / {maxScore} ({Math.round(attempt.percentage)}%)</p>
        <p><strong>Дата завершения:</strong> {new Date(attempt.completed_at).toLocaleString()}</p>
      </div>
      <div className="answers-list">
        <h2>Ответы студента</h2>
        {attempt.answers.map((answer, idx) => {
          const question = questionsMap[answer.question_id];
          if (!question) return null;
          return (
            <div key={answer.question_id} className={`answer-card ${answer.is_correct ? 'correct' : 'incorrect'}`}>
              <div className="answer-header">
                <span>Вопрос {idx + 1}</span>
                <span>{answer.is_correct ? '✓ Правильно' : '✗ Неправильно'}</span>
                <span>{answer.points_earned} / {question.points} баллов</span>
              </div>
              <div className="question-text">{question.question_text}</div>
              <div className="user-answer">
                <strong>Ответ студента:</strong> {getUserAnswerText(answer, question)}
              </div>
              {!answer.is_correct && (
                <div className="correct-answer">
                  <strong>Правильный ответ:</strong> {getCorrectAnswerText(question)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherAttemptDetailPage;