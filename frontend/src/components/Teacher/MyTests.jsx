import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';

const MyTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const data = await testService.getMyTestsWithStats();
      setTests(data);
    } catch (error) {
      toast.error('Ошибка загрузки тестов');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const allUsers = await adminService.getUsers();
      const studentsList = allUsers.filter(user => user.role === 'student' && user.status === 'active');
      setStudents(studentsList);
    } catch (error) {
      toast.error('Ошибка загрузки студентов');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleStatusChange = async (testId, currentStatus) => {
    const newStatus = currentStatus === 'draft' ? 'published' : 'draft';
    try {
      await testService.updateTestStatus(testId, newStatus);
      toast.success(`Тест ${newStatus === 'published' ? 'опубликован' : 'переведен в черновик'}`);
      loadTests();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    }
  };

  const handleEdit = (testId) => {
    navigate(`/teacher/edit-test/${testId}`);
  };

  const handleViewResults = (testId) => {
    navigate(`/teacher/test/${testId}/results`);
  };

  const handleManageAccess = async (test) => {
    setSelectedTest(test);
    await loadStudents();
    setShowAccessModal(true);
  };

  const handleGrantAccess = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Выберите хотя бы одного студента');
      return;
    }

    try {
      await testService.grantAccess(selectedTest.test_id, selectedStudents);
      toast.success(`Доступ предоставлен ${selectedStudents.length} студентам`);
      setShowAccessModal(false);
      setSelectedStudents([]);
    } catch (error) {
      toast.error('Ошибка предоставления доступа');
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'published':
        return <span style={{ background: '#48bb78', color: 'white', padding: '3px 8px', borderRadius: '3px', fontSize: '12px' }}>Опубликован</span>;
      case 'draft':
        return <span style={{ background: '#ed8936', color: 'white', padding: '3px 8px', borderRadius: '3px', fontSize: '12px' }}>Черновик</span>;
      case 'blocked':
        return <span style={{ background: '#e53e3e', color: 'white', padding: '3px 8px', borderRadius: '3px', fontSize: '12px' }}>Заблокирован</span>;
      default:
        return <span>{status}</span>;
    }
  };

  if (loading) {
    return <div className="loading">Загрузка тестов...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Мои тесты</h2>
        
        {tests.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px' }}>
            У вас пока нет созданных тестов
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Предмет</th>
                <th>Версия</th>
                <th>Статус</th>
                <th>Попыток</th>
                <th>Студентов</th>
                <th>Ср. балл</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.test_id}>
                  <td>{test.title}</td>
                  <td>{test.subject}</td>
                  <td>v{test.version}</td>
                  <td>{getStatusBadge(test.status)}</td>
                  <td>{test.total_attempts}</td>
                  <td>{test.unique_students}</td>
                  <td>{test.average_score}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleEdit(test.test_id)}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Редактировать
                      </button>
                      <button 
                        className="btn btn-success" 
                        onClick={() => handleViewResults(test.test_id)}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Результаты
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleStatusChange(test.test_id, test.status)}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        {test.status === 'draft' ? 'Опубликовать' : 'В черновик'}
                      </button>
                      <button 
                        className="btn btn-info" 
                        onClick={() => handleManageAccess(test)}
                        style={{ padding: '5px 10px', fontSize: '12px', background: '#4299e1', color: 'white' }}
                      >
                        Доступ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal для управления доступом */}
      {showAccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3>Предоставить доступ к тесту</h3>
            <p><strong>Тест:</strong> {selectedTest?.title}</p>
            
            <div className="form-group">
              <label>Выберите студентов:</label>
              {loadingStudents ? (
                <p>Загрузка студентов...</p>
              ) : students.length === 0 ? (
                <p>Нет активных студентов</p>
              ) : (
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {students.map(student => (
                    <label key={student.id} style={{ display: 'block', marginBottom: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        style={{ marginRight: '10px' }}
                      />
                      {student.username}
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAccessModal(false);
                  setSelectedStudents([]);
                }}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleGrantAccess}
                disabled={selectedStudents.length === 0}
              >
                Предоставить доступ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTests;