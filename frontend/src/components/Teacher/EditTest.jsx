import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import toast from 'react-hot-toast';

const EditTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    try {
      const data = await testService.getTestDetails(testId);
      setTestData(data);
    } catch (error) {
      toast.error('Ошибка загрузки теста');
      navigate('/teacher/tests');
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...testData.questions];
    newQuestions[index][field] = value;
    setTestData({ ...testData, questions: newQuestions });
  };

  const updateClosedOption = (qIndex, optIndex, value) => {
    const newQuestions = [...testData.questions];
    newQuestions[qIndex].closed_question_data.options[optIndex] = value;
    setTestData({ ...testData, questions: newQuestions });
  };

  const toggleCorrectOption = (qIndex, optIndex) => {
    const newQuestions = [...testData.questions];
    const question = newQuestions[qIndex];
    const isMultiple = question.closed_question_data.correct.length > 1;
    
    if (isMultiple) {
      if (question.closed_question_data.correct.includes(optIndex)) {
        question.closed_question_data.correct = question.closed_question_data.correct.filter(i => i !== optIndex);
      } else {
        question.closed_question_data.correct.push(optIndex);
      }
    } else {
      question.closed_question_data.correct = [optIndex];
    }
    
    setTestData({ ...testData, questions: newQuestions });
  };

  const updateKeyword = (qIndex, kwIndex, value) => {
    const newQuestions = [...testData.questions];
    newQuestions[qIndex].open_question_data.keywords[kwIndex] = value;
    setTestData({ ...testData, questions: newQuestions });
  };

  const handleSubmit = async () => {
    const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints !== testData.max_score) {
      toast.error(`Сумма баллов вопросов (${totalPoints}) не равна максимальному баллу теста (${testData.max_score})`);
      return;
    }
    
    setSaving(true);
    try {
      await testService.updateTest(testId, testData);
      toast.success('Тест успешно обновлен!');
      navigate('/teacher/tests');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления теста');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка теста...</div>;
  }

  if (!testData) {
    return <div className="loading">Тест не найден</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Редактирование теста</h2>
        
        <div className="form-group">
          <label>Название теста</label>
          <input
            type="text"
            value={testData.title}
            onChange={(e) => setTestData({ ...testData, title: e.target.value })}
          />
        </div>
        
        <div className="form-group">
          <label>Предмет</label>
          <input
            type="text"
            value={testData.subject}
            onChange={(e) => setTestData({ ...testData, subject: e.target.value })}
          />
        </div>
        
        <div className="form-group">
          <label>Описание</label>
          <textarea
            value={testData.description}
            onChange={(e) => setTestData({ ...testData, description: e.target.value })}
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label>Максимальный балл</label>
          <input
            type="number"
            value={testData.max_score}
            onChange={(e) => setTestData({ ...testData, max_score: parseFloat(e.target.value) })}
          />
        </div>
      </div>
      
      <div className="card">
        <h3>Вопросы</h3>
        {testData.questions.map((question, qIdx) => (
          <div key={question.id || qIdx} className="question-card">
            <h4>Вопрос {qIdx + 1}</h4>
            
            <div className="form-group">
              <label>Текст вопроса</label>
              <textarea
                value={question.question_text}
                onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)}
                rows="2"
              />
            </div>
            
            <div className="form-group">
              <label>Баллы</label>
              <input
                type="number"
                value={question.points}
                onChange={(e) => updateQuestion(qIdx, 'points', parseFloat(e.target.value))}
                step="0.5"
              />
            </div>
            
            {question.question_type === 'closed' && (
              <div>
                <label>Варианты ответов</label>
                {question.closed_question_data.options.map((option, optIdx) => (
                  <div key={optIdx} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={question.closed_question_data.correct.includes(optIdx)}
                      onChange={() => toggleCorrectOption(qIdx, optIdx)}
                      style={{ width: 'auto' }}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateClosedOption(qIdx, optIdx, e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {question.question_type === 'open' && (
              <div>
                <label>Ключевые слова</label>
                {question.open_question_data.keywords.map((keyword, kwIdx) => (
                  <input
                    key={kwIdx}
                    type="text"
                    value={keyword}
                    onChange={(e) => updateKeyword(qIdx, kwIdx, e.target.value)}
                    style={{ marginBottom: '10px', width: '100%' }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            className="btn btn-success" 
            onClick={handleSubmit}
            disabled={saving}
            style={{ padding: '12px 30px' }}
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTest;