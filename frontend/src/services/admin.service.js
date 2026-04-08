import api from './api';

export const adminService = {
  getUsers: () => api.get('/admin/users').then(res => res.data),
  changeUserRole: (userId, role) => 
    api.put(`/admin/users/${userId}/role`, { role }).then(res => res.data),
  changeUserStatus: (userId, status) => 
    api.put(`/admin/users/${userId}/status`, { status }).then(res => res.data),
  getBlockedTests: () => api.get('/admin/tests/blocked').then(res => res.data),
  blockTest: (testId) => api.post(`/admin/tests/${testId}/block`).then(res => res.data),
  unblockTest: (testId) => api.post(`/admin/tests/${testId}/unblock`).then(res => res.data),
};