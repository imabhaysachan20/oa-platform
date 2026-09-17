import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { submissionsApi } from '../api/submissions';
import { useExamStore, STARTER_CODE } from '../store/examStore';
import { useThemeStore } from '../store/themeStore';
import { QuestionPanel } from '../components/QuestionPanel';
import { CodeEditor } from '../components/CodeEditor';
import { OutputConsole } from '../components/OutputConsole';
import { Timer } from '../components/ui/Timer';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Play, Send, CheckCircle, AlertTriangle, ArrowLeft, Sun, Moon, ShieldAlert, ShieldCheck, Maximize2, Minimize2 } from 'lucide-react';
import { useExamSecurity } from '../hooks/useExamSecurity';

export const StudentExamWorkspacePage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);


  const { theme, toggleTheme } = useThemeStore();

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
    resetExamState,
  } = useExamStore();

  // Load exam questions & state (supports resume on reload)
  const { data: examData, isLoading, error, refetch } = useQuery({
    queryKey: ['myQuestions', id],
    queryFn: () => examsApi.getMyQuestions(id),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      navigate(`/exam/${id}/waiting-room`, { replace: true });
    }
  }, [error, id, navigate]);

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

  // Comprehensive Anti-Cheat & Proctoring Engine
  const {
    infractions,
    strikeCount,
    maxStrikes,
    isFullscreen,
    hasInitiatedFullscreen,
    fullscreenRequiredModal,
    activeWarning,
    enterFullscreen,
    logInfraction,
    dismissActiveWarning,
  } = useExamSecurity({
    enabled: !!examData && examData.status === 'in_progress',
    maxStrikes: 3,
    requireFullscreen: true,
  });

  // Warn on accidental tab/window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const currentQ = questions[activeQuestionIndex];
  const currentLang = currentQ ? selectedLanguage[currentQ.id] || 'python' : 'python';
  const currentStarter = currentQ?.starter_code?.[currentLang] || STARTER_CODE[currentLang] || '';
  const currentCode = currentQ
    ? codeDrafts[currentQ.id]?.[currentLang] || currentStarter
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
      resetExamState();
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
    resetExamState();
    navigate(`/exam/${id}/result`);
  };

  if (isLoading || !currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">Loading assigned workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-150"
    >
      {/* Workspace Top Navigation Bar */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Leave workspace (progress is saved)"
          >
            <ArrowLeft size={18} />
          </button>

          {/* UsefulBI Logo */}
          <div className="hidden sm:flex items-center">
            <img
              src="/UsefulBI_Logo_Main.webp"
              alt="UsefulBI"
              className="h-6 w-auto object-contain"
            />
          </div>

          <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {examTitle || 'Coding Assessment'}
            </h1>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Autosave Active
            </span>
          </div>
        </div>

        {/* Proctoring Status Badge, Server-Driven Countdown Timer, Theme Toggle & Finish Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Anti-Cheat Proctoring Status & Fullscreen Trigger */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={enterFullscreen}
              title={isFullscreen ? 'Full Screen Active' : 'Enter Full Screen'}
              className={`px-2.5 py-1 rounded-full transition border text-xs font-semibold flex items-center gap-1.5 ${
                isFullscreen
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-800'
                  : 'text-amber-800 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800 animate-pulse'
              }`}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? 'Fullscreen Active' : 'Enable Fullscreen'}</span>
            </button>

            {strikeCount === 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Proctored (0/{maxStrikes} Strikes)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
                <span>{strikeCount}/{maxStrikes} Infractions</span>
              </span>
            )}
          </div>

          {deadlineAt && (
            <Timer deadlineAt={deadlineAt} onExpire={handleTimeoutExpire} />
          )}

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
          >
            {theme === 'dark' ? (
              <Sun size={16} className="text-amber-400" />
            ) : (
              <Moon size={16} className="text-ubi-800" />
            )}
          </button>

          <Button
            variant="success"
            size="sm"
            onClick={() => setIsFinishModalOpen(true)}
            className="gap-1.5 font-semibold"
          >
            <CheckCircle size={15} />
            <span>Finish Exam</span>
          </Button>
        </div>
      </div>

      {/* Submission Feedback Toast / Bar */}
      {submissionFeedback && (
        <div className="bg-ubi-50 border-b border-ubi-200 text-ubi-900 dark:bg-ubi-950/80 dark:border-ubi-800/60 dark:text-ubi-200 px-4 py-2 flex items-center justify-between text-xs font-semibold animate-fadeIn shrink-0">
          <span className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
            {submissionFeedback}
          </span>
          <button
            onClick={() => setSubmissionFeedback(null)}
            className="text-ubi-700 dark:text-ubi-400 hover:text-ubi-900 dark:hover:text-ubi-200 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden min-h-0">
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
        <div className="lg:col-span-7 h-full flex flex-col gap-2.5 overflow-hidden min-h-0">
          {/* Editor Container */}
          <div className={`transition-all duration-200 min-h-0 overflow-hidden ${isConsoleExpanded ? 'flex-1' : 'flex-[3]'}`}>
            <CodeEditor
              value={currentCode}
              onChange={(val) => setCodeDraft(currentQ.id, currentLang, val)}
              language={currentLang}
              onLanguageChange={(lang) => setSelectedLanguage(currentQ.id, lang)}
              starterCode={currentStarter}
              onReset={() => currentQ && setCodeDraft(currentQ.id, currentLang, currentStarter)}
              onPasteAttempt={() => logInfraction('PASTE_ATTEMPT')}
            />
          </div>

          {/* Action Buttons Bar */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl shrink-0 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Proctored Exam</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRunCode}
                isLoading={isRunningCode}
                disabled={isSubmittingCode}
                className="gap-1.5 font-semibold"
              >
                <Play size={14} className="text-ubi-800 dark:text-ubi-400" />
                <span>Run Code</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitCode}
                isLoading={isSubmittingCode}
                disabled={isRunningCode}
                className="gap-1.5 font-semibold"
              >
                <Send size={14} />
                <span>Submit Solution</span>
              </Button>
            </div>
          </div>

          {/* Output & Test Cases Console */}
          <div className={`transition-all duration-200 min-h-0 overflow-hidden ${isConsoleExpanded ? 'flex-[3]' : 'flex-[2]'}`}>
            <OutputConsole
              output={currentOutput}
              isRunning={isRunningCode}
              sampleInput={currentQ?.sample_input}
              sampleOutput={currentQ?.sample_output}
              isExpanded={isConsoleExpanded}
              onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Finish Modal */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title="Submit and Finish Assessment?"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300 rounded-xl text-xs">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>
              Are you sure you want to finish the exam? Once submitted, your scores will be finalized and you cannot submit further code.
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Question Submission Status:
            </p>
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Question {idx + 1} ({q.difficulty}):
                </span>
                <span className={q.status && q.status !== 'unattempted' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>
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
              className="gap-1.5 font-semibold"
            >
              <CheckCircle size={15} />
              <span>Confirm & Submit Exam</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mandatory Full-Screen Start & Pause Lockout Gate */}
      {(!isFullscreen || fullscreenRequiredModal) && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {hasInitiatedFullscreen ? 'Assessment Suspended: Full Screen Exited' : 'Full Screen Required to Start'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {hasInitiatedFullscreen
                  ? 'You exited full-screen mode. Full-screen mode is strictly required. Your workspace and code editor are locked until full screen is restored.'
                  : 'This assessment is strictly proctored and cannot begin without full-screen mode enabled. The questions, timer, and editor will unlock once full screen is active.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 text-left space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">Strict Proctoring Guidelines:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>The exam must stay in full-screen mode until final submission.</li>
                <li>Switching tabs, minimizing, or clicking outside triggers security strikes.</li>
                <li>Copying questions and pasting external code are blocked and flagged.</li>
                <li>All infraction events are stored and provided to the recruiting committee.</li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={enterFullscreen}
              className="w-full justify-center gap-2 font-bold py-3 text-base shadow-lg shadow-ubi-900/20"
            >
              <Maximize2 size={18} />
              <span>{hasInitiatedFullscreen ? 'Re-enter Full Screen to Resume' : 'Enter Full Screen & Start Assessment'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Security Infraction Alert Modal */}
      <Modal
        isOpen={!!activeWarning}
        onClose={dismissActiveWarning}
        title={strikeCount >= maxStrikes ? "⚠️ Security Infraction Limit Notice" : "⚠️ Security Infraction Detected"}
        maxWidth="lg"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800/80 dark:text-rose-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-100">
                <ShieldAlert size={20} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{activeWarning?.title}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                Infraction #{strikeCount}
              </span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              {activeWarning?.description}
            </p>
          </div>

          {strikeCount >= maxStrikes && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Security Audit Threshold Reached</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                You have accumulated {strikeCount} security infractions. All incidents are logged with exact timestamps and will be submitted with your evaluation report. Please continue your assessment carefully.
              </p>
            </div>
          )}

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-200">Strict Assessment Rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not leave full screen or switch browser tabs.</li>
              <li>Do not click outside the workspace or open background tools.</li>
              <li>Copying questions or pasting external solutions is prohibited.</li>
              <li>All infraction events are stored and provided to the recruiting team.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {strikeCount} total security flag{strikeCount === 1 ? '' : 's'} recorded
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={dismissActiveWarning}
              className="font-semibold"
            >
              I Understand & Resume Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
