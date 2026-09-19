import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '../api/exams';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Clock,
  ShieldAlert,
  Play,
  CheckCircle2,
  Check,
  FileCode2,
  AlertTriangle,
  Scale,
  Calendar
} from 'lucide-react';

export const StudentExamLandingPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: exams, isLoading, error } = useQuery({
    queryKey: ['availableExams'],
    queryFn: examsApi.list,
  });

  const formatScheduleIST = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    const dateFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    }).format(start);
    const startFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(start);

    if (end) {
      const endFormatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(end);
      return `${dateFormatted}, ${startFormatted} – ${endFormatted} IST`;
    }
    return `${dateFormatted} at ${startFormatted} IST`;
  };

  const handleOpenInstructions = (exam: any) => {
    const now = new Date().getTime();
    if (exam.start_time && now < new Date(exam.start_time).getTime()) {
      navigate(`/exam/${exam.id}/waiting-room`);
      return;
    }
    navigate(`/exam/${exam.id}/instructions`);
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
            Welcome to UBIcode. Below are your scheduled technical assessments. Upon clicking <strong>Start Assessment</strong>, you will review the test rules and proctoring instructions before entering your dedicated workspace.
          </p>
        </div>
      </div>

      {/* Rules and Key Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-ubi-50 dark:bg-ubi-950 border border-ubi-200 dark:border-ubi-800 rounded-xl text-ubi-800 dark:text-ubi-400 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Server-Driven Timer</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Assessment countdown is synchronized with the server. When the timer expires, all current code is automatically submitted.
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Exact Partial Marking</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Marks are awarded based on test cases passed (e.g. passing 2 of 4 test cases on a 10-mark question yields 5 marks).
            </p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Anti-Cheat Proctoring</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Window focus and tab switching are monitored in real time. Do not switch tabs or engage in unauthorized activities.
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
            {exams.map((exam) => {
              const now = new Date().getTime();
              const isCompleted = exam.is_completed || exam.assignment_status === 'submitted' || exam.assignment_status === 'auto_submitted';
              const isInProgress = !isCompleted && exam.assignment_status === 'in_progress';
              const isUpcoming = !isCompleted && (exam.is_upcoming || (exam.start_time && now < new Date(exam.start_time).getTime()));
              const isExpired = !isCompleted && !isInProgress && (exam.is_expired || (exam.end_time && now > new Date(exam.end_time).getTime()));

              const scheduleText = formatScheduleIST(exam.start_time, exam.end_time);

              return (
                <Card
                  key={exam.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-ubi-300 dark:hover:border-ubi-700"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.title}</h3>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 flex items-center gap-1">
                          <Check size={10} className="text-emerald-500" />
                          Completed
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
                          In Progress
                        </span>
                      ) : isUpcoming ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ubi-50 text-ubi-700 border border-ubi-200 dark:bg-ubi-950/60 dark:text-ubi-300 dark:border-ubi-800 flex items-center gap-1 font-semibold">
                          <Clock size={10} className="text-ubi-600 dark:text-ubi-400" />
                          Upcoming
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30">
                          Closed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock size={14} className="text-slate-400" />
                        Duration: {exam.duration_minutes} minutes
                      </span>
                      {scheduleText && (
                        <span className="flex items-center gap-1.5 font-medium text-ubi-800 dark:text-ubi-300">
                          <Calendar size={14} className="text-ubi-700 dark:text-ubi-400" />
                          {scheduleText}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 font-medium">
                        <FileCode2 size={14} className="text-slate-400" />
                        {(() => {
                          const easy = exam.easy_count ?? 1;
                          const med = exam.medium_count ?? 2;
                          const hard = exam.hard_count ?? 0;
                          const mcq = exam.mcq_count ?? 0;
                          const totalCoding = easy + med + hard;
                          const parts: string[] = [];
                          if (easy > 0) parts.push(`${easy} Easy`);
                          if (med > 0) parts.push(`${med} Medium`);
                          if (hard > 0) parts.push(`${hard} Hard`);
                          const codingDesc = totalCoding > 0
                            ? `${totalCoding} Coding Questions (${parts.join(', ')})`
                            : '';
                          if (mcq > 0 && totalCoding > 0) {
                            return `${mcq} MCQs + ${codingDesc}`;
                          } else if (mcq > 0) {
                            return `${mcq} Multiple Choice Questions`;
                          } else if (totalCoding > 0) {
                            return codingDesc;
                          }
                          return 'Assessment Questions';
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {isCompleted ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full sm:w-auto font-semibold gap-1.5 opacity-60 cursor-not-allowed text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Completed</span>
                      </Button>
                    ) : isInProgress ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          if (!document.fullscreenElement) {
                            await document.documentElement.requestFullscreen().catch(() => {});
                          }
                          navigate(`/exam/${exam.id}/workspace`);
                        }}
                        className="w-full sm:w-auto font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Resume Assessment</span>
                      </Button>
                    ) : isUpcoming ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/exam/${exam.id}/instructions`)}
                        className="w-full sm:w-auto font-semibold gap-1.5"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Start Assessment</span>
                      </Button>
                    ) : isExpired ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full sm:w-auto font-semibold gap-1.5 opacity-60 cursor-not-allowed text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      >
                        <span>Closed</span>
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenInstructions(exam)}
                        className="w-full sm:w-auto font-semibold gap-1.5"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Start Assessment</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
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
