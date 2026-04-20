// src/pages/teacher/EditTestPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TestForm from '../../components/teacher/TestForm';
import { getTestDetails, updateTest } from '../../api/tests';

const EditTestPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    setLoading(true);
    const result = await getTestDetails(testId);
    if (result.success) {
      // Преобразуем данные для формы
      const testData = {
        title: result.data.title,
        subject: result.data.subject,
        description: result.data.description,
        max_score: result.data.max_score,
        question_ids: result.data.questions?.map(q => q.id) || []
      };
      setTest(testData);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleSubmit = async (testData) => {
    setIsSubmitting(true);
    const result = await updateTest(testId, testData);
    setIsSubmitting(false);
    
    if (result.success) {
      navigate(`/teacher/tests/${testId}`);
    } else {
      alert(result.error);
    }
  };

  if (loading) return <div className="loading">Загрузка теста...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page-container">
      <div className="header">
        <button onClick={() => navigate(`/teacher/tests/${testId}`)} className="btn-back">
          ← Назад к тесту
        </button>
      </div>
      <TestForm 
        initialData={test} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
};

export default EditTestPage;