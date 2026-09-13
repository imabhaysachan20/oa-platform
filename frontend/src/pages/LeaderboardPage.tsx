import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trophy, ArrowLeft, Medal } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['examLeaderboard', id],
    queryFn: () => examsApi.getLeaderboard(id),
    enabled: !!id,
    refetchInterval: 10000, // Refresh every 10s
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              <span>Assessment Leaderboard</span>
            </h1>
            <p className="text-xs text-slate-400">Live rankings for Exam #{id}</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>

      {/* Leaderboard Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Rank</th>
                  <th className="py-3.5 px-4 font-semibold">Student Name</th>
                  <th className="py-3.5 px-4 font-semibold">Roll No</th>
                  <th className="py-3.5 px-4 font-semibold">Score</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {leaderboard.map((row) => (
                  <tr
                    key={row.rank + row.student_name}
                    className={`hover:bg-slate-800/40 transition ${
                      row.rank === 1
                        ? 'bg-amber-500/5'
                        : row.rank === 2
                        ? 'bg-slate-300/5'
                        : row.rank === 3
                        ? 'bg-amber-700/5'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                      {row.rank === 1 ? (
                        <Medal size={16} className="text-amber-400" />
                      ) : row.rank === 2 ? (
                        <Medal size={16} className="text-slate-300" />
                      ) : row.rank === 3 ? (
                        <Medal size={16} className="text-amber-600" />
                      ) : (
                        <span className="text-slate-500 ml-1">#{row.rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-100">
                      {row.student_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{row.roll_no || '—'}</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-400 text-sm">
                      {row.total_score.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 capitalize">
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {row.submitted_at
                        ? new Date(row.submitted_at).toLocaleTimeString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-sm">
            No submissions recorded yet for this assessment.
          </div>
        )}
      </Card>
    </div>
  );
};
