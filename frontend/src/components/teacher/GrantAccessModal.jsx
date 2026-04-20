// src/components/teacher/GrantAccessModal.jsx
import React, { useState } from 'react';

const GrantAccessModal = ({ students, onClose, onGrant }) => {
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const handleToggleStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      const allIds = filteredStudents.map(s => s.id);
      setSelectedStudents(new Set(allIds));
    }
  };

  const handleGrant = () => {
    if (selectedStudents.size === 0) {
      alert('Выберите хотя бы одного студента');
      return;
    }
    onGrant(Array.from(selectedStudents));
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Выдать доступ к тесту</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="grant-controls">
            <input
              type="text"
              placeholder="Поиск студентов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button onClick={handleSelectAll} className="select-all-btn">
              {selectedStudents.size === filteredStudents.length ? 'Отменить все' : 'Выбрать всех'}
            </button>
          </div>
          
          <div className="students-list">
            {filteredStudents.length === 0 && (
              <p className="no-students">Студенты не найдены</p>
            )}
            {filteredStudents.map(student => (
              <label key={student.id} className="student-item">
                <input
                  type="checkbox"
                  checked={selectedStudents.has(student.id)}
                  onChange={() => handleToggleStudent(student.id)}
                />
                <div className="student-info">
                  <span className="student-name">
                    {student.surname} {student.name}
                  </span>
                  <span className="student-email">{student.email}</span>
                </div>
              </label>
            ))}
          </div>
          
          <div className="selected-count">
            Выбрано студентов: {selectedStudents.size}
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel">Отмена</button>
          <button onClick={handleGrant} className="btn-grant">
            Выдать доступ
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrantAccessModal;