export type UserRole = 'student' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  roll_no?: string;
  role: UserRole;
  college?: string;
  candidate_group?: string;
  temp_password?: string;
}

export interface ImportedCandidateCredential {
  name: string;
  email: string;
  college?: string;
  candidate_group?: string;
  roll_no: string;
  password: string;
}

export interface CandidateImportResponse {
  created_count: number;
  skipped_count: number;
  errors: string[];
  credentials: ImportedCandidateCredential[];
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface TestCase {
  id: number;
  question_id: number;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
}

export interface ParameterDef {
  name: string;
  type: string;
}

export type QuestionType = 'coding' | 'mcq';

export interface MCQOption {
  id?: string;
  question_id?: number;
  option_text: string;
  is_correct?: boolean;
  order_index?: number;
}

export interface StudentMCQOption {
  id: string;
  option_text: string;
  order_index: number;
}

export interface Question {
  id: number;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  time_limit_ms: number;
  memory_limit_kb: number;
  sample_input?: string;
  sample_output?: string;
  input_format?: string;
  function_name?: string;
  function_signature?: string;
  parameters?: ParameterDef[];
  return_type?: string;
  starter_code?: Record<string, string>;
  driver_code?: Record<string, string>;
  test_cases?: TestCase[];
  // MCQ properties
  question_type?: QuestionType;
  marks?: number;
  mcq_time_limit_seconds?: number;
  is_multi_select?: boolean;
  mcq_options?: MCQOption[];
  options?: MCQOption[];
}

export interface StudentQuestionView {
  id: number;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  time_limit_ms: number;
  memory_limit_kb: number;
  sample_input?: string;
  sample_output?: string;
  input_format?: string;
  order_index: number;
  last_code?: string;
  last_language?: string;
  starter_code?: Record<string, string>;
  function_signature?: string;
  status?: string;
  // MCQ properties
  question_type?: QuestionType;
  marks?: number;
  mcq_time_limit_seconds?: number;
  is_multi_select?: boolean;
  question_started_at?: string;
  question_deadline_at?: string;
  mcq_options?: StudentMCQOption[];
  selected_option_ids?: string[];
  is_mcq_locked?: boolean;
}

export interface SubmitMCQResponsePayload {
  assignment_id: number;
  question_id: number;
  selected_option_ids: string[];
}

export interface SubmitMCQResponseResult {
  assignment_id: number;
  question_id: number;
  selected_option_ids: string[];
  answered_at?: string;
  is_locked: boolean;
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'submitted' | 'auto_submitted';

export interface Exam {
  id: number;
  title: string;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  easy_weight: number;
  medium_weight: number;
  hard_weight: number;
  mcq_weight?: number;
  mcq_count?: number;
  easy_count?: number;
  medium_count?: number;
  hard_count?: number;
  is_published: boolean;
  target_groups?: string[];
  pool_count?: number;
  created_at?: string;
  assignment_status?: AssignmentStatus;
  is_completed?: boolean;
  is_upcoming?: boolean;
  is_expired?: boolean;
  server_time?: string;
}

export interface ExamStartResponse {
  assignment_id: number;
  exam_id: number;
  status: AssignmentStatus;
  started_at: string;
  deadline_at: string;
  duration_minutes: number;
  questions: StudentQuestionView[];
}

export interface MyQuestionsResponse {
  assignment_id: number;
  exam_id: number;
  exam_title: string;
  status: AssignmentStatus;
  started_at?: string;
  deadline_at?: string;
  duration_minutes: number;
  server_time: string;
  questions: StudentQuestionView[];
}

export interface TestCaseRunResult {
  test_case_id: number;
  input: string;
  expected_output: string;
  actual_output?: string;
  stderr?: string;
  compile_output?: string;
  passed: boolean;
  status: string;
  time_ms?: number;
}

export interface RunCodeResponse {
  question_id: number;
  all_passed: boolean;
  passed_count: number;
  total_count: number;
  results: TestCaseRunResult[];
  compile_error?: string;
}

export interface SubmitCodeResponse {
  submission_id: number;
  assignment_id: number;
  question_id: number;
  status: string;
  test_cases_passed: number;
  total_test_cases: number;
  exec_time_ms?: number;
  is_final: boolean;
  submitted_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  student_name: string;
  roll_no?: string;
  total_score: number;
  status: string;
  submitted_at?: string;
}

export interface QuestionScoreBreakdown {
  question_id: number;
  question_title: string;
  difficulty: string;
  correctness: number;
  time_taken_sec: number;
  difficulty_weight: number;
  time_bonus: number;
  final_score: number;
}

export interface ExamResultDetail {
  assignment_id: number;
  exam_id: number;
  exam_title: string;
  student_name: string;
  roll_no?: string;
  status: string;
  total_score?: number | null;
  rank?: number | null;
  submitted_at?: string | null;
  question_scores: QuestionScoreBreakdown[];
}

export interface MonitoringStudentView {
  assignment_id: number;
  user_id: number;
  name: string;
  email: string;
  roll_no?: string;
  status: string;
  started_at?: string;
  deadline_at?: string;
  submitted_at?: string;
  time_remaining_sec?: number;
  submissions_count: number;
  current_score?: number;
  flags_count?: number;
  network_status?: 'online' | 'unstable' | 'offline' | 'not_started' | 'submitted';
  seconds_since_last_ping?: number | null;
  disconnect_incidents_count?: number;
  total_offline_seconds?: number;
}

export interface NetworkIncidentItem {
  id: number;
  assignment_id: number;
  disconnected_at: string;
  reconnected_at?: string | null;
  duration_seconds?: number | null;
  reason: string;
  created_at: string;
}

export interface ProctoringLogItem {
  id: number;
  assignment_id: number;
  event_type: string;
  title: string;
  description: string;
  occurred_at: string;
  meta_data?: string;
}

export interface CandidateQuestionSubmissionDossier {
  question_id: number;
  question_title: string;
  difficulty: string;
  order_index: number;
  correctness: number;
  difficulty_weight: number;
  final_score: number;
  time_taken_sec: number;
  has_submission: boolean;
  code?: string | null;
  language?: string | null;
  status?: string | null;
  test_cases_passed: number;
  total_test_cases: number;
  exec_time_ms?: number | null;
  submitted_at?: string | null;
  question_type?: 'coding' | 'mcq';
  description?: string | null;
  mcq_options?: Array<{
    id: string;
    option_text: string;
    is_correct?: boolean;
    order_index: number;
  }>;
  selected_option_ids?: string[];
  is_multi_select?: boolean;
}

export interface CandidateDossierResponse {
  assignment_id: number;
  exam_id: number;
  exam_title: string;
  user_id: number;
  student_name: string;
  email: string;
  roll_no?: string | null;
  status: string;
  started_at?: string | null;
  submitted_at?: string | null;
  total_time_sec?: number | null;
  total_score?: number | null;
  rank?: number | null;
  total_flags: number;
  flag_counts_by_type: Record<string, number>;
  integrity_status: 'Clean' | 'Warning' | 'High Risk';
  proctoring_logs: ProctoringLogItem[];
  questions: CandidateQuestionSubmissionDossier[];
  network_status?: string;
  disconnect_incidents_count?: number;
  total_offline_seconds?: number;
  network_incidents?: NetworkIncidentItem[];
}

