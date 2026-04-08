import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { testService } from '../../services/test.service';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BlockedTests = () => {
  const [tests, setTests] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'blocked', 'published'
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadAllTests();
  }, []);

  const loadAllTests = async () => {
    try {
      // Загружаем все тесты (нужен новый эндпоинт или загружаем через преподавателя)
      // Для админа нужно загрузить все тесты. Пока используем загрузку заблокированных
      const blockedData = await adminService.getBlockedTests();
      setTests(blockedData);
      setAllTests(blockedData);
    } catch (error) {
      toast.error('Ошибка загрузки тестов');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (testId) => {
    if (!window.confirm('Вы уверены, что хотите заблокировать этот тест?')) {
      return;
    }
    
    setActionInProgress(testId);
    try {
      await adminService.blockTest(testId);
      toast.success('Тест заблокирован');
      loadAllTests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка блокировки теста');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnblock = async (testId) => {
    if (!window.confirm('Вы уверены, что хотите разблокировать этот тест?')) {
      return;
    }
    
    setActionInProgress(testId);
    try {
      await adminService.unblockTest(testId);
      toast.success('Тест разблокирован');
      loadAllTests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка разблокировки теста');
    } finally {
      setActionInProgress(null);
    }
  };

  const getFilteredTests = () => {
    if (filter === 'blocked') {
      return tests.filter(t => t.status === 'blocked');
    } else if (filter === 'published') {
      return tests.filter(t => t.status === 'published');
    }
    return tests;
  };

  if (loading) {
    return <div className="loading">Загрузка тестов...</div>;
  }

  const filteredTests = getFilteredTests();

  return (
    <div className="container">
      <div className="card">
        <h2>Управление блокировкой тестов</h2>
        
        <div className="filter-bar">
          <div className="form-group">
            <label>Фильтр по статусу</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Все тесты</option>
              <option value="published">Опубликованные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={loadAllTests}>
            Обновить
          </button>
        </div>

        {filteredTests.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>
            Нет тестов для отображения
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Предмет</th>
                <th>Автор</th>
                <th>Версия</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map(test => (
                <tr key={test.id}>
                  <td>{test.id}</td>
                  <td>{test.title}</td>
                  <td>{test.subject}</td>
                  <td>{test.author_id}</td>
                  <td>v{test.version}</td>
                  <td>
                    <span style={{
                      background: test.status === 'blocked' ? '#e53e3e' : '#48bb78',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}>
                      {test.status === 'blocked' ? 'Заблокирован' : 'Опубликован'}
                    </span>
                  </td>
                  <td>
                    {test.status === 'blocked' ? (
                      <button
                        className="btn btn-success"
                        onClick={() => handleUnblock(test.id)}
                        disabled={actionInProgress === test.id}
                        style={{ padding: '5px 15px' }}
                      >
                        {actionInProgress === test.id ? '...' : 'Разблокировать'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleBlock(test.id)}
                        disabled={actionInProgress === test.id}
                        style={{ padding: '5px 15px' }}
                      >
                        {actionInProgress === test.id ? '...' : 'Заблокировать'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BlockedTests;