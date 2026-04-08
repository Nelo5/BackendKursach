import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }
    
    if (username.length < 3) {
      toast.error('Имя пользователя должно быть не менее 3 символов');
      return;
    }
    
    setLoading(true);
    const result = await register(username, password);
    
    if (result.success) {
      toast.success('Регистрация успешна! Теперь войдите в систему');
      navigate('/login');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Регистрация</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя (мин. 3 символа)"
              required
              minLength={3}
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль (мин. 6 символов)"
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Подтверждение пароля</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Подтвердите пароль"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '15px' }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#666' }}>
          После регистрации вам будет назначена роль "Студент".<br/>
          Для получения роли преподавателя обратитесь к администратору.
        </p>
      </div>
    </div>
  );
};

export default Register;