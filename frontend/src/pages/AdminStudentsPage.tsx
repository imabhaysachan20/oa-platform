import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  UploadCloud,
  Users,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Layers,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  XCircle,
} from 'lucide-react';
import { CandidateImportResponse } from '../types';

export const AdminStudentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [candidateGroup, setCandidateGroup] = useState<string>('');
  const [defaultCollege, setDefaultCollege] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<CandidateImportResponse | null>(null);
  const [showCredentialsPreview, setShowCredentialsPreview] = useState<boolean>(false);

  // Filters state
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Password visibility & copy state for main roster
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Set<number>>(new Set());
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(false);
  const [copiedStudentId, setCopiedStudentId] = useState<number | null>(null);

  // Password visibility & copy state for upload preview
  const [previewRevealedIndices, setPreviewRevealedIndices] = useState<Set<number>>(new Set());
  const [previewShowAll, setPreviewShowAll] = useState<boolean>(false);
  const [copiedPreviewIndex, setCopiedPreviewIndex] = useState<number | null>(null);

  // Fetch groups and colleges list
  const { data: groupsData } = useQuery({
    queryKey: ['adminStudentGroups'],
    queryFn: adminApi.listStudentGroups,
  });

  // Fetch student roster
  const { data: students, isLoading } = useQuery({
    queryKey: ['adminStudents', selectedGroupFilter, selectedCollegeFilter],
    queryFn: () =>
      adminApi.listStudents({
        group: selectedGroupFilter !== 'all' ? selectedGroupFilter : undefined,
        college: selectedCollegeFilter !== 'all' ? selectedCollegeFilter : undefined,
      }),
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (payload: { file: File; candidate_group?: string; default_college?: string }) =>
      adminApi.importStudents(payload),
    onSuccess: (data) => {
      setUploadResult(data);
      setSelectedFile(null);
      setShowCredentialsPreview(data.credentials.length > 0);
      setPreviewRevealedIndices(new Set());
      setPreviewShowAll(false);
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStudentGroups'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Candidate roster import failed');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    importMutation.mutate({
      file: selectedFile,
      candidate_group: candidateGroup.trim() || undefined,
      default_college: defaultCollege.trim() || undefined,
    });
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'name,email,college,roll_no,password\n' +
      'Aarav Sharma,aarav.sharma@iitd.ac.in,IIT Delhi,,\n' +
      'Diya Patel,diya.patel@bits-pilani.ac.in,BITS Pilani,,\n' +
      'Rohan Iyer,rohan.iyer@stanford.edu,Stanford University,STA-2026-9001,CustomPass#123\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_candidate_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadGeneratedCredentials = () => {
    if (!uploadResult || uploadResult.credentials.length === 0) return;

    let csvContent = 'name,email,college,candidate_group,roll_no,password\n';
    for (const c of uploadResult.credentials) {
      const escape = (str?: string) => (str ? `"${str.replace(/"/g, '""')}"` : '""');
      csvContent += `${escape(c.name)},${escape(c.email)},${escape(c.college)},${escape(c.candidate_group)},${escape(c.roll_no)},${escape(c.password || '')}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const groupName = candidateGroup ? candidateGroup.replace(/[^a-zA-Z0-9-_]/g, '_') : 'batch';
    link.setAttribute('download', `candidate_credentials_${groupName}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Main table password helpers
  const toggleStudentPassword = (id: number) => {
    setRevealedPasswordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleShowAllPasswords = () => {
    if (showAllPasswords) {
      setShowAllPasswords(false);
      setRevealedPasswordIds(new Set());
    } else {
      setShowAllPasswords(true);
      if (students) {
        setRevealedPasswordIds(new Set(students.map((s) => s.id)));
      }
    }
  };

  const copyStudentPassword = (password: string, id: number) => {
    navigator.clipboard.writeText(password);
    setCopiedStudentId(id);
    setTimeout(() => setCopiedStudentId(null), 2000);
  };

  // Preview table password helpers
  const togglePreviewPassword = (index: number) => {
    setPreviewRevealedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const togglePreviewShowAll = () => {
    if (previewShowAll) {
      setPreviewShowAll(false);
      setPreviewRevealedIndices(new Set());
    } else {
      setPreviewShowAll(true);
      if (uploadResult) {
        setPreviewRevealedIndices(new Set(uploadResult.credentials.map((_, i) => i)));
      }
    }
  };

  const copyPreviewPassword = (password: string, index: number) => {
    navigator.clipboard.writeText(password);
    setCopiedPreviewIndex(index);
    setTimeout(() => setCopiedPreviewIndex(null), 2000);
  };

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.roll_no && s.roll_no.toLowerCase().includes(query)) ||
        (s.college && s.college.toLowerCase().includes(query)) ||
        (s.candidate_group && s.candidate_group.toLowerCase().includes(query))
    );
  }, [students, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Candidate Roster & Bulk Import
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Upload CSV or Excel (<code className="font-mono text-ubi-700 dark:text-ubi-300">.xlsx</code>) rosters with dynamic roll number and password generation, college tagging, and candidate group management for batch email pipelines.
        </p>
      </div>

      {/* CSV / Excel Upload Card */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UploadCloud size={18} className="text-ubi-800 dark:text-ubi-400" />
              <span>Import Candidates (CSV / Excel)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Columns: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-ubi-800 dark:text-ubi-300 font-mono text-[11px]">name, email, college</code> (Optional: <code className="font-mono text-[11px] text-slate-600 dark:text-slate-400">roll_no, password</code>).
              If roll number or password are left empty, they will be dynamically generated.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadSampleCsv}
            className="gap-1.5 self-start font-semibold text-xs"
          >
            <Download size={14} />
            <span>Download Sample Template</span>
          </Button>
        </div>

        {/* Batch & College inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Candidate Group / Batch Tag
            </label>
            <div className="relative">
              <input
                type="text"
                value={candidateGroup}
                onChange={(e) => setCandidateGroup(e.target.value)}
                placeholder="e.g. IIT Delhi 2026, Summer Drive, Batch A"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 pl-8"
              />
              <Layers size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Assigns this batch to a group for automated test invitations and email distribution.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Default College (Fallback)
            </label>
            <div className="relative">
              <input
                type="text"
                value={defaultCollege}
                onChange={(e) => setDefaultCollege(e.target.value)}
                placeholder="e.g. IIT Delhi, BITS Pilani"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 pl-8"
              />
              <Building2 size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Applies to rows where the college column is empty or missing.
            </p>
          </div>
        </div>

        {/* Dropzone */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-ubi-400 dark:hover:border-ubi-600 rounded-xl p-6 text-center transition bg-slate-50 dark:bg-slate-950/40">
          <input
            type="file"
            accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
            onChange={handleFileChange}
            id="file-upload"
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer block space-y-2">
            <FileSpreadsheet
              size={34}
              className="mx-auto text-slate-400 dark:text-slate-500 hover:text-ubi-800 dark:hover:text-ubi-400 transition"
            />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {selectedFile ? selectedFile.name : 'Click or drop a CSV or Excel (.xlsx) file here to upload'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Supported formats: <span className="font-semibold text-slate-600 dark:text-slate-400">CSV (.csv)</span> or <span className="font-semibold text-slate-600 dark:text-slate-400">Excel (.xlsx)</span>
            </p>
          </label>
        </div>

        {selectedFile && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <span>Ready to import:</span>
              <strong className="text-slate-900 dark:text-slate-200 font-mono">{selectedFile.name}</strong>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleUpload}
              isLoading={importMutation.isPending}
              className="font-semibold px-4"
            >
              Upload & Process Roster
            </Button>
          </div>
        )}

        {/* Upload Summary & Credentials Export Banner */}
        {uploadResult && (
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Successfully imported {uploadResult.created_count} candidates
                  {uploadResult.skipped_count > 0 && ` (${uploadResult.skipped_count} skipped/duplicates)`}.
                </span>
              </div>

              {uploadResult.credentials.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCredentialsPreview(!showCredentialsPreview)}
                    className="text-xs gap-1.5 bg-white dark:bg-slate-900"
                  >
                    {showCredentialsPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showCredentialsPreview ? 'Hide Preview' : 'Preview List'}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={downloadGeneratedCredentials}
                    className="text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm"
                  >
                    <Download size={14} />
                    <span>Download Generated Credentials (.csv)</span>
                  </Button>
                </div>
              )}
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-[11px] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <XCircle size={14} />
                  <span>The following issues occurred during import:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {uploadResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expandable Preview of Generated Credentials */}
            {showCredentialsPreview && uploadResult.credentials.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <KeyRound size={13} />
                    <span>Generated Candidate Credentials Preview</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePreviewShowAll}
                      className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
                    >
                      {previewShowAll ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{previewShowAll ? 'Mask All Passwords' : 'Show All Passwords'}</span>
                    </button>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Saved securely for email notification pipeline.
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-60 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 bg-white/90 dark:bg-slate-900/90 font-mono text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-emerald-100/50 dark:bg-emerald-950/60 text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-800">
                      <tr>
                        <th className="py-1.5 px-3">Name</th>
                        <th className="py-1.5 px-3">Email</th>
                        <th className="py-1.5 px-3">College</th>
                        <th className="py-1.5 px-3">Roll No</th>
                        <th className="py-1.5 px-3">
                          <div className="flex items-center gap-1">
                            <span>Password</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/40">
                      {uploadResult.credentials.map((c, i) => {
                        const isRevealed = previewShowAll || previewRevealedIndices.has(i);
                        const isCopied = copiedPreviewIndex === i;
                        return (
                          <tr key={i} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30">
                            <td className="py-1.5 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                              {c.name}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 dark:text-slate-300">{c.email}</td>
                            <td className="py-1.5 px-3 text-slate-600 dark:text-slate-300">{c.college || '—'}</td>
                            <td className="py-1.5 px-3 font-bold text-ubi-800 dark:text-ubi-300">
                              {c.roll_no || '—'}
                            </td>
                            <td className="py-1.5 px-3">
                              <div className="inline-flex items-center gap-1.5 bg-emerald-50/80 dark:bg-slate-800/80 border border-emerald-200/80 dark:border-slate-700 rounded px-1.5 py-0.5">
                                <span
                                  className={
                                    isRevealed
                                      ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                      : 'text-slate-400 select-none tracking-widest'
                                  }
                                >
                                  {isRevealed ? c.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePreviewPassword(i)}
                                  title={isRevealed ? 'Hide password' : 'Show password'}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-0.5"
                                >
                                  {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                                {isRevealed && (
                                  <button
                                    type="button"
                                    onClick={() => copyPreviewPassword(c.password, i)}
                                    title="Copy password"
                                    className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition p-0.5"
                                  >
                                    {isCopied ? (
                                      <Check size={12} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Student List Table Card */}
      <Card className="p-0 overflow-hidden">
        {/* Table Toolbar / Filters */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-ubi-800 dark:text-ubi-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Registered Candidates ({filteredStudents.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, roll..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            {/* College Filter */}
            <select
              value={selectedCollegeFilter}
              onChange={(e) => setSelectedCollegeFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-ubi-500"
            >
              <option value="all">All Colleges</option>
              {groupsData?.colleges?.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>

            {/* Group / Batch Filter */}
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-ubi-500"
            >
              <option value="all">All Groups / Batches</option>
              {groupsData?.groups?.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>

            {/* Global Show/Hide Passwords Button in Toolbar */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShowAllPasswords}
              className="text-xs gap-1.5 bg-white dark:bg-slate-900"
              title={showAllPasswords ? 'Hide all passwords' : 'Show all candidate passwords'}
            >
              {showAllPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{showAllPasswords ? 'Mask Passwords' : 'Show Passwords'}</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          </div>
        ) : filteredStudents && filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/40 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Candidate</th>
                  <th className="py-3 px-4 font-bold">College</th>
                  <th className="py-3 px-4 font-bold">Group / Batch</th>
                  <th className="py-3 px-4 font-bold">Roll Number</th>
                  <th className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>Password</span>
                      <button
                        type="button"
                        onClick={toggleShowAllPasswords}
                        title={showAllPasswords ? 'Hide all passwords' : 'Show all passwords'}
                        className="text-slate-400 hover:text-ubi-600 dark:hover:text-ubi-400 p-0.5 rounded transition"
                      >
                        {showAllPasswords ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono">
                {filteredStudents.map((student) => {
                  const isRevealed =
                    showAllPasswords || revealedPasswordIds.has(student.id);
                  const isCopied = copiedStudentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition"
                    >
                      {/* Candidate Name & Email */}
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {student.email}
                        </div>
                      </td>

                      {/* College */}
                      <td className="py-3 px-4 font-sans">
                        {student.college ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            <span>{student.college}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Group / Batch */}
                      <td className="py-3 px-4 font-sans">
                        {student.candidate_group ? (
                          <Badge variant="brand" className="font-semibold">
                            {student.candidate_group}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Roll No */}
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-bold">
                        {student.roll_no || '—'}
                      </td>

                      {/* Password / Credentials with Eye Toggle */}
                      <td className="py-3 px-4">
                        {student.temp_password ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs">
                            <span
                              className={
                                isRevealed
                                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                  : 'text-slate-400 select-none tracking-widest'
                              }
                            >
                              {isRevealed ? student.temp_password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleStudentPassword(student.id)}
                              title={isRevealed ? 'Hide password' : 'Show password'}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-0.5"
                            >
                              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            {isRevealed && (
                              <button
                                type="button"
                                onClick={() => copyStudentPassword(student.temp_password!, student.id)}
                                title="Copy password"
                                className="text-slate-400 hover:text-ubi-600 dark:hover:text-ubi-400 transition p-0.5"
                              >
                                {isCopied ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Encrypted</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            student.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                              : 'bg-ubi-50 text-ubi-800 border border-ubi-200 dark:bg-ubi-950 dark:text-ubi-300 dark:border-ubi-800'
                          }`}
                        >
                          {student.role}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-14 text-slate-500 text-xs space-y-2">
            <p>No candidates found matching your query or filter criteria.</p>
            {(searchQuery || selectedCollegeFilter !== 'all' || selectedGroupFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCollegeFilter('all');
                  setSelectedGroupFilter('all');
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
