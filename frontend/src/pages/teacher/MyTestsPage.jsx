// src/pages/teacher/MyTestsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyTests, deleteTest } from '../../api/tests';

const MyTestsPage = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setLoading(true);
    const result = await getMyTests();
    if (result.success) {
      setTests(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот тест?')) {
      // Здесь нужен эндпоинт для удаления, если есть
      await loadTests();
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

  const filteredTests = tests.filter(t => 
    filterStatus === 'all' || t.status === filterStatus
  );

  if (loading) return <div className="loading">Загрузка тестов...</div>;

  return (
    <div className="my-tests-page">
      <div className="header">
        <h1>Мои тесты</h1>
        <Link to="/teacher/tests/create" className="btn-primary">
          + Создать тест
        </Link>
      </div>
      
      <div className="filters">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Все статусы</option>
          <option value="draft">Черновики</option>
          <option value="published">Опубликованные</option>
          <option value="blocked">Заблокированные</option>
        </select>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="tests-grid">
        {filteredTests.map(test => (
          <div key={test.id} className="test-card">
            <div className="test-header">
              <h3>{test.title}</h3>
              <span className={`status ${getStatusClass(test.status)}`}>
                {getStatusLabel(test.status)}
              </span>
            </div>
            
            <div className="test-info">
              <p><strong>Предмет:</strong> {test.subject}</p>
              <p><strong>Макс. балл:</strong> {test.max_score}</p>
              {test.description && <p>{test.description}</p>}
            </div>
            
            <div className="test-actions">
              <Link to={`/teacher/tests/${test.id}`} className="btn-view">
                Просмотр
              </Link>
              <Link to={`/teacher/tests/${test.id}/edit`} className="btn-edit">
                Редактировать
              </Link>
              <button onClick={() => handleDeleteTest(test.id)} className="btn-delete">
                Удалить
              </button>
              <Link to={`/teacher/tests/${test.id}/statistics`} className="btn-statistics">
                Статистика
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {filteredTests.length === 0 && (
        <div className="empty-state">
          <p>У вас пока нет тестов</p>
          <Link to="/teacher/tests/create" className="btn-primary">
            Создать первый тест
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyTestsPage;