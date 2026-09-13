import api from './client';
import {
  Exam,
  Question,
  User,
  MonitoringStudentView,
} from '../types';

export const adminApi = {
  // Exams
  listExams: async (): Promise<Exam[]> => {
    const res = await api.get<Exam[]>('/admin/exams');
    return res.data;
  },

  createExam: async (examData: Partial<Exam> & { question_ids?: number[] }): Promise<Exam> => {
    const res = await api.post<Exam>('/admin/exams', examData);
    return res.data;
  },

  updateExam: async (
    id: number,
    examData: Partial<Exam> & { question_ids?: number[] }
  ): Promise<Exam> => {
    const res = await api.put<Exam>(`/admin/exams/${id}`, examData);
    return res.data;
  },

  deleteExam: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/admin/exams/${id}`);
    return res.data;
  },

  getExamPool: async (examId: number): Promise<Question[]> => {
    const res = await api.get<Question[]>(`/admin/exams/${examId}/pool`);
    return res.data;
  },

  addQuestionToPool: async (examId: number, questionId: number) => {
    const res = await api.post(`/admin/exams/${examId}/pool/${questionId}`);
    return res.data;
  },

  removeQuestionFromPool: async (examId: number, questionId: number) => {
    const res = await api.delete(`/admin/exams/${examId}/pool/${questionId}`);
    return res.data;
  },

  // Questions
  listQuestions: async (): Promise<Question[]> => {
    const res = await api.get<Question[]>('/admin/questions');
    return res.data;
  },

  createQuestion: async (questionData: Partial<Question>): Promise<Question> => {
    const res = await api.post<Question>('/admin/questions', questionData);
    return res.data;
  },

  updateQuestion: async (id: number, questionData: Partial<Question>): Promise<Question> => {
    const res = await api.put<Question>(`/admin/questions/${id}`, questionData);
    return res.data;
  },

  deleteQuestion: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/admin/questions/${id}`);
    return res.data;
  },

  addTestCase: async (
    questionId: number,
    testCase: { input: string; expected_output: string; is_hidden: boolean; weight: number }
  ) => {
    const res = await api.post(`/admin/questions/${questionId}/test-cases`, testCase);
    return res.data;
  },

  deleteTestCase: async (testCaseId: number) => {
    const res = await api.delete(`/admin/test-cases/${testCaseId}`);
    return res.data;
  },

  // Students & Bulk CSV
  listStudents: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/admin/students');
    return res.data;
  },

  importStudentsCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/admin/students/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Monitoring
  getMonitoring: async (examId: number): Promise<MonitoringStudentView[]> => {
    const res = await api.get<MonitoringStudentView[]>(`/admin/exams/${examId}/monitoring`);
    return res.data;
  },
};
