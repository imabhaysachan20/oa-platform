import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Activity, ArrowLeft, Clock, RefreshCw, Send, CheckCircle } from 'lucide-react';

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
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Activity className="text-indigo-400" size={24} />
              <span>Live Assessment Monitoring</span>
            </h1>
            <p className="text-xs text-slate-400">
              Exam #{id} • Real-time candidate activity (Auto-refreshing 5s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/exam/${id}/leaderboard`)}
          >
            View Leaderboard
          </Button>
        </div>
      </div>

      {/* Monitoring Grid */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : monitoring && monitoring.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase tracking-wider text-[11px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Candidate</th>
                  <th className="py-3.5 px-4 font-semibold">Roll No</th>
                  <th className="py-3.5 px-4 font-semibold">Session Status</th>
                  <th className="py-3.5 px-4 font-semibold">Time Remaining</th>
                  <th className="py-3.5 px-4 font-semibold">Submissions</th>
                  <th className="py-3.5 px-4 font-semibold">Score</th>
                  <th className="py-3.5 px-4 font-semibold">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {monitoring.map((row) => (
                  <tr key={row.assignment_id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-slate-100">{row.name}</div>
                      <div className="text-[11px] text-slate-500">{row.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{row.roll_no || '—'}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border capitalize ${
                          row.status === 'in_progress'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : row.status === 'submitted'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : row.status === 'auto_submitted'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === 'in_progress' ? (
                        <span className="font-bold text-amber-400">
                          {formatRemaining(row.time_remaining_sec)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-indigo-400 font-semibold">{row.submissions_count}</span>{' '}
                      runs/subs
                    </td>
                    <td className="py-3.5 px-4">
                      {row.current_score !== null && row.current_score !== undefined ? (
                        <span className="font-bold text-emerald-400 text-sm">
                          {row.current_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {row.started_at
                        ? new Date(row.started_at).toLocaleTimeString()
                        : 'Not Started'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-xs">
            No candidates have started or attempted this assessment yet.
          </div>
        )}
      </Card>
    </div>
  );
};
