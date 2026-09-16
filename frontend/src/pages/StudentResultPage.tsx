import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CheckCircle, LogOut, Trophy, ArrowRight, Home } from 'lucide-react';

export const StudentResultPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['myExamResult', id],
    queryFn: () => examsApi.getResult(id),
    enabled: !!id,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">Processing submission...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <Card className="space-y-4">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">Could not retrieve submission status.</p>
          <Button onClick={handleLogout}>Log Out</Button>
        </Card>
      </div>
    );
  }

  // Student View: Just "Thank you for attending" and Logout screen
  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fadeIn">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-2xl text-center space-y-6">
          {/* UsefulBI Logo */}
          <div className="inline-flex items-center justify-center">
            <img
              src="/UsefulBI_Logo_Main.webp"
              alt="UsefulBI"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Success Check Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm animate-scaleIn">
              <CheckCircle size={44} />
            </div>
          </div>

          {/* Thank you message */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Thank you for attending!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your test has been successfully submitted. You may now safely log out of the testing platform.
            </p>
          </div>

          {/* Logout Action */}
          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleLogout}
              className="w-full justify-center gap-2 font-bold text-base py-3 shadow-md"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Admin View (when admin inspects an exam result)
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-br from-ubi-50/80 via-white to-slate-50 dark:from-ubi-950/60 dark:via-slate-900 dark:to-slate-900 border border-ubi-200/80 dark:border-ubi-800/40 rounded-2xl p-8 shadow-sm dark:shadow-2xl text-center relative overflow-hidden">
        <div className="inline-flex items-center justify-center mb-4">
          <img
            src="/UsefulBI_Logo_Main.webp"
            alt="UsefulBI"
            className="h-10 w-auto object-contain"
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Admin Review: Assessment Completed
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold mt-1">
          {result.exam_title}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 min-w-[160px] shadow-sm">
            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Score
            </span>
            <span className="text-3xl font-extrabold text-ubi-800 dark:text-ubi-400">
              {result.total_score?.toFixed(1) ?? '0.0'}
              <span className="text-sm text-slate-400 font-normal"> / 100</span>
            </span>
          </div>

          {result.rank !== null && result.rank !== undefined && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 min-w-[160px] shadow-sm">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Admin Rank
              </span>
              <span className="text-3xl font-extrabold text-amber-500 flex items-center justify-center gap-1">
                <Trophy size={22} />
                <span>#{result.rank}</span>
              </span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 min-w-[160px] shadow-sm">
            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Status
            </span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 capitalize mt-1 block">
              {result.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {result.question_scores && result.question_scores.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Admin Review: Question Performance Breakdown</span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {result.question_scores.map((qs, idx) => (
              <Card key={qs.question_id} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Q{idx + 1}.
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{qs.question_title}</h3>
                    <Badge variant={qs.difficulty as any}>{qs.difficulty}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Question Score:</span>
                    <span className="text-base font-extrabold text-ubi-800 dark:text-ubi-400 font-mono">
                      {qs.final_score.toFixed(2)} / {qs.difficulty_weight.toFixed(1)} pts
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Test Cases Passed</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-200 font-mono text-sm">
                      {(qs.correctness * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Time Taken</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-200 font-mono text-sm">
                      {Math.round(qs.time_taken_sec)} sec
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Score Awarded</span>
                    <span className="font-extrabold text-ubi-700 dark:text-ubi-400 font-mono text-sm">
                      {qs.final_score.toFixed(2)} pts
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 pt-4">
        <Button variant="primary" onClick={() => navigate('/')} className="gap-2 font-semibold">
          <Home size={16} />
          <span>Return to Assessments</span>
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/exam/${id}/leaderboard`)} className="gap-2 font-semibold">
          <span>View Exam Leaderboard (Admin)</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};
