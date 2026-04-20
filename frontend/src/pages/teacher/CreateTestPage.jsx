// src/pages/teacher/CreateTestPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import TestForm from '../../components/teacher/TestForm';
import { createTest } from '../../api/tests';

const CreateTestPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (testData) => {
    setIsSubmitting(true);
    const result = await createTest(testData);
    setIsSubmitting(false);
    
    if (result.success) {
      navigate('/teacher/tests');
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="page-container">
      <TestForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
};

export default CreateTestPage;