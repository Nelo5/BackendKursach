// src/pages/teacher/TestDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTestDetails, grantTestAccess, updateTest } from '../../api/tests';
import { getAllUsers } from '../../api/tests';
import GrantAccessModal from '../../components/teacher/GrantAccessModal';

const TestDetailsPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadTestDetails();
    loadStudents();
  }, [testId]);

  const loadTestDetails = async () => {
    setLoading(true);
    const result = await getTestDetails(testId);
    if (result.success) {
      setTest(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const loadStudents = async () => {
    const result = await getAllUsers(0, 1000);
    if (result.success) {
      // Фильтруем только студентов
      const studentsList = result.data.filter(user => user.role === 'student');
      setStudents(studentsList);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    const result = await updateTest(testId, { status: newStatus });
    if (result.success) {
      setTest(result.data);
    } else {
      alert(result.error);
    }
    setUpdatingStatus(false);
  };

  const handleGrantAccess = async (selectedStudentIds) => {
    const result = await grantTestAccess(testId, selectedStudentIds);
    if (result.success) {
      alert('Доступ успешно выдан студентам');
      setShowGrantModal(false);
    } else {
      alert(result.error);
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'draft': return 'Черновик';
      case 'published': return 'Опубликован';
      case 'blocked': return 'Заблокирован';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'draft': return 'status-draft';
      case 'published': return 'status-published';
      case 'blocked': return 'status-blocked';
      default: return '';
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch(type) {
      case 'single_choice': return 'Одиночный выбор';
      case 'multiple_choice': return 'Множественный выбор';
      case 'open': return 'Открытый вопрос';
      default: return type;
    }
  };

  if (loading) return <div className="loading">Загрузка теста...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!test) return <div className="error-message">Тест не найден</div>;

  return (
    <div className="test-details-page">
      <div className="header">
        <button onClick={() => navigate('/teacher/tests')} className="btn-back">
          ← Назад к тестам
        </button>
        <div className="header-actions">
          <Link to={`/teacher/tests/${testId}/edit`} className="btn-edit">
            Редактировать тест
          </Link>
          <button 
            onClick={() => setShowGrantModal(true)} 
            className="btn-grant"
            disabled={test.status !== 'published'}
          >
            Выдать доступ студентам
          </button>
        </div>
      </div>

      <div className="test-details">
        <div className="test-info-card">
          <div className="test-title-section">
            <h1>{test.title}</h1>
            <span className={`status ${getStatusClass(test.status)}`}>
              {getStatusLabel(test.status)}
            </span>
          </div>
          
          <div className="test-meta">
            <div className="meta-item">
              <strong>Предмет:</strong> {test.subject}
            </div>
            <div className="meta-item">
              <strong>Максимальный балл:</strong> {test.max_score}
            </div>
            <div className="meta-item">
              <strong>Всего вопросов:</strong> {test.questions?.length || 0}
            </div>
            <div className="meta-item">
              <strong>Создан:</strong> {new Date(test.created_at).toLocaleDateString()}
            </div>
            {test.updated_at && (
              <div className="meta-item">
                <strong>Обновлен:</strong> {new Date(test.updated_at).toLocaleDateString()}
              </div>
            )}
          </div>
          
          {test.description && (
            <div className="test-description">
              <strong>Описание:</strong>
              <p>{test.description}</p>
            </div>
          )}
          
          <div className="test-status-actions">
            <h3>Управление статусом</h3>
            <div className="status-buttons">
              {test.status !== 'draft' && (
                <button 
                  onClick={() => handleUpdateStatus('draft')}
                  disabled={updatingStatus}
                  className="btn-draft"
                >
                  Перевести в черновик
                </button>
              )}
              {test.status !== 'published' && (
                <button 
                  onClick={() => handleUpdateStatus('published')}
                  disabled={updatingStatus}
                  className="btn-publish"
                >
                  Опубликовать
                </button>
              )}
              {test.status !== 'blocked' && (
                <button 
                  onClick={() => handleUpdateStatus('blocked')}
                  disabled={updatingStatus}
                  className="btn-block"
                >
                  Заблокировать
                </button>
              )}
            </div>
            <p className="status-hint">
              {test.status === 'draft' && 'Черновик виден только вам. Опубликуйте тест, чтобы выдать доступ студентам.'}
              {test.status === 'published' && 'Опубликованный тест можно выдавать студентам.'}
              {test.status === 'blocked' && 'Заблокированный тест недоступен для студентов.'}
            </p>
          </div>
        </div>

        <div className="questions-section">
          <h2>Вопросы теста</h2>
          <div className="questions-list">
            {test.questions?.map((question, index) => (
              <div key={question.id} className="question-detail-card">
                <div className="question-number">Вопрос {index + 1}</div>
                <div className="question-header">
                  <span className="question-type-badge">
                    {getQuestionTypeLabel(question.question_type)}
                  </span>
                  <span className="question-points">{question.points} баллов</span>
                </div>
                <div className="question-text">{question.question_text}</div>
                
                {/* Отображение вариантов в зависимости от типа */}
                {question.question_type === 'single_choice' && question.data?.options && (
                  <div className="question-options">
                    <strong>Варианты ответов:</strong>
                    <ul>
                      {question.data.options.map((option, idx) => (
                        <li key={option.id} className={question.data.correct?.includes(option.id) ? 'correct-option' : ''}>
                          {option.text}
                          {question.data.correct?.includes(option.id) && <span className="correct-mark"> ✓</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {question.question_type === 'multiple_choice' && question.data?.options && (
                  <div className="question-options">
                    <strong>Варианты ответов (с весами):</strong>
                    <ul>
                      {question.data.options.map((option) => (
                        <li key={option.id}>
                          {option.text} 
                          {option.weight > 0 && <span className="weight"> (вес: {option.weight})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {question.question_type === 'open' && question.data?.keywords && (
                  <div className="question-keywords">
                    <strong>Ключевые слова для проверки:</strong>
                    <div className="keywords-list">
                      {question.data.keywords.map((keyword, idx) => (
                        <span key={idx} className="keyword-badge">{keyword}</span>
                      ))}
                    </div>
                    {question.data.case_sensitive && (
                      <span className="case-sensitive">Регистр учитывается</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showGrantModal && (
        <GrantAccessModal
          students={students}
          onClose={() => setShowGrantModal(false)}
          onGrant={handleGrantAccess}
        />
      )}
    </div>
  );
};

export default TestDetailsPage;