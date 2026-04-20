// src/pages/student/AvailableTestsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableTests, startAttempt, getUniqueSubjects } from '../../api/attempts';

const AvailableTestsPage = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [startingTest, setStartingTest] = useState(null);

  useEffect(() => {
    loadTests();
    loadSubjects();
  }, [selectedSubject]);

  const loadTests = async () => {
    setLoading(true);
    const result = await getAvailableTests(selectedSubject || null);
    if (result.success) {
      setTests(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const loadSubjects = async () => {
    const result = await getUniqueSubjects();
    if (result.success) {
      setSubjects(result.data);
    }
  };

  const handleStartTest = async (testId) => {
    setStartingTest(testId);
    const result = await startAttempt(testId);
    if (result.success) {
      // После успешного начала, перенаправляем на страницу прохождения
      navigate(`/student/attempt/${result.data.attempt_id}`);
    } else {
      alert(result.error);
    }
    setStartingTest(null);
  };

  if (loading) return <div className="loading">Загрузка тестов...</div>;

  return (
    <div className="available-tests-page">
      <div className="header">
        <h1>Доступные тесты</h1>
      </div>

      <div className="filters">
        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="subject-filter"
        >
          <option value="">Все предметы</option>
          {subjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tests-grid">
        {tests.length === 0 && (
          <div className="empty-state">
            <p>Нет доступных тестов</p>
          </div>
        )}
        {tests.map(test => (
          <div key={test.id} className="test-card">
            <div className="test-header">
              <h3>{test.title}</h3>
              <span className="subject-badge">{test.subject}</span>
            </div>
            
            {test.description && (
              <p className="test-description">{test.description}</p>
            )}
            
            <div className="test-info">
              <div className="info-item">
                <span className="label">Максимальный балл:</span>
                <span className="value">{test.max_score}</span>
              </div>
            </div>
            
            <button 
              onClick={() => handleStartTest(test.id)}
              disabled={startingTest === test.id}
              className="start-btn"
            >
              {startingTest === test.id ? 'Запуск...' : 'Начать тест'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailableTestsPage;