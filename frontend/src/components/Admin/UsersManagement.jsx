import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await adminService.changeUserRole(userId, newRole);
      toast.success('Роль пользователя изменена');
      loadUsers();
    } catch (error) {
      toast.error('Ошибка изменения роли');
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const action = newStatus === 'blocked' ? 'заблокирован' : 'разблокирован';
    
    if (!window.confirm(`Вы уверены, что хотите ${action} этого пользователя?`)) {
      return;
    }
    
    setUpdating(userId);
    try {
      await adminService.changeUserStatus(userId, newStatus);
      toast.success(`Пользователь ${action}`);
      loadUsers();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleName = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'student': return 'Студент';
      default: return role;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span style={{ background: '#48bb78', color: 'white', padding: '3px 8px', borderRadius: '3px', fontSize: '12px' }}>Активен</span>;
    } else {
      return <span style={{ background: '#e53e3e', color: 'white', padding: '3px 8px', borderRadius: '3px', fontSize: '12px' }}>Заблокирован</span>;
    }
  };

  if (loading) {
    return <div className="loading">Загрузка пользователей...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Управление пользователями</h2>
        
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя пользователя</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={updating === user.id}
                    style={{ padding: '5px' }}
                  >
                    <option value="student">Студент</option>
                    <option value="teacher">Преподаватель</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>{getStatusBadge(user.status)}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className={`btn ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleStatusChange(user.id, user.status)}
                    disabled={updating === user.id}
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    {updating === user.id ? '...' : (user.status === 'active' ? 'Заблокировать' : 'Разблокировать')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersManagement;