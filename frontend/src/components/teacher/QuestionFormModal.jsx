// src/components/teacher/QuestionFormModal.jsx
import React, { useState, useEffect } from 'react';

const QuestionFormModal = ({ 
  subject: presetSubject,   // опционально – если передан, поле subject disabled
  initialData,              // опционально – данные для редактирования
  onClose, 
  onSubmit, 
  isSubmitting 
}) => {
  // Вспомогательная функция для создания структуры data по типу вопроса
  const getDefaultDataForType = (type, oldData = {}) => {
    switch(type) {
      case 'single_choice':
        return { options: [{ id: Date.now(), text: '' }], correct: [], ...oldData };
      case 'multiple_choice':
        return { options: [{ id: Date.now(), text: '', weight: 0 }], ...oldData };
      case 'open':
        return { keywords: [], case_sensitive: false, ...oldData };
      default:
        return {};
    }
  };

  // Инициализация данных формы
  const getInitialData = () => {
    if (initialData) {
      // Режим редактирования – сохраняем существующие данные
      return {
        subject: initialData.subject || '',
        question_text: initialData.question_text || '',
        question_type: initialData.question_type || 'single_choice',
        points: initialData.points || 1,
        data: initialData.data || {}
      };
    }
    // Режим создания – создаём пустую структуру с дефолтным типом
    const defaultType = 'single_choice';
    return {
      subject: presetSubject || '',
      question_text: '',
      question_type: defaultType,
      points: 1,
      data: getDefaultDataForType(defaultType)   // ← ключевое исправление
    };
  };

  const [questionData, setQuestionData] = useState(getInitialData());
  const [errors, setErrors] = useState({});

  // При изменении presetSubject или initialData обновляем форму
  useEffect(() => {
    setQuestionData(getInitialData());
  }, [presetSubject, initialData]);

  const handleTypeChange = (type) => {
    setQuestionData({
      ...questionData,
      question_type: type,
      data: getDefaultDataForType(type, questionData.data)
    });
  };

  const handleAddOption = () => {
    if (questionData.question_type === 'single_choice') {
      setQuestionData({
        ...questionData,
        data: {
          ...questionData.data,
          options: [...questionData.data.options, { id: Date.now(), text: '' }]
        }
      });
    } else if (questionData.question_type === 'multiple_choice') {
      setQuestionData({
        ...questionData,
        data: {
          ...questionData.data,
          options: [...questionData.data.options, { id: Date.now(), text: '', weight: 0 }]
        }
      });
    }
  };

  const handleRemoveOption = (optionId) => {
    setQuestionData({
      ...questionData,
      data: {
        ...questionData.data,
        options: questionData.data.options.filter(opt => opt.id !== optionId)
      }
    });
  };

  const handleOptionChange = (optionId, field, value) => {
    setQuestionData({
      ...questionData,
      data: {
        ...questionData.data,
        options: questionData.data.options.map(opt =>
          opt.id === optionId ? { ...opt, [field]: value } : opt
        )
      }
    });
  };

  const handleCorrectChange = (optionId) => {
    if (questionData.question_type === 'single_choice') {
      setQuestionData({
        ...questionData,
        data: {
          ...questionData.data,
          correct: [optionId]
        }
      });
    }
  };

  const handleKeywordAdd = (keyword) => {
    if (keyword.trim()) {
      setQuestionData({
        ...questionData,
        data: {
          ...questionData.data,
          keywords: [...questionData.data.keywords, keyword.trim()]
        }
      });
    }
  };

  const handleKeywordRemove = (index) => {
    setQuestionData({
      ...questionData,
      data: {
        ...questionData.data,
        keywords: questionData.data.keywords.filter((_, i) => i !== index)
      }
    });
  };

  const validate = () => {
    const newErrors = {};
    
    if (!questionData.subject) newErrors.subject = 'Предмет обязателен';
    if (!questionData.question_text) newErrors.question_text = 'Текст вопроса обязателен';
    if (questionData.points <= 0) newErrors.points = 'Баллы должны быть больше 0';
    
    if (questionData.question_type === 'single_choice') {
      if (!questionData.data.options?.length) {
        newErrors.options = 'Добавьте хотя бы один вариант';
      } else if (!questionData.data.correct?.length) {
        newErrors.correct = 'Выберите правильный ответ';
      } else if (questionData.data.options.some(opt => !opt.text.trim())) {
        newErrors.options = 'Заполните текст всех вариантов';
      }
    } else if (questionData.question_type === 'multiple_choice') {
      if (!questionData.data.options?.length) {
        newErrors.options = 'Добавьте хотя бы один вариант';
      } else if (questionData.data.options.some(opt => !opt.text.trim())) {
        newErrors.options = 'Заполните текст всех вариантов';
      }
    } else if (questionData.question_type === 'open') {
      if (!questionData.data.keywords?.length) {
        newErrors.keywords = 'Добавьте хотя бы одно ключевое слово';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(questionData);
    }
  };

  const isEditing = !!initialData;
  const isSubjectLocked = !!presetSubject && !isEditing;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Редактировать вопрос' : 'Создание нового вопроса'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="question-form-modal">
            <div className="form-group">
              <label>Предмет:</label>
              <input
                type="text"
                value={questionData.subject}
                onChange={(e) => setQuestionData({...questionData, subject: e.target.value})}
                disabled={isSubjectLocked}
                className={isSubjectLocked ? 'disabled-input' : ''}
              />
              {isSubjectLocked && <small className="hint">Subject автоматически взят из теста</small>}
              {errors.subject && <span className="error">{errors.subject}</span>}
            </div>
            
            <div className="form-group">
              <label>Текст вопроса:</label>
              <textarea
                value={questionData.question_text}
                onChange={(e) => setQuestionData({...questionData, question_text: e.target.value})}
                rows="3"
                placeholder="Введите текст вопроса"
                required
              />
              {errors.question_text && <span className="error">{errors.question_text}</span>}
            </div>
            
            <div className="form-group">
              <label>Тип вопроса:</label>
              <select
                value={questionData.question_type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="single_choice">Одиночный выбор</option>
                <option value="multiple_choice">Множественный выбор</option>
                <option value="open">Открытый вопрос</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Баллы:</label>
              <input
                type="number"
                step="0.5"
                value={questionData.points}
                onChange={(e) => setQuestionData({...questionData, points: parseFloat(e.target.value)})}
              />
              {errors.points && <span className="error">{errors.points}</span>}
            </div>
            
            {/* Single Choice */}
            {questionData.question_type === 'single_choice' && (
              <div className="options-section">
                <label>Варианты ответов:</label>
                {questionData.data.options?.map((option) => (
                  <div key={option.id} className="option-item">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(option.id, 'text', e.target.value)}
                      placeholder="Вариант ответа"
                      className="flex-1"
                    />
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="correct"
                        checked={questionData.data.correct?.[0] === option.id}
                        onChange={() => handleCorrectChange(option.id)}
                      />
                      Правильный
                    </label>
                    <button type="button" onClick={() => handleRemoveOption(option.id)} className="remove-btn">×</button>
                  </div>
                ))}
                <button type="button" onClick={handleAddOption} className="add-option-btn">
                  + Добавить вариант
                </button>
                {errors.options && <span className="error">{errors.options}</span>}
                {errors.correct && <span className="error">{errors.correct}</span>}
              </div>
            )}
            
            {/* Multiple Choice */}
            {questionData.question_type === 'multiple_choice' && (
              <div className="options-section">
                <label>Варианты ответов (с весами):</label>
                {questionData.data.options?.map((option) => (
                  <div key={option.id} className="option-item">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(option.id, 'text', e.target.value)}
                      placeholder="Вариант ответа"
                      className="flex-1"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={option.weight}
                      onChange={(e) => handleOptionChange(option.id, 'weight', parseFloat(e.target.value))}
                      placeholder="Вес"
                      className="weight-input"
                    />
                    <button type="button" onClick={() => handleRemoveOption(option.id)} className="remove-btn">×</button>
                  </div>
                ))}
                <button type="button" onClick={handleAddOption} className="add-option-btn">
                  + Добавить вариант
                </button>
                <small className="hint">Вес определяет, сколько баллов получит студент за выбор этого варианта</small>
                {errors.options && <span className="error">{errors.options}</span>}
              </div>
            )}
            
            {/* Open Question */}
            {questionData.question_type === 'open' && (
              <div className="keywords-section">
                <label>Ключевые слова:</label>
                <div className="keywords-list">
                  {questionData.data.keywords?.map((keyword, idx) => (
                    <span key={idx} className="keyword-tag">
                      {keyword}
                      <button type="button" onClick={() => handleKeywordRemove(idx)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="keyword-input">
                  <input
                    type="text"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleKeywordAdd(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    placeholder="Введите ключевое слово и нажмите Enter"
                  />
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={questionData.data.case_sensitive || false}
                    onChange={(e) => setQuestionData({
                      ...questionData,
                      data: {...questionData.data, case_sensitive: e.target.checked}
                    })}
                  />
                  Учитывать регистр
                </label>
                {errors.keywords && <span className="error">{errors.keywords}</span>}
              </div>
            )}
          </form>
        </div>
        
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-cancel">Отмена</button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn-submit">
            {isSubmitting ? 'Сохранение...' : (isEditing ? 'Обновить' : 'Создать')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionFormModal;