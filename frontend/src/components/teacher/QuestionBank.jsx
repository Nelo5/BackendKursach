// src/components/teacher/QuestionBank.jsx
import React, { useState, useEffect } from 'react';
import { getQuestions, deleteQuestion, createQuestion, updateQuestion } from '../../api/questions';
import QuestionCard from './QuestionCard';
import QuestionFormModal from './QuestionFormModal'; // импортируем новую модалку

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    const result = await getQuestions();
    if (result.success) {
      setQuestions(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleCreateQuestion = async (questionData) => {
    setIsSubmitting(true);
    const result = await createQuestion(questionData);
    if (result.success) {
      await loadQuestions();
      setShowModal(false);
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  const handleUpdateQuestion = async (questionData) => {
    setIsSubmitting(true);
    const result = await updateQuestion(editingQuestion.id, questionData);
    if (result.success) {
      await loadQuestions();
      setEditingQuestion(null);
      setShowModal(false);
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот вопрос?')) {
      const result = await deleteQuestion(questionId);
      if (result.success) {
        await loadQuestions();
      } else {
        setError(result.error);
      }
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesType = filterType === 'all' || q.question_type === filterType;
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) return <div className="loading">Загрузка вопросов...</div>;

  return (
    <div className="question-bank">
      <div className="header">
        <h2>Банк вопросов</h2>
        <button onClick={() => {
          setEditingQuestion(null);
          setShowModal(true);
        }} className="btn-primary">
          + Создать вопрос
        </button>
      </div>
      
      <div className="filters">
        <input
          type="text"
          placeholder="Поиск по вопросу или предмету..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Все типы</option>
          <option value="single_choice">Одиночный выбор</option>
          <option value="multiple_choice">Множественный выбор</option>
          <option value="open">Открытые</option>
        </select>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="questions-grid">
        {filteredQuestions.map(question => (
          <QuestionCard
            key={question.id}
            question={question}
            onEdit={() => {
              setEditingQuestion(question);
              setShowModal(true);
            }}
            onDelete={() => handleDeleteQuestion(question.id)}
          />
        ))}
      </div>
      
      {showModal && (
        <QuestionFormModal
          subject={null} // в банке вопросов нет предзаполненного subject
          initialData={editingQuestion}
          onClose={() => {
            setShowModal(false);
            setEditingQuestion(null);
          }}
          onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default QuestionBank;