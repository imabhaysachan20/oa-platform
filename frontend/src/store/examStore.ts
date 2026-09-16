import { create } from 'zustand';
import { StudentQuestionView, AssignmentStatus, RunCodeResponse } from '../types';

export const STARTER_CODE: Record<string, string> = {
  python: `# Write your Python solution here\nimport sys\n\ndef solve():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    # Process input...\n\nif __name__ == "__main__":\n    solve()\n`,
  cpp: `// Write your C++ solution here\n#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Read input and solve...\n    \n    return 0;\n}\n`,
  java: `// Write your Java solution here\nimport java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input and solve...\n        \n    }\n}\n`,
  javascript: `// Write your JavaScript (Node.js) solution here\nconst fs = require('fs');\n\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim();\n    if (!input) return;\n    \n    // Process input and output your solution\n    // const lines = input.split('\\n');\n}\n\nsolve();\n`,
};

interface ExamState {
  examId: number | null;
  assignmentId: number | null;
  examTitle: string;
  status: AssignmentStatus;
  startedAt: string | null;
  deadlineAt: string | null;
  questions: StudentQuestionView[];
  activeQuestionIndex: number;
  // questionId -> language -> code
  codeDrafts: Record<number, Record<string, string>>;
  // questionId -> current selected language
  selectedLanguage: Record<number, string>;
  // questionId -> last run output
  runOutputs: Record<number, RunCodeResponse | null>;
  isRunningCode: boolean;
  isSubmittingCode: boolean;

  setExamSession: (
    examId: number,
    assignmentId: number,
    examTitle: string,
    status: AssignmentStatus,
    startedAt: string,
    deadlineAt: string,
    questions: StudentQuestionView[]
  ) => void;
  setActiveQuestionIndex: (index: number) => void;
  setCodeDraft: (questionId: number, language: string, code: string) => void;
  setSelectedLanguage: (questionId: number, language: string) => void;
  setRunOutput: (questionId: number, output: RunCodeResponse | null) => void;
  setIsRunningCode: (val: boolean) => void;
  setIsSubmittingCode: (val: boolean) => void;
  resetExamState: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  examId: null,
  assignmentId: null,
  examTitle: '',
  status: 'not_started',
  startedAt: null,
  deadlineAt: null,
  questions: [],
  activeQuestionIndex: 0,
  codeDrafts: {},
  selectedLanguage: {},
  runOutputs: {},
  isRunningCode: false,
  isSubmittingCode: false,

  setExamSession: (examId, assignmentId, examTitle, status, startedAt, deadlineAt, questions) => {
    set((state) => {
      const drafts = { ...state.codeDrafts };
      const langs = { ...state.selectedLanguage };

      questions.forEach((q) => {
        const lang = q.last_language || 'python';
        if (!langs[q.id]) {
          langs[q.id] = lang;
        }
        if (!drafts[q.id]) {
          drafts[q.id] = {};
        }
        ['python', 'javascript', 'cpp', 'java'].forEach((l) => {
          if (!drafts[q.id][l]) {
            if (l === lang && q.last_code) {
              drafts[q.id][l] = q.last_code;
            } else {
              drafts[q.id][l] = q.starter_code?.[l] || STARTER_CODE[l] || '';
            }
          }
        });
      });

      return {
        examId,
        assignmentId,
        examTitle,
        status,
        startedAt,
        deadlineAt,
        questions,
        codeDrafts: drafts,
        selectedLanguage: langs,
      };
    });
  },

  setActiveQuestionIndex: (index) => set({ activeQuestionIndex: index }),

  setCodeDraft: (questionId, language, code) =>
    set((state) => ({
      codeDrafts: {
        ...state.codeDrafts,
        [questionId]: {
          ...(state.codeDrafts[questionId] || {}),
          [language]: code,
        },
      },
    })),

  setSelectedLanguage: (questionId, language) =>
    set((state) => {
      const drafts = { ...state.codeDrafts };
      if (!drafts[questionId]) {
        drafts[questionId] = {};
      }
      if (!drafts[questionId][language]) {
        drafts[questionId][language] = STARTER_CODE[language] || '';
      }
      return {
        selectedLanguage: {
          ...state.selectedLanguage,
          [questionId]: language,
        },
        codeDrafts: drafts,
      };
    }),

  setRunOutput: (questionId, output) =>
    set((state) => ({
      runOutputs: {
        ...state.runOutputs,
        [questionId]: output,
      },
    })),

  setIsRunningCode: (val) => set({ isRunningCode: val }),
  setIsSubmittingCode: (val) => set({ isSubmittingCode: val }),

  resetExamState: () =>
    set({
      examId: null,
      assignmentId: null,
      examTitle: '',
      status: 'not_started',
      startedAt: null,
      deadlineAt: null,
      questions: [],
      activeQuestionIndex: 0,
      codeDrafts: {},
      selectedLanguage: {},
      runOutputs: {},
      isRunningCode: false,
      isSubmittingCode: false,
    }),
}));
