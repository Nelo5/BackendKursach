import api from './api';

export const attemptService = {
  // Student
  startAttempt: (testId) => api.post('/attempts/start', { test_id: testId }).then(res => res.data),
  submitAttempt: (attemptId, answers) => 
    api.post('/attempts/submit', { attempt_id: attemptId, answers }).then(res => res.data),
  getMyAttemptsHistory: () => api.get('/attempts/my-tests-history').then(res => res.data),
  getMyTestAttempts: (testId) => api.get(`/attempts/my-attempts/${testId}`).then(res => res.data),
  getMyAttemptDetail: (attemptId) => api.get(`/attempts/my-attempt-detail/${attemptId}`).then(res => res.data),
  
  // Teacher
  getTestAttemptsSummary: (testId) => 
    api.get(`/attempts/teacher/test/${testId}/summary`).then(res => res.data),
  getStudentTestAttempts: (studentId, testId) => 
    api.get(`/attempts/teacher/student/${studentId}/test/${testId}/attempts`).then(res => res.data),
  getAttemptDetailForTeacher: (attemptId) => 
    api.get(`/attempts/teacher/attempt-detail/${attemptId}`).then(res => res.data),
  getStudentSummary: (studentId) => 
    api.get(`/attempts/teacher/student/${studentId}/summary`).then(res => res.data),
};