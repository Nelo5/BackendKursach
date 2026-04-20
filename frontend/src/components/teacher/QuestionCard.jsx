// src/components/teacher/QuestionCard.jsx
import React from 'react';

const QuestionCard = ({ question, onEdit, onDelete }) => {
  const getTypeLabel = (type) => {
    switch(type) {
      case 'single_choice': return 'Одиночный выбор';
      case 'multiple_choice': return 'Множественный выбор';
      case 'open': return 'Открытый вопрос';
      default: return type;
    }
  };

  // Отображение превью вариантов ответа
  const renderOptionsPreview = () => {
    if (!question.data?.options) return null;
    
    const options = question.data.options;
    const maxDisplay = 3; // показываем максимум 3 варианта
    const previewOptions = options.slice(0, maxDisplay);
    const hasMore = options.length > maxDisplay;

    if (question.question_type === 'single_choice') {
      const correctId = question.data.correct?.[0];
      return (
        <div className="options-preview">
          <strong>Варианты:</strong>
          <ul className="options-list">
            {previewOptions.map(opt => (
              <li key={opt.id} className={opt.id === correctId ? 'correct-option' : ''}>
                {opt.text}
                {opt.id === correctId && <span className="correct-mark"> ✓</span>}
              </li>
            ))}
            {hasMore && <li className="more-options">+ ещё {options.length - maxDisplay}</li>}
          </ul>
        </div>
      );
    }
    
    if (question.question_type === 'multiple_choice') {
      // Для множественного выбора показываем варианты с весами (если вес > 0)
      return (
        <div className="options-preview">
          <strong>Варианты:</strong>
          <ul className="options-list">
            {previewOptions.map(opt => (
              <li key={opt.id}>
                {opt.text}
                {opt.weight > 0 && <span className="weight-hint"> (вес: {opt.weight})</span>}
              </li>
            ))}
            {hasMore && <li className="more-options">+ ещё {options.length - maxDisplay}</li>}
          </ul>
        </div>
      );
    }
    
    return null;
  };

  const getPreview = () => {
    if (question.question_type === 'open') {
      const keywords = question.data?.keywords || [];
      const previewKeywords = keywords.slice(0, 3);
      const hasMore = keywords.length > 3;
      return (
        <div className="keywords-preview">
          <strong>Ключевые слова:</strong>{' '}
          {previewKeywords.join(', ')}
          {hasMore && ` + ещё ${keywords.length - 3}`}
        </div>
      );
    }
    return renderOptionsPreview();
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <span className="subject">{question.subject}</span>
        <span className="question-type">{getTypeLabel(question.question_type)}</span>
        <span className="points">{question.points} баллов</span>
      </div>
      
      <div className="question-text">
        {question.question_text}
      </div>
      
      <div className="question-preview">
        {getPreview()}
      </div>
      
      <div className="question-actions">
        <button onClick={onEdit} className="btn-edit">Редактировать</button>
        <button onClick={onDelete} className="btn-delete">Удалить</button>
      </div>
    </div>
  );
};

export default QuestionCard;