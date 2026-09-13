import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { useExamStore } from '../store/examStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, Award, ShieldAlert, Play, CheckCircle2, ChevronRight } from 'lucide-react';

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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Candidate Assessment Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            UsefulBI Online Coding Assessments
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Welcome to UBIcode. Below are your scheduled coding assessments. When you start an exam, you will be assigned 3 questions (1 Easy + 2 Medium) locked permanently to your account.
          </p>
        </div>
      </div>

      {/* Rules and Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-200">Server-Driven Timer</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your countdown timer is synchronized with the server. If the timer reaches zero, your exam will auto-submit automatically.
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Award size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-200">Scoring & Speed Bonus</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Score depends on test cases passed and speed. Submit early to gain up to a +20% time bonus on each question!
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-amber-600/10 border border-amber-500/20 rounded-xl text-amber-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-200">Sandbox Code Execution</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Code executes securely via Judge0 CE. You can Run your code against sample cases before clicking Submit for all hidden cases.
            </p>
          </div>
        </Card>
      </div>

      {/* Available Exams */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>Active Assessments</span>
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            Failed to load available assessments. Please try refreshing.
          </div>
        ) : exams && exams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-500/40"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{exam.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-500" />
                      {exam.duration_minutes} minutes
                    </span>
                    <span>•</span>
                    <span>3 Questions (1 Easy + 2 Medium)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    onClick={() => handleStartExam(exam.id)}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Play size={16} />
                    <span>Start Assessment</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/exam/${exam.id}/leaderboard`)}
                    className="gap-1.5"
                  >
                    <span>Leaderboard</span>
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-400 text-sm">
            No exams are currently active. Please check back later or contact your administrator.
          </div>
        )}
      </div>
    </div>
  );
};
