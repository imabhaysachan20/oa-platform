import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { submissionsApi } from '../api/submissions';
import { useExamStore, STARTER_CODE } from '../store/examStore';
import { QuestionPanel } from '../components/QuestionPanel';
import { CodeEditor } from '../components/CodeEditor';
import { OutputConsole } from '../components/OutputConsole';
import { Timer } from '../components/ui/Timer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Play, Send, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export const StudentExamWorkspacePage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  const {
    questions,
    activeQuestionIndex,
    codeDrafts,
    selectedLanguage,
    runOutputs,
    isRunningCode,
    isSubmittingCode,
    deadlineAt,
    examTitle,
    setExamSession,
    setActiveQuestionIndex,
    setCodeDraft,
    setSelectedLanguage,
    setRunOutput,
    setIsRunningCode,
    setIsSubmittingCode,
  } = useExamStore();

  // Load exam questions & state (supports resume on reload)
  const { data: examData, isLoading, refetch } = useQuery({
    queryKey: ['myQuestions', id],
    queryFn: () => examsApi.getMyQuestions(id),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (examData) {
      if (examData.status === 'submitted' || examData.status === 'auto_submitted') {
        navigate(`/exam/${id}/result`);
        return;
      }

      setExamSession(
        examData.exam_id,
        examData.assignment_id,
        examData.exam_title,
        examData.status,
        examData.started_at || '',
        examData.deadline_at || '',
        examData.questions
      );
    }
  }, [examData, id, navigate, setExamSession]);

  const currentQ = questions[activeQuestionIndex];
  const currentLang = currentQ ? selectedLanguage[currentQ.id] || 'python' : 'python';
  const currentCode = currentQ
    ? codeDrafts[currentQ.id]?.[currentLang] || STARTER_CODE[currentLang] || ''
    : '';
  const currentOutput = currentQ ? runOutputs[currentQ.id] || null : null;

  // Handle "Run Code" against visible sample cases
  const handleRunCode = async () => {
    if (!currentQ || isRunningCode) return;
    setIsRunningCode(true);
    setSubmissionFeedback(null);

    try {
      const res = await submissionsApi.run(currentQ.id, currentCode, currentLang);
      setRunOutput(currentQ.id, res);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to run code');
    } finally {
      setIsRunningCode(false);
    }
  };

  // Handle "Submit Solution" for current question against all test cases
  const handleSubmitCode = async () => {
    if (!currentQ || isSubmittingCode) return;
    setIsSubmittingCode(true);
    setSubmissionFeedback(null);

    try {
      const res = await submissionsApi.submit(id, currentQ.id, currentCode, currentLang);
      setSubmissionFeedback(
        `Question ${activeQuestionIndex + 1} Submitted: ${res.test_cases_passed}/${res.total_test_cases} test cases passed (${res.status})`
      );
      // Update question status in view
      currentQ.status = res.status;
      // Refresh backend session in background
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit solution');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Finish exam early
  const handleFinishExam = async () => {
    setIsSubmittingExam(true);
    try {
      await examsApi.finish(id);
      setIsFinishModalOpen(false);
      navigate(`/exam/${id}/result`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to finish exam');
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // Auto-submit callback triggered when Timer hits 00:00:00
  const handleTimeoutExpire = () => {
    alert('Time limit reached! Your assessment has been automatically submitted.');
    navigate(`/exam/${id}/result`);
  };

  if (isLoading || !currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-sm text-slate-400 font-mono">Loading assigned workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Workspace Top Navigation Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Leave workspace (progress is saved)"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
              {examTitle || 'Coding Assessment'}
            </h1>
            <span className="text-[11px] text-slate-400">
              3 Questions Locked • Autosafe Enabled
            </span>
          </div>
        </div>

        {/* Server-Driven Countdown Timer & Finish Button */}
        <div className="flex items-center gap-3">
          {deadlineAt && (
            <Timer deadlineAt={deadlineAt} onExpire={handleTimeoutExpire} />
          )}

          <Button
            variant="success"
            size="sm"
            onClick={() => setIsFinishModalOpen(true)}
            className="gap-1.5"
          >
            <CheckCircle size={15} />
            <span>Finish Exam</span>
          </Button>
        </div>
      </div>

      {/* Submission Feedback Toast / Bar */}
      {submissionFeedback && (
        <div className="bg-indigo-950/80 border-b border-indigo-800/60 px-4 py-2 flex items-center justify-between text-xs text-indigo-200 animate-fadeIn">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle size={14} className="text-emerald-400" />
            {submissionFeedback}
          </span>
          <button
            onClick={() => setSubmissionFeedback(null)}
            className="text-indigo-400 hover:text-indigo-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left Column: Question Panel (5 cols on large) */}
        <div className="lg:col-span-5 h-full overflow-hidden">
          <QuestionPanel
            questions={questions}
            activeIndex={activeQuestionIndex}
            onSelectIndex={(idx) => {
              setActiveQuestionIndex(idx);
              setSubmissionFeedback(null);
            }}
          />
        </div>

        {/* Right Column: Code Editor & Console (7 cols on large) */}
        <div className="lg:col-span-7 h-full flex flex-col gap-3 overflow-hidden">
          {/* Editor Container */}
          <div className="flex-1 min-h-[350px] overflow-hidden">
            <CodeEditor
              value={currentCode}
              onChange={(val) => setCodeDraft(currentQ.id, currentLang, val)}
              language={currentLang}
              onLanguageChange={(lang) => setSelectedLanguage(currentQ.id, lang)}
            />
          </div>

          {/* Action Buttons Bar */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Judge0 Sandbox Ready</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRunCode}
                isLoading={isRunningCode}
                disabled={isSubmittingCode}
                className="gap-1.5"
              >
                <Play size={14} className="text-indigo-400" />
                <span>Run Code</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitCode}
                isLoading={isSubmittingCode}
                disabled={isRunningCode}
                className="gap-1.5"
              >
                <Send size={14} />
                <span>Submit Solution</span>
              </Button>
            </div>
          </div>

          {/* Output & Test Cases Console */}
          <div className="h-60 overflow-hidden">
            <OutputConsole output={currentOutput} isRunning={isRunningCode} />
          </div>
        </div>
      </div>

      {/* Confirmation Finish Modal */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title="Submit and Finish Assessment?"
      >
        <div className="space-y-4 text-sm text-slate-300">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>
              Are you sure you want to finish the exam? Once submitted, your scores will be permanently calculated and you cannot make further submissions.
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
            <p className="font-semibold text-slate-200">Question Submission Status:</p>
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-center justify-between">
                <span>
                  Question {idx + 1} ({q.difficulty}):
                </span>
                <span className={q.status && q.status !== 'unattempted' ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                  {q.status && q.status !== 'unattempted' ? q.status : 'Not Submitted'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFinishModalOpen(false)}
              disabled={isSubmittingExam}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleFinishExam}
              isLoading={isSubmittingExam}
              className="gap-1.5"
            >
              <CheckCircle size={15} />
              <span>Confirm & Submit Exam</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
