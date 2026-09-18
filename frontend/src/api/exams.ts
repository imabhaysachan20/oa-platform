import api from './client';
import {
  Exam,
  ExamStartResponse,
  MyQuestionsResponse,
  ExamResultDetail,
  LeaderboardEntry,
} from '../types';

export const examsApi = {
  list: async (): Promise<Exam[]> => {
    const res = await api.get<Exam[]>('/exams');
    return res.data;
  },

  get: async (id: number): Promise<Exam> => {
    const res = await api.get<Exam>(`/exams/${id}`);
    return res.data;
  },

  start: async (id: number): Promise<ExamStartResponse> => {
    const res = await api.post<ExamStartResponse>(`/exams/${id}/start`);
    return res.data;
  },

  getMyQuestions: async (id: number): Promise<MyQuestionsResponse> => {
    const res = await api.get<MyQuestionsResponse>(`/exams/${id}/my-questions`);
    return res.data;
  },

  finish: async (id: number): Promise<ExamResultDetail> => {
    const res = await api.post<ExamResultDetail>(`/exams/${id}/finish`);
    return res.data;
  },

  getResult: async (id: number): Promise<ExamResultDetail> => {
    const res = await api.get<ExamResultDetail>(`/exams/${id}/result`);
    return res.data;
  },

  getLeaderboard: async (id: number): Promise<LeaderboardEntry[]> => {
    const res = await api.get<LeaderboardEntry[]>(`/exams/${id}/leaderboard`);
    return res.data;
  },

  saveProctoringLogs: async (examId: number, assignmentId: number, logs: any[]): Promise<{ saved: number }> => {
    const res = await api.post<{ saved: number }>(`/exams/${examId}/proctoring-logs`, {
      assignment_id: assignmentId,
      logs,
    });
    return res.data;
  },

  markQuestionViewed: async (examId: number, questionId: number): Promise<{ question_deadline_at?: string | null }> => {
    const res = await api.post<{ question_deadline_at?: string | null }>(`/exams/${examId}/questions/${questionId}/view`);
    return res.data;
  },
};
