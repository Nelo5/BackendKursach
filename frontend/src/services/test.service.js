import api from './api';

export const testService = {
  // Student
  getAvailableTests: (subject = null) => {
    const url = subject ? `/tests/available?subject=${subject}` : '/tests/available';
    return api.get(url).then(res => res.data);
  },
  getTestDetails: (testId) => api.get(`/tests/${testId}`).then(res => res.data),
  getSubjects: () => api.get('/tests/subjects').then(res => res.data),
  
  // Teacher
  createTest: (testData) => api.post('/tests/create', testData).then(res => res.data),
  updateTest: (testId, testData) => api.put(`/tests/${testId}`, testData).then(res => res.data),
  updateTestStatus: (testId, status) => 
    api.put(`/tests/${testId}/status`, { status }).then(res => res.data),
  grantAccess: (testId, studentIds) => 
    api.post(`/tests/${testId}/grant-access`, { student_ids: studentIds }).then(res => res.data),
  getMyTests: () => api.get('/tests/teacher/my-tests').then(res => res.data),
  getMyTestsWithStats: () => api.get('/tests/teacher/my-tests-with-stats').then(res => res.data),
};