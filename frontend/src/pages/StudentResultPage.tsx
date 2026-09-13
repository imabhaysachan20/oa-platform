import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Award, Trophy, Clock, CheckCircle, ArrowRight, Home } from 'lucide-react';

export const StudentResultPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['myExamResult', id],
    queryFn: () => examsApi.getResult(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-sm text-slate-400 font-mono">Aggregating test results & scores...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <Card className="space-y-4">
          <p className="text-sm text-rose-400">Could not retrieve exam results.</p>
          <Button onClick={() => navigate('/')}>Return to Assessments</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 animate-fadeIn">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-4 text-indigo-400">
          <Award size={36} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Assessment Completed
        </h1>
        <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
          {result.exam_title}
        </p>

        {/* Score & Rank Highlight */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-6 py-4 min-w-[160px]">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Score
            </span>
            <span className="text-3xl font-extrabold text-indigo-400">
              {result.total_score.toFixed(1)}
              <span className="text-sm text-slate-500 font-normal"> / 100</span>
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-6 py-4 min-w-[160px]">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current Rank
            </span>
            <span className="text-3xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
              <Trophy size={22} />
              <span>#{result.rank ?? '-'}</span>
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-6 py-4 min-w-[160px]">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Submission Status
            </span>
            <span className="text-base font-bold text-emerald-400 capitalize mt-1 block">
              {result.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Question Breakdown Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>Question Performance Breakdown</span>
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {result.question_scores.map((qs, idx) => (
            <Card key={qs.question_id} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-slate-400">
                    Q{idx + 1}.
                  </span>
                  <h3 className="font-bold text-slate-200">{qs.question_title}</h3>
                  <Badge variant={qs.difficulty as any}>{qs.difficulty}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Question Score:</span>
                  <span className="text-base font-extrabold text-indigo-400 font-mono">
                    {qs.final_score.toFixed(2)} pts
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Correctness</span>
                  <span className="font-bold text-slate-200 font-mono">
                    {(qs.correctness * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Time Taken</span>
                  <span className="font-bold text-slate-200 font-mono">
                    {Math.round(qs.time_taken_sec)} sec
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Speed Bonus</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    +{(qs.time_bonus * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Navigation Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button variant="secondary" onClick={() => navigate('/')} className="gap-2">
          <Home size={16} />
          <span>Home</span>
        </Button>
        <Button onClick={() => navigate(`/exam/${id}/leaderboard`)} className="gap-2">
          <span>View Exam Leaderboard</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};
