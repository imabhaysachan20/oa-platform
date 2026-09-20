import api from './client';
import {
  Exam,
  ExamStartResponse,
  MyQuestionsResponse,
  ExamResultDetail,
  LeaderboardEntry,
  DeviceTelemetryPayload,
  ResumeExamResponse,
  PhotoUploadUrlResponse,
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

  getPhotoUploadUrl: async (
    id: number,
    eventType: 'start' | 'resume' = 'start'
  ): Promise<PhotoUploadUrlResponse> => {
    const res = await api.post<PhotoUploadUrlResponse>(`/exams/${id}/photo-upload-url`, {
      event_type: eventType,
    });
    return res.data;
  },

  uploadPhotoDirectToS3: async (
    uploadUrl: string,
    base64OrBlob: string | Blob
  ): Promise<void> => {
    let body: Blob;
    if (typeof base64OrBlob === 'string') {
      const base64Data = base64OrBlob.includes(',')
        ? base64OrBlob.split(',')[1]
        : base64OrBlob;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      body = new Blob([byteArray], { type: 'image/jpeg' });
    } else {
      body = base64OrBlob;
    }

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Direct AWS S3 upload failed with status ${res.status}`);
    }
  },

  start: async (
    id: number,
    telemetryOrPayload?: DeviceTelemetryPayload | { telemetry?: DeviceTelemetryPayload; verification_photo?: string; s3_key?: string },
    verificationPhoto?: string,
    s3Key?: string
  ): Promise<ExamStartResponse> => {
    let payload: Record<string, any> = {};
    if (telemetryOrPayload) {
      if (
        'verification_photo' in telemetryOrPayload ||
        'telemetry' in telemetryOrPayload ||
        's3_key' in telemetryOrPayload
      ) {
        const obj = telemetryOrPayload as {
          telemetry?: DeviceTelemetryPayload;
          verification_photo?: string;
          s3_key?: string;
        };
        payload = { ...obj };
        if (obj.telemetry) {
          payload = { ...obj.telemetry, ...payload };
        }
      } else {
        payload = {
          ...telemetryOrPayload,
          telemetry: telemetryOrPayload,
        };
      }
    }
    if (verificationPhoto) {
      payload.verification_photo = verificationPhoto;
    }
    if (s3Key) {
      payload.s3_key = s3Key;
    }
    const res = await api.post<ExamStartResponse>(`/exams/${id}/start`, payload);
    return res.data;
  },

  resume: async (
    id: number,
    assignmentId: number,
    telemetry?: DeviceTelemetryPayload,
    verificationPhoto?: string,
    s3Key?: string
  ): Promise<ResumeExamResponse> => {
    const res = await api.post<ResumeExamResponse>(`/exams/${id}/resume`, {
      assignment_id: assignmentId,
      telemetry,
      verification_photo: verificationPhoto,
      s3_key: s3Key,
    });
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

  lockQuestion: async (examId: number, questionId: number): Promise<{ locked: boolean; question_id: number }> => {
    const res = await api.post<{ locked: boolean; question_id: number }>(`/exams/${examId}/questions/${questionId}/lock`);
    return res.data;
  },

  sendHeartbeat: async (
    examId: number,
    assignmentId: number,
    options?: { timeout?: number }
  ): Promise<{ status: string; server_time: string; network_status: string; incident_logged: boolean }> => {
    const res = await api.post<{ status: string; server_time: string; network_status: string; incident_logged: boolean }>(
      `/exams/${examId}/heartbeat`,
      {
        assignment_id: assignmentId,
        client_timestamp: new Date().toISOString(),
      },
      {
        timeout: options?.timeout ?? 3000,
      }
    );
    return res.data;
  },
};
