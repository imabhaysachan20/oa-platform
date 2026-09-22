import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { examsApi } from '../api/exams';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { CandidateDossierModal } from '../components/CandidateDossierModal';
import { LeaderboardEntry, LeaderboardResponse } from '../types';
import {
  Trophy,
  ArrowLeft,
  Medal,
  Download,
  Search,
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Code,
  CheckSquare,
  RefreshCw,
  Layers,
  GraduationCap,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  // Query state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<'rank' | 'score' | 'name' | 'violations'>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'not_started' | 'in_progress' | 'submitted' | 'auto_submitted'
  >('all');

  // Modal & export states
  const [viewingAssignmentId, setViewingAssignmentId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Exam Metadata
  const { data: exam } = useQuery({
    queryKey: ['adminExam', id],
    queryFn: () => adminApi.getExam(id),
    enabled: !!id,
  });

  // Fetch Paginated Leaderboard Data
  const {
    data: leaderboardData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<LeaderboardResponse>({
    queryKey: [
      'adminLeaderboard',
      id,
      page,
      pageSize,
      sortBy,
      sortDir,
      debouncedSearch,
      collegeFilter,
      groupFilter,
      statusFilter,
    ],
    queryFn: () =>
      adminApi.getExamLeaderboard(id, {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
        search: debouncedSearch || undefined,
        college: collegeFilter || undefined,
        candidate_group: groupFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: !!id,
    refetchInterval: 15000,
  });

  // Column Sort Handler
  const handleSort = (column: 'rank' | 'score' | 'name' | 'violations') => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      // Sensible default directions
      setSortDir(column === 'score' || column === 'violations' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  // Excel Export Handler
  const handleExportExcel = async () => {
    if (!id) return;
    try {
      setIsExporting(true);
      const { data: blob, filename } = await adminApi.exportExamLeaderboard(id, {
        sort_by: sortBy,
        sort_dir: sortDir,
        search: debouncedSearch || undefined,
        college: collegeFilter || undefined,
        candidate_group: groupFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export results:', err);
      alert(err?.response?.data?.detail || 'Failed to export leaderboard report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Render Sort Indicator Helper
  const renderSortIndicator = (column: 'rank' | 'score' | 'name' | 'violations') => {
    if (sortBy !== column) {
      return <ArrowUpDown size={13} className="text-slate-400 opacity-60" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={13} className="text-ubi-800 dark:text-ubi-400 font-bold" />
    ) : (
      <ArrowDown size={13} className="text-ubi-800 dark:text-ubi-400 font-bold" />
    );
  };

  // Helper: Format Time Duration
  const formatTimeTaken = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return '—';
    const totalSecs = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  // Helper: Render Status Badge
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'submitted') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 capitalize">
          Submitted
        </span>
      );
    }
    if (s === 'auto_submitted') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 capitalize">
          Auto Submitted
        </span>
      );
    }
    if (s === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 capitalize">
        Not Started
      </span>
    );
  };

  // Helper: Render Violations Badge
  const renderViolationsBadge = (row: LeaderboardEntry) => {
    const count = row.total_violation_count;
    if (count === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>0 Clean</span>
        </span>
      );
    }
    if (count <= 2) {
      return (
        <span
          title={`Tab Switches: ${row.tab_switch_count}, Exits: ${row.fullscreen_exit_count}, Blurs: ${row.blur_count}, Clipboard: ${row.clipboard_block_count}, DevTools: ${row.devtools_attempt_count}, Nav: ${row.navigation_block_count}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 cursor-help"
        >
          <AlertTriangle size={12} className="text-amber-500" />
          <span>{count} Warning</span>
        </span>
      );
    }
    return (
      <span
        title={`Tab Switches: ${row.tab_switch_count}, Exits: ${row.fullscreen_exit_count}, Blurs: ${row.blur_count}, Clipboard: ${row.clipboard_block_count}, DevTools: ${row.devtools_attempt_count}, Nav: ${row.navigation_block_count}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 cursor-help"
      >
        <ShieldAlert size={12} className="text-rose-500" />
        <span>{count} High Risk</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/exams')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
            title="Back to Assessment Management"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="text-amber-500" size={24} />
                <span>{exam ? exam.title : `Assessment #${id}`} — Leaderboard</span>
              </h1>
              {isRefetching && (
                <RefreshCw size={14} className="text-slate-400 animate-spin" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex flex-wrap items-center gap-2">
              <span>Canonical rankings & integrity audit trail</span>
              {exam && (
                <>
                  <span>•</span>
                  <span>Duration: {exam.duration_minutes} min</span>
                  <span>•</span>
                  <span>
                    Pattern: {exam.easy_count ?? 1}E + {exam.medium_count ?? 2}M + {exam.hard_count ?? 0}H
                    {exam.mcq_count ? ` + ${exam.mcq_count} MCQ` : ''}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting || (leaderboardData?.total_count === 0)}
            className="gap-2 font-semibold text-xs py-2 px-3.5"
            title="Export filtered leaderboard to Excel (.xlsx)"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span>{isExporting ? 'Generating Excel...' : 'Export to Excel'}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => refetch()}
            className="gap-1.5 text-xs py-2 px-3"
            title="Refresh Leaderboard"
          >
            <RefreshCw size={13} className={isRefetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter & Controls Card */}
      <Card className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by name, email, or roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* College Filter */}
          <div className="relative">
            <GraduationCap className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Filter by college / institution..."
              value={collegeFilter}
              onChange={(e) => {
                setCollegeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
            {collegeFilter && (
              <button
                type="button"
                onClick={() => {
                  setCollegeFilter('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Candidate Group Filter */}
          <div className="relative">
            <Layers className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Filter by candidate group / batch..."
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-ubi-800 focus:outline-none transition"
            />
            {groupFilter && (
              <button
                type="button"
                onClick={() => {
                  setGroupFilter('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {(
              [
                { id: 'all', label: 'All Candidates' },
                { id: 'submitted', label: 'Submitted' },
                { id: 'auto_submitted', label: 'Auto Submitted' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'not_started', label: 'Not Started' },
              ] as const
            ).map((st) => {
              const isActive = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition border ${
                    isActive
                      ? 'bg-ubi-800 text-white border-ubi-900 dark:bg-ubi-700 dark:border-ubi-600 shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total Candidates: <strong className="text-slate-900 dark:text-white">{leaderboardData?.total_count || 0}</strong>
          </div>
        </div>
      </Card>

      {/* Main Results Table Card */}
      <Card className="p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading assessment rankings & proctoring records...</p>
          </div>
        ) : leaderboardData && leaderboardData.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('rank')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Rank</span>
                      {renderSortIndicator('rank')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Candidate</span>
                      {renderSortIndicator('name')}
                    </div>
                  </th>

                  <th className="py-3 px-4 font-bold">Status</th>

                  <th
                    onClick={() => handleSort('score')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Score</span>
                      {renderSortIndicator('score')}
                    </div>
                  </th>

                  <th className="py-3 px-4 font-bold">Coding Solved</th>

                  <th className="py-3 px-4 font-bold">MCQ Correct</th>

                  <th className="py-3 px-4 font-bold">Time Taken</th>

                  <th
                    onClick={() => handleSort('violations')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Violations</span>
                      {renderSortIndicator('violations')}
                    </div>
                  </th>

                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-xs">
                {leaderboardData.items.map((row: LeaderboardEntry) => (
                  <tr
                    key={row.assignment_id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                      row.rank === 1
                        ? 'bg-amber-50/30 dark:bg-amber-500/5'
                        : row.rank === 2
                        ? 'bg-slate-100/30 dark:bg-slate-300/5'
                        : row.rank === 3
                        ? 'bg-amber-100/20 dark:bg-amber-700/5'
                        : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 font-bold">
                      <div className="flex items-center gap-1.5">
                        {row.rank === 1 ? (
                          <Medal size={17} className="text-amber-500 drop-shadow-xs" />
                        ) : row.rank === 2 ? (
                          <Medal size={17} className="text-slate-400" />
                        ) : row.rank === 3 ? (
                          <Medal size={17} className="text-amber-700" />
                        ) : row.rank != null ? (
                          <span className="font-mono text-slate-500 dark:text-slate-400 ml-0.5">
                            #{row.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400 ml-1">—</span>
                        )}
                      </div>
                    </td>

                    {/* Candidate Details */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-[13px]">
                          {row.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                          <span>{row.email}</span>
                          {row.roll_no && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{row.roll_no}</span>
                            </>
                          )}
                          {row.college && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{row.college}</span>
                            </>
                          )}
                          {row.candidate_group && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                                {row.candidate_group}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(row.status)}
                    </td>

                    {/* Total Score */}
                    <td className="py-3.5 px-4">
                      {row.total_score != null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-ubi-800 dark:text-ubi-400 text-sm">
                            {row.total_score.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">pts</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    {/* Coding Breakdown */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Code size={13} className="text-slate-400 shrink-0" />
                        <span>
                          <strong className="text-slate-900 dark:text-white">
                            {row.questions_solved_count}
                          </strong>{' '}
                          / {row.total_coding_questions}
                        </span>
                      </div>
                    </td>

                    {/* MCQ Breakdown */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <CheckSquare size={13} className="text-slate-400 shrink-0" />
                        <span>
                          <strong className="text-slate-900 dark:text-white">
                            {row.mcq_correct_count}
                          </strong>{' '}
                          / {row.total_mcq_questions}
                        </span>
                      </div>
                    </td>

                    {/* Time Taken */}
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{formatTimeTaken(row.time_taken_seconds)}</span>
                      </div>
                    </td>

                    {/* Violations */}
                    <td className="py-3.5 px-4">
                      {renderViolationsBadge(row)}
                    </td>

                    {/* Actions: View Dossier */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingAssignmentId(row.assignment_id)}
                        className="gap-1.5 text-[11px] py-1 px-2.5 hover:bg-ubi-50 hover:text-ubi-800 dark:hover:bg-ubi-950 dark:hover:text-ubi-300 font-medium"
                        title="Inspect full candidate proctoring audit log and code submissions"
                      >
                        <ExternalLink size={12} />
                        <span>View Details</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <Trophy className="mx-auto text-slate-300 dark:text-slate-600" size={32} />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No candidates found
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {debouncedSearch || collegeFilter || groupFilter || statusFilter !== 'all'
                ? 'No candidate matches the current search and filter criteria. Try clearing active filters.'
                : 'No candidates have started or been assigned to this assessment yet.'}
            </p>
          </div>
        )}

        {/* Server-Side Pagination Footer */}
        {leaderboardData && leaderboardData.total_count > 0 && (
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800">
            <Pagination
              currentPage={page}
              totalPages={leaderboardData.total_pages}
              totalItems={leaderboardData.total_count}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              itemLabel="candidates"
            />
          </div>
        )}
      </Card>

      {/* Candidate Dossier Inspection Modal */}
      {viewingAssignmentId && (
        <CandidateDossierModal
          isOpen={!!viewingAssignmentId}
          onClose={() => setViewingAssignmentId(null)}
          examId={id}
          assignmentId={viewingAssignmentId}
        />
      )}
    </div>
  );
};
