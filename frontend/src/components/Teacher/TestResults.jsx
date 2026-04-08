import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import { testService } from '../../services/test.service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

const TestResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAttempts, setStudentAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);

  useEffect(() => {
    loadSummary();
    loadTestInfo();
  }, [testId]);

  const loadTestInfo = async () => {
    try {
      const data = await testService.getTestDetails(testId);
      setTest(data);
    } catch (error) {
      console.error('Failed to load test info', error);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await attemptService.getTestAttemptsSummary(testId);
      setSummary(data);
      // Extract unique students
      const uniqueStudents = {};
      data.attempts.forEach(attempt => {
        if (!uniqueStudents[attempt.student_id]) {
          uniqueStudents[attempt.student_id] = {
            id: attempt.student_id,
            name: attempt.student_name,
            attempts: []
          };
        }
        uniqueStudents[attempt.student_id].attempts.push(attempt);
      });
      setStudents(Object.values(uniqueStudents));
    } catch (error) {
      toast.error('Ошибка загрузки результатов');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentAttempts = async (studentId) => {
    try {
      const data = await attemptService.getStudentTestAttempts(studentId, testId);
      setStudentAttempts(data.attempts);
      setSelectedStudent({ id: studentId, name: data.student_name || `Студент ${studentId}` });
    } catch (error) {
      toast.error('Ошибка загрузки попыток студента');
    }
  };

  const viewAttemptDetail = (attemptId) => {
    navigate(`/teacher/attempt/${attemptId}`);
  };

  const getScoreClass = (percentage) => {
    if (percentage >= 80) return 'score-high';
    if (percentage >= 60) return 'score-medium';
    return 'score-low';
  };

  if (loading) {
    return <div className="loading">Загрузка результатов...</div>;
  }

  if (!summary) {
    return <div className="loading">Нет данных</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Результаты теста: {test?.title || `Тест #${testId}`}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3>Всего попыток</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.total_attempts}</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3>Средний балл</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.average_score}</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3>Лучший результат</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>{summary.highest_score}</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3>Худший результат</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#e53e3e' }}>{summary.lowest_score}</p>
          </div>
        </div>

        <h3>Список студентов</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Студент</th>
              <th>Попыток</th>
              <th>Лучший результат</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const bestAttempt = student.attempts.reduce((best, current) => 
                (current.score > best.score) ? current : best, student.attempts[0]
              );
              return (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.attempts.length}</td>
                  <td>{bestAttempt.score} / {bestAttempt.max_possible_score}</td>
                  <td>
                    <button 
                      className="btn btn-primary"
                      onClick={() => loadStudentAttempts(student.id)}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Подробнее
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedStudent && studentAttempts.length > 0 && (
        <div className="card">
          <h3>Попытки студента: {selectedStudent.name}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>№ попытки</th>
                <th>Дата</th>
                <th>Результат</th>
                <th>Процент</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {studentAttempts.map(attempt => (
                <tr key={attempt.attempt_id}>
                  <td>{attempt.attempt_number}</td>
                  <td>{format(new Date(attempt.completed_at), 'dd.MM.yyyy HH:mm')}</td>
                  <td>{attempt.score} / {attempt.max_possible_score}</td>
                  <td>
                    <span className={`score-badge ${getScoreClass(attempt.percentage)}`}>
                      {attempt.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-primary"
                      onClick={() => viewAttemptDetail(attempt.attempt_id)}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Детали
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestResults;