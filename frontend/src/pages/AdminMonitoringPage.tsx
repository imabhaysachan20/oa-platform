import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Activity, ArrowLeft, RefreshCw, Trophy } from 'lucide-react';

export const AdminMonitoringPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  const { data: monitoring, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminMonitoring', id],
    queryFn: () => adminApi.getMonitoring(id),
    enabled: !!id,
    refetchInterval: 5000, // Live poll every 5s
  });

  const formatRemaining = (seconds: number | undefined | null) => {
    if (seconds === undefined || seconds === null) return '—';
    if (seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/exams')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="text-ubi-800 dark:text-ubi-400" size={24} />
              <span>Live Assessment Monitoring</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Exam #{id} • Real-time candidate activity (Auto-refreshing every 5s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/exam/${id}/leaderboard`)}
            className="gap-1.5 font-semibold"
          >
            <Trophy size={14} className="text-amber-500" />
            <span>View Leaderboard</span>
          </Button>
        </div>
      </div>

      {/* Monitoring Grid */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          </div>
        ) : monitoring && monitoring.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Candidate</th>
                  <th className="py-3.5 px-4 font-bold">Roll No</th>
                  <th className="py-3.5 px-4 font-bold">Session Status</th>
                  <th className="py-3.5 px-4 font-bold">Time Remaining</th>
                  <th className="py-3.5 px-4 font-bold">Submissions</th>
                  <th className="py-3.5 px-4 font-bold">Current Score</th>
                  <th className="py-3.5 px-4 font-bold">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono text-xs">
                {monitoring.map((row) => (
                  <tr key={row.assignment_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{row.roll_no || '—'}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          row.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                            : row.status === 'submitted'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : row.status === 'auto_submitted'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === 'in_progress' ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatRemaining(row.time_remaining_sec)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {row.submissions_count}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-ubi-800 dark:text-ubi-400 text-sm">
                      {row.current_score !== null && row.current_score !== undefined
                        ? row.current_score.toFixed(1)
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {row.started_at ? new Date(row.started_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
            No candidates have started this assessment yet.
          </div>
        )}
      </Card>
    </div>
  );
};
