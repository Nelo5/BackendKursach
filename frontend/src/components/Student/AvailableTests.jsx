import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import { attemptService } from '../../services/attempt.service';
import toast from 'react-hot-toast';

const AvailableTests = () => {
  const [tests, setTests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingTest, setStartingTest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTests();
    loadSubjects();
  }, [selectedSubject]);

  const loadTests = async () => {
    try {
      setLoading(true);
      const data = await testService.getAvailableTests(selectedSubject || null);
      setTests(data);
    } catch (error) {
      toast.error('Ошибка загрузки тестов');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await testService.getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to load subjects', error);
    }
  };

  const startTest = async (testId) => {
    setStartingTest(testId);
    try {
      const result = await attemptService.startAttempt(testId);
      if (result.attempt_id) {
        navigate(`/test/${testId}/take`, { state: { attemptId: result.attempt_id } });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка начала теста');
    } finally {
      setStartingTest(null);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'score-high';
    if (percentage >= 60) return 'score-medium';
    return 'score-low';
  };

  if (loading) {
    return <div className="loading">Загрузка тестов...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Доступные тесты</h2>
        
        <div className="filter-bar">
          <div className="form-group">
            <label>Фильтр по предмету</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Все предметы</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => setSelectedSubject('')}
          >
            Сбросить фильтр
          </button>
        </div>

        {tests.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>
            Нет доступных тестов
          </p>
        ) : (
          <div className="tests-grid">
            {tests.map(test => (
              <div key={test.id} className="card" style={{ marginBottom: '15px' }}>
                <h3>{test.title}</h3>
                <p><strong>Предмет:</strong> {test.subject}</p>
                <p><strong>Описание:</strong> {test.description || 'Нет описания'}</p>
                <p><strong>Максимальный балл:</strong> {test.max_score}</p>
                <p><strong>Версия:</strong> {test.version}</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => startTest(test.id)}
                  disabled={startingTest === test.id}
                  style={{ marginTop: '10px' }}
                >
                  {startingTest === test.id ? 'Загрузка...' : 'Начать тест'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableTests;