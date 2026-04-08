import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(username, password);
    
    if (result.success) {
      toast.success('Добро пожаловать!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Вход в систему</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '15px' }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
        <div style={{ marginTop: '20px', padding: '10px', background: '#f7fafc', borderRadius: '5px' }}>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
            <strong>Тестовые аккаунты:</strong>
          </p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            👑 Админ: admin / admin123<br/>
            👨‍🏫 Преподаватель: teacher1 / teacher123<br/>
            👨‍🎓 Студент: student1 / student123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;