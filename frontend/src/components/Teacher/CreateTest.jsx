import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testService } from '../../services/test.service';
import toast from 'react-hot-toast';

const CreateTest = () => {
  const navigate = useNavigate();
  const [testData, setTestData] = useState({
    title: '',
    subject: '',
    description: '',
    max_score: 0,
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    question_type: 'closed',
    points: 1,
    order_number: 1,
    closed_question_data: { options: ['', ''], correct: [], multiple_correct: false },
    open_question_data: { keywords: [''], case_sensitive: false }
  });
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    if (!currentQuestion.question_text) {
      toast.error('Введите текст вопроса');
      return;
    }
    
    if (currentQuestion.question_type === 'closed') {
      const validOptions = currentQuestion.closed_question_data.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast.error('Добавьте минимум 2 варианта ответа');
        return;
      }
      if (currentQuestion.closed_question_data.correct.length === 0) {
        toast.error('Выберите правильный ответ(ы)');
        return;
      }
    }
    
    if (currentQuestion.question_type === 'open') {
      const validKeywords = currentQuestion.open_question_data.keywords.filter(kw => kw.trim());
      if (validKeywords.length === 0) {
        toast.error('Добавьте хотя бы одно ключевое слово');
        return;
      }
    }
    
    setTestData({
      ...testData,
      questions: [...testData.questions, { ...currentQuestion, order_number: testData.questions.length + 1 }]
    });
    
    // Reset current question
    setCurrentQuestion({
      question_text: '',
      question_type: 'closed',
      points: 1,
      order_number: testData.questions.length + 2,
      closed_question_data: { options: ['', ''], correct: [], multiple_correct: false },
      open_question_data: { keywords: [''], case_sensitive: false }
    });
    
    toast.success('Вопрос добавлен');
  };

  const removeQuestion = (index) => {
    const newQuestions = testData.questions.filter((_, i) => i !== index);
    setTestData({ ...testData, questions: newQuestions });
  };

  const updateClosedOption = (index, value) => {
    const newOptions = [...currentQuestion.closed_question_data.options];
    newOptions[index] = value;
    setCurrentQuestion({
      ...currentQuestion,
      closed_question_data: { ...currentQuestion.closed_question_data, options: newOptions }
    });
  };

  const addClosedOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      closed_question_data: {
        ...currentQuestion.closed_question_data,
        options: [...currentQuestion.closed_question_data.options, '']
      }
    });
  };

  const removeClosedOption = (index) => {
    const newOptions = currentQuestion.closed_question_data.options.filter((_, i) => i !== index);
    const newCorrect = currentQuestion.closed_question_data.correct.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    setCurrentQuestion({
      ...currentQuestion,
      closed_question_data: {
        ...currentQuestion.closed_question_data,
        options: newOptions,
        correct: newCorrect
      }
    });
  };

  const toggleCorrectOption = (index) => {
    const isMultiple = currentQuestion.closed_question_data.multiple_correct;
    let newCorrect;
    
    if (isMultiple) {
      if (currentQuestion.closed_question_data.correct.includes(index)) {
        newCorrect = currentQuestion.closed_question_data.correct.filter(i => i !== index);
      } else {
        newCorrect = [...currentQuestion.closed_question_data.correct, index];
      }
    } else {
      newCorrect = [index];
    }
    
    setCurrentQuestion({
      ...currentQuestion,
      closed_question_data: {
        ...currentQuestion.closed_question_data,
        correct: newCorrect
      }
    });
  };

  const updateKeyword = (index, value) => {
    const newKeywords = [...currentQuestion.open_question_data.keywords];
    newKeywords[index] = value;
    setCurrentQuestion({
      ...currentQuestion,
      open_question_data: { ...currentQuestion.open_question_data, keywords: newKeywords }
    });
  };

  const addKeyword = () => {
    setCurrentQuestion({
      ...currentQuestion,
      open_question_data: {
        ...currentQuestion.open_question_data,
        keywords: [...currentQuestion.open_question_data.keywords, '']
      }
    });
  };

  const removeKeyword = (index) => {
    const newKeywords = currentQuestion.open_question_data.keywords.filter((_, i) => i !== index);
    setCurrentQuestion({
      ...currentQuestion,
      open_question_data: {
        ...currentQuestion.open_question_data,
        keywords: newKeywords
      }
    });
  };

  const handleSubmit = async () => {
    if (!testData.title || !testData.subject || testData.max_score <= 0) {
      toast.error('Заполните все основные поля теста');
      return;
    }
    
    if (testData.questions.length === 0) {
      toast.error('Добавьте хотя бы один вопрос');
      return;
    }
    
    const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);
    if (Math.abs(totalPoints - testData.max_score) > 0.01) {
      toast.error(`Сумма баллов вопросов (${totalPoints}) не равна максимальному баллу теста (${testData.max_score})`);
      return;
    }
    
    setSaving(true);
    try {
      await testService.createTest(testData);
      toast.success('Тест успешно создан!');
      navigate('/teacher/tests');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания теста');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Создание нового теста</h2>
        
        <div className="form-group">
          <label>Название теста</label>
          <input
            type="text"
            value={testData.title}
            onChange={(e) => setTestData({ ...testData, title: e.target.value })}
            placeholder="Введите название теста"
          />
        </div>
        
        <div className="form-group">
          <label>Предмет</label>
          <input
            type="text"
            value={testData.subject}
            onChange={(e) => setTestData({ ...testData, subject: e.target.value })}
            placeholder="Введите название предмета"
          />
        </div>
        
        <div className="form-group">
          <label>Описание</label>
          <textarea
            value={testData.description}
            onChange={(e) => setTestData({ ...testData, description: e.target.value })}
            placeholder="Введите описание теста"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label>Максимальный балл</label>
          <input
            type="number"
            value={testData.max_score}
            onChange={(e) => setTestData({ ...testData, max_score: parseFloat(e.target.value) })}
            placeholder="Введите максимальный балл"
          />
        </div>
      </div>
      
      <div className="card">
        <h3>Добавление вопроса</h3>
        
        <div className="form-group">
          <label>Текст вопроса</label>
          <textarea
            value={currentQuestion.question_text}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
            placeholder="Введите текст вопроса"
            rows="2"
          />
        </div>
        
        <div className="form-group">
          <label>Тип вопроса</label>
          <select
            value={currentQuestion.question_type}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_type: e.target.value })}
          >
            <option value="closed">Закрытый (выбор ответа)</option>
            <option value="open">Открытый (текстовый ответ)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Баллы за вопрос</label>
          <input
            type="number"
            value={currentQuestion.points}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseFloat(e.target.value) })}
            step="0.5"
          />
        </div>
        
        {currentQuestion.question_type === 'closed' && (
          <div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={currentQuestion.closed_question_data.multiple_correct}
                  onChange={(e) => setCurrentQuestion({
                    ...currentQuestion,
                    closed_question_data: {
                      ...currentQuestion.closed_question_data,
                      multiple_correct: e.target.checked,
                      correct: [] // Сбрасываем правильные ответы при смене режима
                    }
                  })}
                />
                Несколько правильных ответов
              </label>
            </div>
            
            <label>Варианты ответов</label>
            {currentQuestion.closed_question_data.options.map((option, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                <input
                  type={currentQuestion.closed_question_data.multiple_correct ? 'checkbox' : 'radio'}
                  name="correct-option"
                  checked={currentQuestion.closed_question_data.correct.includes(idx)}
                  onChange={() => toggleCorrectOption(idx)}
                  style={{ width: 'auto' }}
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateClosedOption(idx, e.target.value)}
                  placeholder={`Вариант ${idx + 1}`}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeClosedOption(idx)}
                  style={{ padding: '5px 10px' }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addClosedOption}>
              + Добавить вариант
            </button>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              * {currentQuestion.closed_question_data.multiple_correct 
                ? "Выберите все правильные варианты (чекбоксы)" 
                : "Выберите один правильный вариант (радиокнопка)"}
            </p>
          </div>
        )}
        
        {currentQuestion.question_type === 'open' && (
          <div>
            <label>Ключевые слова для проверки</label>
            {currentQuestion.open_question_data.keywords.map((keyword, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => updateKeyword(idx, e.target.value)}
                  placeholder={`Ключевое слово ${idx + 1}`}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeKeyword(idx)}
                  style={{ padding: '5px 10px' }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addKeyword}>
              + Добавить ключевое слово
            </button>
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={currentQuestion.open_question_data.case_sensitive}
                  onChange={(e) => setCurrentQuestion({
                    ...currentQuestion,
                    open_question_data: { ...currentQuestion.open_question_data, case_sensitive: e.target.checked }
                  })}
                />
                Учитывать регистр
              </label>
            </div>
          </div>
        )}
        
        <button className="btn btn-primary" onClick={addQuestion} style={{ marginTop: '15px' }}>
          Добавить вопрос
        </button>
      </div>
      
      {testData.questions.length > 0 && (
        <div className="card">
          <h3>Добавленные вопросы ({testData.questions.length})</h3>
          {testData.questions.map((q, idx) => (
            <div key={idx} className="question-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <strong>Вопрос {idx + 1}</strong> ({q.question_type === 'closed' ? 'Закрытый' : 'Открытый'}) - {q.points} баллов
                  <p style={{ marginTop: '10px' }}>{q.question_text}</p>
                  {q.question_type === 'closed' && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      <strong>Варианты ответов:</strong>
                      <ul>
                        {q.closed_question_data.options.map((opt, optIdx) => (
                          <li key={optIdx} style={{ color: q.closed_question_data.correct.includes(optIdx) ? '#48bb78' : 'inherit' }}>
                            {opt} {q.closed_question_data.correct.includes(optIdx) && '✓'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {q.question_type === 'open' && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      <strong>Ключевые слова:</strong> {q.open_question_data.keywords.join(', ')}
                    </div>
                  )}
                </div>
                <button className="btn btn-danger" onClick={() => removeQuestion(idx)} style={{ padding: '5px 10px' }}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              className="btn btn-success" 
              onClick={handleSubmit}
              disabled={saving}
              style={{ padding: '12px 30px' }}
            >
              {saving ? 'Сохранение...' : 'Создать тест'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTest;