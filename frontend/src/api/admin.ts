import api from './client';
import {
  Exam,
  Question,
  User,
  MonitoringStudentView,
  CandidateDossierResponse,
  CandidateImportResponse,
  StudentCreatePayload,
  StudentUpdatePayload,
  FreshRestartResponse,
  StudentGroupsResponse,
} from '../types';

export const adminApi = {
  // Exams
  listExams: async (params?: {
    search?: string;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<Exam[]> => {
    const res = await api.get<Exam[]>('/admin/exams', { params });
    return res.data;
  },

  getExam: async (id: number): Promise<Exam> => {
    const res = await api.get<Exam>(`/admin/exams/${id}`);
    return res.data;
  },

  createExam: async (examData: Partial<Exam> & { question_ids?: number[] }): Promise<Exam> => {
    const res = await api.post<Exam>('/admin/exams', examData);
    return res.data;
  },

  deleteExam: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/admin/exams/${id}`);
    return res.data;
  },

  getExamPool: async (
    examId: number,
    params?: {
      search?: string;
      difficulty?: string;
      question_type?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): Promise<Question[]> => {
    const res = await api.get<Question[]>(`/admin/exams/${examId}/pool`, { params });
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
  listQuestions: async (params?: {
    search?: string;
    difficulty?: string;
    question_type?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<Question[]> => {
    const res = await api.get<Question[]>('/admin/questions', { params });
    return res.data;
  },

  getQuestion: async (id: number): Promise<Question> => {
    const res = await api.get<Question>(`/admin/questions/${id}`);
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

  // Students & Bulk CSV / Excel
  listStudents: async (params?: { group?: string; college?: string }): Promise<User[]> => {
    const res = await api.get<User[]>('/admin/students', { params });
    return res.data;
  },

  listStudentGroups: async (): Promise<StudentGroupsResponse> => {
    const res = await api.get<StudentGroupsResponse>('/admin/students/groups');
    return res.data;
  },

  importStudents: async (payload: {
    file: File;
    candidate_group?: string;
    default_college?: string;
  }): Promise<CandidateImportResponse> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.candidate_group) {
      formData.append('candidate_group', payload.candidate_group);
    }
    if (payload.default_college) {
      formData.append('default_college', payload.default_college);
    }
    const res = await api.post<CandidateImportResponse>('/admin/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  importStudentsCsv: async (file: File): Promise<CandidateImportResponse> => {
    return adminApi.importStudents({ file });
  },

  createStudent: async (payload: StudentCreatePayload): Promise<User> => {
    const res = await api.post<User>('/admin/students', payload);
    return res.data;
  },

  updateStudent: async (studentId: number, payload: StudentUpdatePayload): Promise<User> => {
    const res = await api.put<User>(`/admin/students/${studentId}`, payload);
    return res.data;
  },

  deleteStudent: async (studentId: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/admin/students/${studentId}`);
    return res.data;
  },

  // Monitoring & Candidate Dossier
  getMonitoring: async (examId: number): Promise<MonitoringStudentView[]> => {
    const res = await api.get<MonitoringStudentView[]>(`/admin/exams/${examId}/monitoring`);
    return res.data;
  },

  getCandidateDossier: async (examId: number, assignmentId: number): Promise<CandidateDossierResponse> => {
    const res = await api.get<CandidateDossierResponse>(`/admin/exams/${examId}/candidates/${assignmentId}/dossier`);
    return res.data;
  },

  freshRestartCandidateExam: async (examId: number, assignmentId: number, reason?: string): Promise<FreshRestartResponse> => {
    const res = await api.post<FreshRestartResponse>(`/admin/exams/${examId}/candidates/${assignmentId}/restart`, { reason });
    return res.data;
  },

  // Playground & Templates
  generateTemplates: async (payload: {
    function_name: string;
    parameters: Array<{ name: string; type: string }>;
    return_type: string;
  }): Promise<{ function_signature: string; starter: Record<string, string> }> => {
    const res = await api.post('/admin/questions/generate-templates', payload);
    return res.data;
  },

  runPlaygroundCode: async (payload: {
    code: string;
    language: string;
    time_limit_ms: number;
    memory_limit_kb: number;
    test_cases: { id?: number; input: string; expected_output: string }[];
    title?: string;
    question_id?: number;
    function_name?: string;
    parameters?: Array<{ name: string; type: string }>;
    return_type?: string;
    driver_code?: Record<string, string>;
  }) => {
    const res = await api.post('/admin/playground/run', payload);
    return res.data;
  },
};

