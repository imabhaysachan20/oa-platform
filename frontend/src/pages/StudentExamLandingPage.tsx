import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useExamStore } from '../store/examStore';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  Clock,
  Award,
  ShieldAlert,
  Play,
  CheckCircle2,
  FileCode2,
  AlertTriangle,
  Eye,
  EyeOff,
  Scale,
  ShieldCheck,
  Check
} from 'lucide-react';

export const StudentExamLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const setExamSession = useExamStore((s) => s.setExamSession);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const { data: exams, isLoading, error } = useQuery({
    queryKey: ['availableExams'],
    queryFn: examsApi.list,
  });

  const handleOpenInstructions = (exam: any) => {
    setSelectedExam(exam);
    setAgreedToTerms(false);
  };

  const handleStartConfirmed = async () => {
    if (!selectedExam || !agreedToTerms || isStarting) return;
    setIsStarting(true);
    try {
      const res = await examsApi.start(selectedExam.id);
      setExamSession(
        res.exam_id,
        res.assignment_id,
        selectedExam.title || 'Exam in Progress',
        res.status,
        res.started_at,
        res.deadline_at,
        res.questions
      );
      setSelectedExam(null);
      navigate(`/exam/${selectedExam.id}/workspace`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start exam');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Welcome Banner with UsefulBI Branding */}
      <div className="bg-gradient-to-br from-ubi-50/70 via-white to-slate-50 dark:from-ubi-950/50 dark:via-slate-900 dark:to-slate-900 border border-ubi-200/80 dark:border-ubi-800/40 rounded-2xl p-8 shadow-sm dark:shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ubi-100/80 text-ubi-900 dark:bg-ubi-950 dark:text-ubi-300 border border-ubi-200 dark:border-ubi-800 text-xs font-bold uppercase tracking-wider mb-3">
            Candidate Assessment Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            UsefulBI Online Coding Assessments
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Welcome to UBIcode. Below are your scheduled technical assessments. Upon clicking <strong>Start Assessment</strong>, you will review the test rules and proctoring instructions before entering your dedicated workspace.
          </p>
        </div>
      </div>

      {/* Rules and Key Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-ubi-50 dark:bg-ubi-950 border border-ubi-200 dark:border-ubi-800 rounded-xl text-ubi-800 dark:text-ubi-400 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Server-Driven Timer</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Assessment countdown is synchronized with the server. When the timer expires, all current code is automatically submitted.
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Exact Partial Marking</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Marks are awarded based on test cases passed (e.g. passing 2 of 4 test cases on a 10-mark question yields 5 marks).
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Anti-Cheat Proctoring</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Window focus and tab switching are monitored in real time. Do not switch tabs or engage in unauthorized activities.
            </p>
          </div>
        </Card>
      </div>

      {/* Available Exams */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Active Assessments</span>
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
            Failed to load available assessments. Please refresh the page.
          </div>
        ) : exams && exams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {exams.map((exam) => {
              const isCompleted = exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
              const isInProgress = !isCompleted && exam.assignment_status === 'in_progress';

              return (
                <Card
                  key={exam.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-ubi-300 dark:hover:border-ubi-700"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.title}</h3>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 flex items-center gap-1">
                          <Check size={10} className="text-emerald-500" />
                          Completed
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
                          In Progress
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock size={14} className="text-slate-400" />
                        Duration: {exam.duration_minutes} minutes
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <FileCode2 size={14} className="text-slate-400" />
                        3 Questions (1 Easy, 2 Medium)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/exam/${exam.id}/leaderboard`)}
                        className="w-full sm:w-auto"
                      >
                        Leaderboard (Admin)
                      </Button>
                    )}
                    {isCompleted ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full sm:w-auto font-semibold gap-1.5 opacity-60 cursor-not-allowed text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Completed</span>
                      </Button>
                    ) : isInProgress ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/exam/${exam.id}/workspace`)}
                        className="w-full sm:w-auto font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Resume Assessment</span>
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenInstructions(exam)}
                        className="w-full sm:w-auto font-semibold gap-1.5"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Start Assessment</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active assessments currently scheduled.
            </p>
          </Card>
        )}
      </div>

      {/* Pre-Test Instructions & Proctoring Modal */}
      {selectedExam && (
        <Modal
          isOpen={!!selectedExam}
          onClose={() => !isStarting && setSelectedExam(null)}
          title="Assessment Instructions & Proctoring Guidelines"
          maxWidth="3xl"
        >
          <div className="space-y-5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-ubi-50/70 border border-ubi-200 dark:bg-ubi-950/40 dark:border-ubi-800 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-ubi-800 dark:text-ubi-400 tracking-wider block">
                  Assessment
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {selectedExam.title}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Clock size={15} className="text-ubi-700 dark:text-ubi-400" />
                  {selectedExam.duration_minutes} Minutes
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <FileCode2 size={15} className="text-ubi-700 dark:text-ubi-400" />
                  3 Assigned Questions
                </span>
              </div>
            </div>

            {/* Instruction Items List */}
            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
              {/* 1. Visible vs Hidden Test Cases */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Eye size={16} className="text-ubi-700 dark:text-ubi-400" />
                  <span>1. Visible vs. Hidden Test Cases</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  • <strong>Run Code (Visible Cases):</strong> Executes your code against visible sample test cases shown on screen. You can run code multiple times with no limit or score penalty to test logic and debug.<br />
                  • <strong>Submit Solution (Hidden Cases):</strong> Evaluates your code against all comprehensive hidden test cases, including performance constraints, edge cases, and boundary values.
                </p>
              </div>

              {/* 2. Partial Marking System */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Scale size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>2. Proportional Partial Marking System</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  • Marks are directly proportional to the number of test cases passed.<br />
                  • <em>Example:</em> On a 10-mark question with 4 test cases, if you pass 2 test cases you receive <strong>5 marks</strong>. Passing 3 test cases awards <strong>7.5 marks</strong>, and passing all 4 awards the full <strong>10 marks</strong>.
                </p>
              </div>

              {/* 3. Timer & Auto-Submit */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                  <span>3. Server-Synchronized Timer & Auto-Submit</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  • The countdown timer starts immediately when you enter the workspace and runs on server time.<br />
                  • Closing the browser or refreshing will not pause the clock.<br />
                  • When the timer reaches 00:00:00, your exam will automatically conclude and submit your latest code.
                </p>
              </div>

              {/* 4. Strict Tab-Switch Monitoring & Malpractice Warning */}
              <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" />
                  <span>4. Anti-Cheat Monitoring: DO NOT SWITCH TABS</span>
                </div>
                <div className="text-rose-700 dark:text-rose-300/90 leading-relaxed pl-6 space-y-1">
                  <p>
                    • <strong>Strict Tab-Switch Prohibition:</strong> We are actively monitoring your exam session. Navigating away from the exam tab, minimizing the browser, or switching windows will be flagged and recorded.
                  </p>
                  <p>
                    • <strong>Zero Malicious Activity:</strong> Use of developer tools, browser extensions, generative AI tools, external monitors, or multi-tab searching is strictly prohibited and constitutes an integrity breach.
                  </p>
                  <p>
                    • Repeated infractions will result in immediate disqualification and reporting to the recruiting committee.
                  </p>
                </div>
              </div>

              {/* 5. Final Submission */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <CheckCircle2 size={16} className="text-ubi-700 dark:text-ubi-400" />
                  <span>5. Submission Rules</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  • You can switch between your 3 assigned questions anytime.<br />
                  • Make sure to click <strong>Submit Solution</strong> on each problem before clicking <strong>Finish Exam</strong>.<br />
                  • Results are confidential; individual candidate score breakdowns are finalized upon submission.
                </p>
              </div>
            </div>

            {/* Acknowledgment Checkbox */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl flex items-start gap-3 shadow-sm">
              <input
                id="ack-rules"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-ubi-700 focus:ring-ubi-500 cursor-pointer"
              />
              <label htmlFor="ack-rules" className="text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-medium select-none">
                I have carefully read the assessment instructions above. I understand that tab switching and window focus are continuously monitored, and I agree not to switch tabs or engage in any malicious activities during this assessment.
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedExam(null)}
                disabled={isStarting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartConfirmed}
                disabled={!agreedToTerms || isStarting}
                isLoading={isStarting}
                className="font-semibold gap-1.5"
              >
                <ShieldCheck size={16} />
                <span>Proceed to Assessment</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
