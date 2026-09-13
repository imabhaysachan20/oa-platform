import api from './client';
import { RunCodeResponse, SubmitCodeResponse } from '../types';

export const submissionsApi = {
  run: async (questionId: number, code: string, language: string): Promise<RunCodeResponse> => {
    const res = await api.post<RunCodeResponse>('/submissions/run', {
      question_id: questionId,
      code,
      language,
    });
    return res.data;
  },

  submit: async (
    examId: number,
    questionId: number,
    code: string,
    language: string
  ): Promise<SubmitCodeResponse> => {
    const res = await api.post<SubmitCodeResponse>('/submissions/submit', {
      exam_id: examId,
      question_id: questionId,
      code,
      language,
    });
    return res.data;
  },

  getStatus: async (submissionId: number) => {
    const res = await api.get(`/submissions/${submissionId}/status`);
    return res.data;
  },
};
