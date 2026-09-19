import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  Trophy,
  FileText,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  WifiOff,
  Radio,
  Users,
  Clock,
} from 'lucide-react';
import { CandidateDossierModal } from '../components/CandidateDossierModal';

export const AdminMonitoringPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'in_progress' | 'disconnected'>('all');

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

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  // Metrics summary
  const metrics = useMemo(() => {
    if (!monitoring) return { total: 0, inProgress: 0, online: 0, disconnected: 0 };
    const inProgress = monitoring.filter((r) => r.status === 'in_progress');
    const online = inProgress.filter((r) => r.network_status === 'online');
    const disconnected = inProgress.filter((r) => r.network_status === 'offline');
    return {
      total: monitoring.length,
      inProgress: inProgress.length,
      online: online.length,
      disconnected: disconnected.length,
    };
  }, [monitoring]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!monitoring) return [];
    if (filterMode === 'in_progress') {
      return monitoring.filter((r) => r.status === 'in_progress');
    }
    if (filterMode === 'disconnected') {
      return monitoring.filter(
        (r) => r.status === 'in_progress' && r.network_status === 'offline'
      );
    }
    return monitoring;
  }, [monitoring, filterMode]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
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
              Exam #{id} • Real-time candidate activity & network health (Auto-refreshing every 5s)
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Enrolled Candidates</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{metrics.total}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Radio size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{metrics.inProgress}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Wifi size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Online & Active</span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{metrics.online}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center gap-3 transition ${
          metrics.disconnected > 0
            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            metrics.disconnected > 0
              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 animate-pulse'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <WifiOff size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Disconnected (&gt;30s)</span>
            <span className={`text-xl font-extrabold font-mono ${
              metrics.disconnected > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
            }`}>
              {metrics.disconnected}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filterMode === 'all'
              ? 'bg-ubi-800 text-white dark:bg-ubi-600'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
          }`}
        >
          All Candidates ({metrics.total})
        </button>

        <button
          onClick={() => setFilterMode('in_progress')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filterMode === 'in_progress'
              ? 'bg-ubi-800 text-white dark:bg-ubi-600'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
          }`}
        >
          In Progress ({metrics.inProgress})
        </button>

        <button
          onClick={() => setFilterMode('disconnected')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            filterMode === 'disconnected'
              ? 'bg-rose-600 text-white'
              : metrics.disconnected > 0
              ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
          }`}
        >
          <WifiOff size={13} />
          <span>Disconnected Only ({metrics.disconnected})</span>
        </button>
      </div>

      {/* Monitoring Grid */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          </div>
        ) : filteredRows && filteredRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Candidate</th>
                  <th className="py-3.5 px-4 font-bold">Roll No</th>
                  <th className="py-3.5 px-4 font-bold">Session Status</th>
                  <th className="py-3.5 px-4 font-bold">Network Health</th>
                  <th className="py-3.5 px-4 font-bold">Disconnects</th>
                  <th className="py-3.5 px-4 font-bold">Time Left</th>
                  <th className="py-3.5 px-4 font-bold">Submissions</th>
                  <th className="py-3.5 px-4 font-bold">Score (Pts / %)</th>
                  <th className="py-3.5 px-4 font-bold">Anti-Cheat Flags</th>
                  <th className="py-3.5 px-4 font-bold">Started At</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono text-xs">
                {filteredRows.map((row) => (
                  <tr
                    key={row.assignment_id}
                    className={`transition ${
                      row.status === 'in_progress' && row.network_status === 'offline'
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/60 dark:hover:bg-rose-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{row.roll_no || '—'}</td>
                    
                    {/* Session Status */}
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

                    {/* Network Status Liveness */}
                    <td className="py-3.5 px-4 font-sans">
                      {row.status === 'in_progress' ? (
                        row.network_status === 'online' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Online</span>
                            {row.seconds_since_last_ping !== null && row.seconds_since_last_ping !== undefined && (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-300 font-normal">
                                ({Math.round(row.seconds_since_last_ping)}s)
                              </span>
                            )}
                          </span>
                        ) : row.network_status === 'unstable' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Unstable</span>
                            {row.seconds_since_last_ping !== null && row.seconds_since_last_ping !== undefined && (
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-300 font-normal">
                                ({Math.round(row.seconds_since_last_ping)}s)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                            <WifiOff size={11} />
                            <span>Offline</span>
                            {row.seconds_since_last_ping !== null && row.seconds_since_last_ping !== undefined ? (
                              <span className="text-[10px] font-mono text-rose-600 dark:text-rose-300 font-normal">
                                ({Math.round(row.seconds_since_last_ping)}s)
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-normal">(&gt;30s)</span>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Disconnects / Outages Logged */}
                    <td className="py-3.5 px-4 font-sans">
                      {row.disconnect_incidents_count && row.disconnect_incidents_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          <WifiOff size={11} className="text-slate-500" />
                          <span>
                            {row.disconnect_incidents_count} drop{row.disconnect_incidents_count === 1 ? '' : 's'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            ({formatDuration(row.total_offline_seconds)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0 drops</span>
                      )}
                    </td>

                    {/* Time Remaining */}
                    <td className="py-3.5 px-4">
                      {row.status === 'in_progress' ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatRemaining(row.time_remaining_sec)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Submissions */}
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {row.submissions_count}
                    </td>

                    {/* Current Score */}
                    <td className="py-3.5 px-4 font-sans">
                      {row.raw_score !== null && row.raw_score !== undefined && row.max_score !== null && row.max_score !== undefined ? (
                        <div className="flex flex-col font-mono">
                          <span className="font-extrabold text-ubi-800 dark:text-ubi-400 text-sm">
                            {row.raw_score.toFixed(1)} <span className="text-slate-400 font-medium text-xs">/ {row.max_score.toFixed(1)}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                            {row.current_score !== null && row.current_score !== undefined ? `${row.current_score.toFixed(1)}%` : ''}
                          </span>
                        </div>
                      ) : row.current_score !== null && row.current_score !== undefined ? (
                        <span className="font-extrabold text-ubi-800 dark:text-ubi-400 text-sm font-mono">
                          {row.current_score.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Anti-Cheat Flags (Pure security violations) */}
                    <td className="py-3.5 px-4 font-sans">
                      {(!row.flags_count || row.flags_count === 0) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck size={12} /> Clean (0)
                        </span>
                      ) : row.flags_count <= 2 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle size={12} /> {row.flags_count} Flags
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                          <ShieldAlert size={12} /> {row.flags_count} Flags (High)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {row.started_at ? new Date(row.started_at).toLocaleTimeString() : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssignmentId(row.assignment_id)}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <FileText size={13} className="text-ubi-800 dark:text-ubi-400" />
                        <span>View Dossier</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
            {filterMode === 'disconnected'
              ? 'No candidates are currently disconnected.'
              : 'No candidates match the current filter.'}
          </div>
        )}
      </Card>

      {/* Candidate Detailed Dossier Modal */}
      {selectedAssignmentId && (
        <CandidateDossierModal
          isOpen={!!selectedAssignmentId}
          onClose={() => setSelectedAssignmentId(null)}
          examId={id}
          assignmentId={selectedAssignmentId}
        />
      )}
    </div>
  );
};
