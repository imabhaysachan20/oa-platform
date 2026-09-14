import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useExamStore } from '../store/examStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, Award, ShieldAlert, Play, CheckCircle2, ChevronRight, FileCode2 } from 'lucide-react';

export const StudentExamLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const setExamSession = useExamStore((s) => s.setExamSession);

  const { data: exams, isLoading, error } = useQuery({
    queryKey: ['availableExams'],
    queryFn: examsApi.list,
  });

  const handleStartExam = async (examId: number) => {
    try {
      const res = await examsApi.start(examId);
      setExamSession(
        res.exam_id,
        res.assignment_id,
        'Exam in Progress',
        res.status,
        res.started_at,
        res.deadline_at,
        res.questions
      );
      navigate(`/exam/${examId}/workspace`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start exam');
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
            Welcome to UBIcode. Below are your scheduled technical assessments. Upon clicking <strong>Start Assessment</strong>, you will be assigned 3 questions (1 Easy + 2 Medium) permanently locked to your account with a server-synced deadline timer.
          </p>
        </div>
      </div>

      {/* Rules and Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-ubi-50 dark:bg-ubi-950 border border-ubi-200 dark:border-ubi-800 rounded-xl text-ubi-800 dark:text-ubi-400 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Server-Driven Timer</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Your countdown timer runs on server time. If the deadline passes, your solutions will automatically finalize and submit.
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <Award size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Scoring & Speed Bonus</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Scores reflect test case correctness and solving speed. Early submissions qualify for up to a +20% speed bonus!
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Sandbox Code Execution</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Submissions execute in an isolated sandbox. You can run code against sample cases before clicking Submit Solution.
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
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-ubi-300 dark:hover:border-ubi-700"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
                      Active
                    </span>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/exam/${exam.id}/leaderboard`)}
                    className="w-full sm:w-auto"
                  >
                    Leaderboard
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartExam(exam.id)}
                    className="w-full sm:w-auto font-semibold gap-1.5"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Start Assessment</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active assessments currently scheduled.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
