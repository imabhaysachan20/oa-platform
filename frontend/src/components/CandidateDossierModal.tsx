import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { CodeEditor } from './CodeEditor';
import { MarkdownRenderer } from './ui/RichTextEditor';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileCode,
  Award,
  Terminal,
  Activity,
  User as UserIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface CandidateDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: number;
  assignmentId: number;
}

export const CandidateDossierModal: React.FC<CandidateDossierModalProps> = ({
  isOpen,
  onClose,
  examId,
  assignmentId,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'proctoring' | 'scoring' | 'network'>('code');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['candidateDossier', examId, assignmentId],
    queryFn: () => adminApi.getCandidateDossier(examId, assignmentId),
    enabled: isOpen && !!examId && !!assignmentId,
  });

  const formatDuration = (seconds?: number | null) => {
    if (seconds === undefined || seconds === null) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const currentQuestion = dossier?.questions?.[selectedQuestionIndex];

  const totalRawEarned = dossier?.raw_score !== null && dossier?.raw_score !== undefined
    ? dossier.raw_score
    : (dossier?.questions || []).reduce((acc, q) => acc + q.final_score, 0);

  const totalMaxWeight = dossier?.max_score !== null && dossier?.max_score !== undefined
    ? dossier.max_score
    : (dossier?.questions || []).reduce((acc, q) => acc + q.difficulty_weight, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Candidate Assessment Dossier"
      maxWidth="7xl"
    >
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          <span className="text-xs text-slate-500 font-mono">Loading full candidate audit trail...</span>
        </div>
      ) : dossier ? (
        <div className="flex flex-col h-[74vh] gap-3.5 overflow-hidden">
          {/* Header Summary Banner */}
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-ubi-100 dark:bg-ubi-900/60 border border-ubi-200 dark:border-ubi-800 flex items-center justify-center font-bold text-ubi-900 dark:text-ubi-200 shrink-0">
                <UserIcon size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {dossier.student_name}
                  </h3>
                  {dossier.roll_no && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      {dossier.roll_no}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {dossier.email} • Exam: {dossier.exam_title}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {/* Score / Rank */}
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Score</span>
                <span className="text-sm font-extrabold text-ubi-800 dark:text-ubi-400 font-mono">
                  {dossier.raw_score !== null && dossier.raw_score !== undefined && dossier.max_score !== null && dossier.max_score !== undefined ? (
                    <>
                      <span>{dossier.raw_score.toFixed(1)} / {dossier.max_score.toFixed(1)} pts</span>
                      {dossier.total_score !== null && dossier.total_score !== undefined && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
                          ({dossier.total_score.toFixed(1)}%)
                        </span>
                      )}
                    </>
                  ) : dossier.total_score !== null && dossier.total_score !== undefined ? (
                    `${dossier.total_score.toFixed(1)}%`
                  ) : (
                    'Unscored'
                  )}
                  {dossier.rank && <span className="text-xs text-slate-500 font-medium ml-1.5">(Rank #{dossier.rank})</span>}
                </span>
              </div>

              {/* Time Taken */}
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Taken</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  {formatDuration(dossier.total_time_sec)}
                </span>
              </div>

              {/* Integrity Status */}
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Integrity Rating</span>
                  <span className="text-xs font-bold font-mono">
                    {dossier.total_flags} flag{dossier.total_flags === 1 ? '' : 's'}
                  </span>
                </div>
                {dossier.integrity_status === 'Clean' ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck size={13} /> Clean
                  </span>
                ) : dossier.integrity_status === 'Warning' ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle size={13} /> Review
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                    <ShieldAlert size={13} /> High Risk
                  </span>
                )}
              </div>

              {/* Network Connectivity Health */}
              <div className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Network Health</span>
                  <span className="text-xs font-bold font-mono">
                    {dossier.disconnect_incidents_count || 0} drop{(dossier.disconnect_incidents_count || 0) === 1 ? '' : 's'}
                  </span>
                </div>
                {dossier.network_status === 'offline' ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                    <WifiOff size={13} /> Offline
                  </span>
                ) : dossier.network_status === 'unstable' ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Wifi size={13} /> Unstable
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Wifi size={13} /> Connected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === 'code'
                    ? 'border-ubi-800 text-ubi-900 dark:border-ubi-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <FileCode size={14} />
                <span>Code Submissions ({dossier.questions.filter((q) => q.has_submission).length}/{dossier.questions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('proctoring')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === 'proctoring'
                    ? 'border-ubi-800 text-ubi-900 dark:border-ubi-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Activity size={14} />
                <span>Anti-Cheat Timeline ({dossier.total_flags} Events)</span>
              </button>

              <button
                onClick={() => setActiveTab('scoring')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === 'scoring'
                    ? 'border-ubi-800 text-ubi-900 dark:border-ubi-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Award size={14} />
                <span>Score Breakdown</span>
              </button>

              <button
                onClick={() => setActiveTab('network')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === 'network'
                    ? 'border-ubi-800 text-ubi-900 dark:border-ubi-400 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Wifi size={14} />
                <span>Network & Session Logs ({dossier.disconnect_incidents_count || 0})</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Code Submissions */}
          {activeTab === 'code' && (
            <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0">
              {/* Question Sidebar (4 cols) */}
              <div className="col-span-4 flex flex-col gap-2 overflow-y-auto pr-1">
                {dossier.questions.map((q, idx) => (
                  <button
                    key={q.question_id}
                    onClick={() => setSelectedQuestionIndex(idx)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                      selectedQuestionIndex === idx
                        ? 'bg-ubi-50/80 dark:bg-ubi-950/40 border-ubi-400 dark:border-ubi-700 shadow-xs'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        Q{idx + 1}. {q.question_title}
                      </span>
                      <Badge variant={q.difficulty as any}>{q.difficulty}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatDuration(q.time_taken_sec)}
                      </span>
                      <span className="font-bold text-ubi-800 dark:text-ubi-400">
                        {q.final_score.toFixed(1)} / {q.difficulty_weight} pts
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] pt-0.5">
                      {q.has_submission ? (
                        q.status === 'Accepted' || q.status === 'Correct' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={11} /> {q.question_type === 'mcq' ? 'Correct' : 'Passed'} ({q.test_cases_passed}/{q.total_test_cases})
                          </span>
                        ) : (
                          <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <XCircle size={11} /> {q.question_type === 'mcq' ? 'Wrong' : q.status} ({q.test_cases_passed}/{q.total_test_cases})
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic">Unattempted</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Question Solution / Code Viewer (8 cols) */}
              <div className="col-span-8 flex flex-col gap-2 overflow-hidden min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                {currentQuestion ? (
                  currentQuestion.question_type === 'mcq' ? (
                    <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto min-h-0 pr-1">
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {currentQuestion.is_multi_select ? 'Multiple Choice (Multi-Select)' : 'Single Choice (Single-Select)'}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Awarded: <span className="font-mono text-ubi-800 dark:text-ubi-400 font-extrabold">{currentQuestion.final_score.toFixed(1)} / {currentQuestion.difficulty_weight} pts</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {currentQuestion.submitted_at && (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              Answered at: {new Date(currentQuestion.submitted_at).toLocaleTimeString()}
                            </span>
                          )}
                          {currentQuestion.status === 'Correct' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 size={13} /> Correct Selection
                            </span>
                          ) : currentQuestion.has_submission ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                              <XCircle size={13} /> Incorrect Selection
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Unattempted
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Description */}
                      {currentQuestion.description && (
                        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed border-b border-slate-100 dark:border-slate-800/80 pb-3">
                          <MarkdownRenderer content={currentQuestion.description} />
                        </div>
                      )}

                      {/* Options & Candidate Answer Review */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <span>Answer Options & Candidate Response:</span>
                          <span className="text-[11px] font-normal normal-case text-slate-400">
                            {currentQuestion.selected_option_ids?.length || 0} selected by candidate
                          </span>
                        </div>

                        {currentQuestion.mcq_options && currentQuestion.mcq_options.length > 0 ? (
                          currentQuestion.mcq_options.map((opt, optIdx) => {
                            const isSelected = Boolean(currentQuestion.selected_option_ids?.includes(opt.id));
                            const isCorrect = Boolean(opt.is_correct);
                            const optLetter = String.fromCharCode(65 + optIdx);

                            let cardStyle = 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                            let badge = null;

                            if (isSelected && isCorrect) {
                              cardStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-400/40';
                              badge = (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shrink-0">
                                  <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" /> Candidate's Selection (Correct)
                                </span>
                              );
                            } else if (isSelected && !isCorrect) {
                              cardStyle = 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400/40';
                              badge = (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700 flex items-center gap-1 shrink-0">
                                  <XCircle size={12} className="text-rose-600 dark:text-rose-400" /> Candidate's Selection (Incorrect)
                                </span>
                              );
                            } else if (!isSelected && isCorrect) {
                              cardStyle = 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 border-dashed text-emerald-900 dark:text-emerald-200';
                              badge = (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                                  <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" /> Correct Answer
                                </span>
                              );
                            }

                            return (
                              <div
                                key={opt.id}
                                className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition ${cardStyle}`}
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 font-mono ${
                                    isSelected
                                      ? (isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')
                                      : (isCorrect ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300')
                                  }`}>
                                    {optLetter}
                                  </span>
                                  <span className="leading-relaxed font-medium pt-0.5 break-words">
                                    {opt.option_text}
                                  </span>
                                </div>
                                {badge}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-400 italic p-3">No options recorded for this question.</div>
                        )}
                      </div>
                    </div>
                  ) : currentQuestion.has_submission && currentQuestion.code ? (
                    <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Candidate's Final Code ({currentQuestion.language || 'text'})
                          </span>
                          {currentQuestion.exec_time_ms && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              ({currentQuestion.exec_time_ms.toFixed(0)}ms)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Submitted at: {currentQuestion.submitted_at ? new Date(currentQuestion.submitted_at).toLocaleTimeString() : '—'}
                        </span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <CodeEditor
                          value={currentQuestion.code}
                          onChange={() => {}}
                          language={currentQuestion.language || 'python'}
                          onLanguageChange={() => {}}
                          readOnly={true}
                          allowPaste={true}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Terminal size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-medium">No code was submitted for this question.</p>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          )}

          {/* Tab 2: Anti-Cheat & Proctoring Timeline */}
          {activeTab === 'proctoring' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0">
              {dossier.proctoring_logs.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 my-2">
                  {dossier.proctoring_logs.map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900"></div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold">
                              {log.event_type}
                            </span>
                            <span>{log.title}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {new Date(log.occurred_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
                  <ShieldCheck size={44} className="text-emerald-500" />
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Clean Assessment Session</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No security or proctoring infractions were triggered by this candidate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Score Breakdown */}
          {activeTab === 'scoring' && (
            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800 font-mono">
                    <tr>
                      <th className="py-3 px-4">Question</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Time Taken</th>
                      <th className="py-3 px-4">Correctness</th>
                      <th className="py-3 px-4">Max Points</th>
                      <th className="py-3 px-4 text-right">Marks Awarded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-xs">
                    {dossier.questions.map((q, idx) => (
                      <tr key={q.question_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">
                          Q{idx + 1}. {q.question_title}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <Badge variant={q.difficulty as any}>{q.difficulty}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {formatDuration(q.time_taken_sec)}
                        </td>
                        <td className="py-3 px-4">
                          {(q.correctness * 100).toFixed(0)}% ({q.test_cases_passed}/{q.total_test_cases})
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {q.difficulty_weight.toFixed(1)} pts
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-ubi-800 dark:text-ubi-400">
                          {q.final_score.toFixed(1)} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-200 dark:border-slate-800 font-mono">
                    <tr className="border-b border-slate-200/60 dark:border-slate-800/60">
                      <td colSpan={4} className="py-2.5 px-4 text-right uppercase text-[11px] text-slate-500">
                        Total Marks Earned:
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        {totalMaxWeight.toFixed(1)} pts
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm text-ubi-800 dark:text-ubi-400 font-extrabold">
                        {totalRawEarned.toFixed(1)} pts
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="py-3 px-4 text-right uppercase text-[11px] text-slate-500">
                        Percentage Score (Normalized / 100):
                      </td>
                      <td className="py-3 px-4 text-right text-base text-ubi-900 dark:text-white font-extrabold">
                        {dossier.total_score !== null && dossier.total_score !== undefined
                          ? `${dossier.total_score.toFixed(1)}%`
                          : totalMaxWeight > 0
                          ? `${((totalRawEarned / totalMaxWeight) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Network & Session Logs */}
          {activeTab === 'network' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
              {/* Summary metrics row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    {dossier.network_status === 'offline' ? (
                      <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                        <WifiOff size={14} /> Currently Offline
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Wifi size={14} /> Online & Connected
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Outage Incidents (&gt;30s)</span>
                  <span className="mt-1 text-sm font-extrabold font-mono text-slate-900 dark:text-white block">
                    {dossier.disconnect_incidents_count || 0}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Disconnected Time</span>
                  <span className="mt-1 text-sm font-extrabold font-mono text-slate-900 dark:text-white block">
                    {formatDuration(dossier.total_offline_seconds)}
                  </span>
                </div>
              </div>

              {/* Incidents timeline */}
              {dossier.network_incidents && dossier.network_incidents.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Recorded Outage & Disconnection Events
                  </h4>
                  <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-3 my-2">
                    {dossier.network_incidents.map((incident) => (
                      <div key={incident.id} className="relative group">
                        {/* Timeline dot */}
                        <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-400 dark:bg-slate-600 border-2 border-white dark:border-slate-900"></div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                                {incident.reason}
                              </span>
                              <span>Offline Duration: {formatDuration(incident.duration_seconds)}</span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {new Date(incident.disconnected_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Connection was lost at {new Date(incident.disconnected_at).toLocaleTimeString()} and restored at{' '}
                            {incident.reconnected_at ? new Date(incident.reconnected_at).toLocaleTimeString() : 'In Progress'}.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
                  <Wifi size={44} className="text-emerald-500" />
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Stable Connection Throughout</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      This candidate experienced zero connection dropouts or unexpected shutdowns.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end pt-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
              Close Dossier
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-slate-500 text-xs">
          Candidate data could not be retrieved.
        </div>
      )}
    </Modal>
  );
};
