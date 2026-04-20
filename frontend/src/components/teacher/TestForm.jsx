// src/components/teacher/TestForm.jsx
import React, { useState, useEffect } from 'react';
import { getQuestions, createQuestion } from '../../api/questions';
import QuestionFormModal from './QuestionFormModal';

const TestForm = ({ initialData, onSubmit, isSubmitting }) => {
  const [testData, setTestData] = useState(initialData || {
    title: '',
    subject: '',
    description: '',
    max_score: 100,
    question_ids: []
  });
  
  const [allQuestions, setAllQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' or 'new'

  useEffect(() => {
    loadQuestions();
  }, []);

  // Автоматически обновляем фильтр предмета при изменении subject теста
  useEffect(() => {
    if (testData.subject) {
      setFilterSubject(testData.subject);
    }
  }, [testData.subject]);

  const loadQuestions = async () => {
    const result = await getQuestions();
    if (result.success) {
      setAllQuestions(result.data);
    }
  };

  const handleAddQuestion = (questionId) => {
    if (!testData.question_ids.includes(questionId)) {
      setTestData({
        ...testData,
        question_ids: [...testData.question_ids, questionId]
      });
    }
  };

  const handleRemoveQuestion = (questionId) => {
    setTestData({
      ...testData,
      question_ids: testData.question_ids.filter(id => id !== questionId)
    });
  };

  const handleCreateNewQuestion = async (questionData) => {
    setCreatingQuestion(true);
    
    // Автоматически устанавливаем subject из теста
    const questionToCreate = {
      ...questionData,
      subject: testData.subject // Важно: берем subject из теста
    };
    
    const result = await createQuestion(questionToCreate);
    
    if (result.success) {
      // Добавляем новый вопрос в список всех вопросов
      setAllQuestions(prev => [...prev, result.data]);
      // Автоматически добавляем вопрос в тест
      setTestData({
        ...testData,
        question_ids: [...testData.question_ids, result.data.id]
      });
      setShowNewQuestionModal(false);
      alert('Вопрос успешно создан и добавлен в тест!');
    } else {
      alert(result.error || 'Ошибка при создании вопроса');
    }
    
    setCreatingQuestion(false);
  };

  const getTotalScore = () => {
    const selectedQuestions = allQuestions.filter(q => testData.question_ids.includes(q.id));
    return selectedQuestions.reduce((sum, q) => sum + q.points, 0);
  };

  const validate = () => {
    const newErrors = {};
    if (!testData.title) newErrors.title = 'Название обязательно';
    if (!testData.subject) newErrors.subject = 'Предмет обязателен';
    if (testData.question_ids.length === 0) newErrors.question_ids = 'Добавьте хотя бы один вопрос';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(testData);
    }
  };

  const filteredQuestions = allQuestions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !filterSubject || q.subject === filterSubject;
    const notSelected = !testData.question_ids.includes(q.id);
    return matchesSearch && matchesSubject && notSelected;
  });

  const subjects = [...new Set(allQuestions.map(q => q.subject))];
  const selectedQuestions = allQuestions.filter(q => testData.question_ids.includes(q.id));

  return (
    <form onSubmit={handleSubmit} className="test-form">
      <h3>{initialData ? 'Редактировать тест' : 'Создать новый тест'}</h3>
      
      <div className="form-group">
        <label>Название теста:</label>
        <input
          type="text"
          value={testData.title}
          onChange={(e) => setTestData({...testData, title: e.target.value})}
          placeholder="Введите название"
        />
        {errors.title && <span className="error">{errors.title}</span>}
      </div>
      
      <div className="form-group">
        <label>Предмет:</label>
        <input
          type="text"
          value={testData.subject}
          onChange={(e) => setTestData({...testData, subject: e.target.value})}
          placeholder="Например: Математика"
        />
        <small className="hint">Предмет будет автоматически присвоен всем новым вопросам</small>
        {errors.subject && <span className="error">{errors.subject}</span>}
      </div>
      
      <div className="form-group">
        <label>Описание:</label>
        <textarea
          value={testData.description || ''}
          onChange={(e) => setTestData({...testData, description: e.target.value})}
          rows="3"
          placeholder="Описание теста (необязательно)"
        />
      </div>
      
      <div className="form-group">
        <label>Максимальный балл:</label>
        <input
          type="number"
          step="0.5"
          value={testData.max_score}
          onChange={(e) => setTestData({...testData, max_score: parseFloat(e.target.value)})}
        />
        <small className="hint">Текущая сумма баллов вопросов: <strong>{getTotalScore()}</strong></small>
      </div>
      
      <div className="questions-selection">
        <div className="tab-header">
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing')}
          >
            Выбрать из существующих вопросов
          </button>
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            Создать новый вопрос
          </button>
        </div>
        
        {/* Вкладка с существующими вопросами */}
        {activeTab === 'existing' && (
          <div className="existing-questions-tab">
            <div className="selected-questions">
              <h4>Выбранные вопросы ({testData.question_ids.length})</h4>
              {testData.question_ids.length === 0 && (
                <p className="empty">Нет выбранных вопросов</p>
              )}
              {selectedQuestions.map(question => (
                <div key={question.id} className="selected-question">
                  <div className="selected-question-info">
                    <span className="question-text-preview">{question.question_text}</span>
                    <span className="question-points-preview">{question.points} баллов</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveQuestion(question.id)}>×</button>
                </div>
              ))}
              {errors.question_ids && <span className="error">{errors.question_ids}</span>}
            </div>
            
            <div className="available-questions">
              <h4>Доступные вопросы банка</h4>
              <div className="filters">
                <input
                  type="text"
                  placeholder="Поиск по вопросу..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                  <option value="">Все предметы</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="questions-list">
                {filteredQuestions.length === 0 && (
                  <p className="empty">Нет доступных вопросов. Попробуйте создать новый вопрос!</p>
                )}
                {filteredQuestions.map(question => (
                  <div key={question.id} className="question-item">
                    <div className="question-info">
                      <div className="question-text">{question.question_text}</div>
                      <div className="question-meta">
                        <span className="subject-tag">{question.subject}</span>
                        <span className="type-tag">
                          {question.question_type === 'single_choice' && 'Одиночный выбор'}
                          {question.question_type === 'multiple_choice' && 'Множественный выбор'}
                          {question.question_type === 'open' && 'Открытый вопрос'}
                        </span>
                        <span className="points-tag">{question.points} баллов</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleAddQuestion(question.id)}
                      className="add-btn"
                    >
                      Добавить
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Вкладка создания нового вопроса */}
        {activeTab === 'new' && (
          <div className="new-question-tab">
            {!testData.subject && (
              <div className="warning-message">
                ⚠️ Сначала заполните поле "Предмет" для теста. Subject нового вопроса будет автоматически взят из него.
              </div>
            )}
            <button 
              type="button"
              onClick={() => setShowNewQuestionModal(true)}
              disabled={!testData.subject}
              className="create-question-btn"
            >
              + Создать новый вопрос для предмета "{testData.subject || 'укажите предмет'}"
            </button>
            
            {selectedQuestions.length > 0 && (
              <div className="preview-selected">
                <h4>Вопросы в тесте ({selectedQuestions.length})</h4>
                {selectedQuestions.map(question => (
                  <div key={question.id} className="preview-question-item">
                    <span>{question.question_text}</span>
                    <span className="points">{question.points} баллов</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : (initialData ? 'Обновить тест' : 'Создать тест')}
        </button>
      </div>
      
      {/* Модальное окно создания вопроса */}
      {showNewQuestionModal && (
        <QuestionFormModal
          subject={testData.subject}
          onClose={() => setShowNewQuestionModal(false)}
          onSubmit={handleCreateNewQuestion}
          isSubmitting={creatingQuestion}
        />
      )}
    </form>
  );
};

export default TestForm;