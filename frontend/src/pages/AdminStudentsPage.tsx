import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
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
  Pencil,
  Trash2,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User, CandidateImportResponse, StudentCreatePayload, StudentUpdatePayload } from '../types';

export const AdminStudentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Collapsible Upload Section state
  const [isImportPanelOpen, setIsImportPanelOpen] = useState<boolean>(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [candidateGroup, setCandidateGroup] = useState<string>('');
  const [defaultCollege, setDefaultCollege] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<CandidateImportResponse | null>(null);
  const [showCredentialsPreview, setShowCredentialsPreview] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>('all');

  // Sorting state
  type SortKey = 'id' | 'name' | 'email' | 'college' | 'candidate_group' | 'roll_no';
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Password visibility & copy state for main roster
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Set<number>>(new Set());
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(false);
  const [copiedStudentId, setCopiedStudentId] = useState<number | null>(null);

  // Password visibility & copy state for upload preview
  const [previewRevealedIndices, setPreviewRevealedIndices] = useState<Set<number>>(new Set());
  const [previewShowAll, setPreviewShowAll] = useState<boolean>(false);
  const [copiedPreviewIndex, setCopiedPreviewIndex] = useState<number | null>(null);

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editCollege, setEditCollege] = useState<string>('');
  const [editCandidateGroup, setEditCandidateGroup] = useState<string>('');
  const [editRollNo, setEditRollNo] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add Student Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addName, setAddName] = useState<string>('');
  const [addEmail, setAddEmail] = useState<string>('');
  const [addCollege, setAddCollege] = useState<string>('');
  const [addCandidateGroup, setAddCandidateGroup] = useState<string>('');
  const [addRollNo, setAddRollNo] = useState<string>('');
  const [addPassword, setAddPassword] = useState<string>('');
  const [showAddPassword, setShowAddPassword] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete Student Modal state
  const [deletingStudent, setDeletingStudent] = useState<User | null>(null);

  // Notification / toast banner state
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto dismiss toast after 4s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

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

  // Password Generator Helper
  const generateRandomPassword = () => {
    const adjectives = ['Swift', 'Bright', 'Clever', 'Agile', 'Bold', 'Epic', 'Nova', 'Prime', 'Apex'];
    const nouns = ['Coder', 'Dev', 'Master', 'Ninja', 'Pilot', 'Builder', 'Hero', 'Spark', 'Knight'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    const symbols = ['#', '@', '!'];
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    return `${randomAdj}${randomNoun}${randomSymbol}${randomNum}`;
  };

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
      setSuccessToast(`Successfully imported ${data.created_count} candidates.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Candidate roster import failed');
    },
  });

  // Create Student Mutation
  const createStudentMutation = useMutation({
    mutationFn: (payload: StudentCreatePayload) => adminApi.createStudent(payload),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStudentGroups'] });
      setIsAddModalOpen(false);
      resetAddForm();
      setSuccessToast(`Candidate "${newUser.name}" successfully created.`);
    },
    onError: (err: any) => {
      setAddError(err.response?.data?.detail || 'Failed to create candidate.');
    },
  });

  // Update Student Mutation
  const updateStudentMutation = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: StudentUpdatePayload }) =>
      adminApi.updateStudent(studentId, payload),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStudentGroups'] });
      setEditingStudent(null);
      setSuccessToast(`Candidate "${updatedUser.name}" updated successfully.`);
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.detail || 'Failed to update candidate profile.');
    },
  });

  // Delete Student Mutation
  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => adminApi.deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStudentGroups'] });
      const name = deletingStudent?.name;
      setDeletingStudent(null);
      setSuccessToast(`Candidate "${name || 'User'}" deleted successfully.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete candidate.');
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

  // Open Edit Modal
  const handleOpenEditModal = (student: User) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditEmail(student.email);
    setEditCollege(student.college || '');
    setEditCandidateGroup(student.candidate_group || '');
    setEditRollNo(student.roll_no || '');
    setEditPassword(student.temp_password || '');
    setShowEditPassword(false);
    setEditError(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editName.trim()) {
      setEditError('Candidate name is required.');
      return;
    }
    if (!editEmail.trim()) {
      setEditError('Candidate email is required.');
      return;
    }

    const payload: StudentUpdatePayload = {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      college: editCollege.trim() || undefined,
      candidate_group: editCandidateGroup.trim() || undefined,
      roll_no: editRollNo.trim() || undefined,
      password: editPassword.trim() || undefined,
    };

    updateStudentMutation.mutate({ studentId: editingStudent.id, payload });
  };

  // Open Add Modal
  const resetAddForm = () => {
    setAddName('');
    setAddEmail('');
    setAddCollege(defaultCollege || '');
    setAddCandidateGroup(candidateGroup || '');
    setAddRollNo('');
    setAddPassword('');
    setShowAddPassword(false);
    setAddError(null);
  };

  const handleOpenAddModal = () => {
    resetAddForm();
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      setAddError('Candidate name is required.');
      return;
    }
    if (!addEmail.trim()) {
      setAddError('Candidate email is required.');
      return;
    }

    const payload: StudentCreatePayload = {
      name: addName.trim(),
      email: addEmail.trim().toLowerCase(),
      college: addCollege.trim() || undefined,
      candidate_group: addCandidateGroup.trim() || undefined,
      roll_no: addRollNo.trim() || undefined,
      password: addPassword.trim() || undefined,
    };

    createStudentMutation.mutate(payload);
  };

  // Sorting Helper
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filtered & Sorted candidates
  const filteredAndSortedStudents = useMemo(() => {
    if (!students) return [];
    let list = [...students];

    // Search query across name, email, roll_no, college, candidate_group
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.roll_no && s.roll_no.toLowerCase().includes(q)) ||
          (s.college && s.college.toLowerCase().includes(q)) ||
          (s.candidate_group && s.candidate_group.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA: any = a[sortKey] ?? '';
      let valB: any = b[sortKey] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return sortDirection === 'asc' ? a.id - b.id : b.id - a.id;
    });

    return list;
  }, [students, searchQuery, sortKey, sortDirection]);

  // Paginated students slice
  const totalPages = Math.ceil(filteredAndSortedStudents.length / pageSize) || 1;

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedStudents.slice(start, start + pageSize);
  }, [filteredAndSortedStudents, currentPage, pageSize]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-fadeIn">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="ml-2 hover:bg-emerald-800 p-0.5 rounded transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Candidate Roster & Management</span>
            {students && (
              <Badge variant="brand" className="text-xs px-2.5 py-0.5">
                {students.length} Total
              </Badge>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage candidates, update profiles manually, import CSV/Excel rosters with dynamic credentials, and filter by college or batch tag.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportPanelOpen(!isImportPanelOpen)}
            className="text-xs gap-1.5 font-semibold"
          >
            <UploadCloud size={14} className="text-ubi-700 dark:text-ubi-400" />
            <span>{isImportPanelOpen ? 'Hide Import' : 'Import CSV / Excel'}</span>
            {isImportPanelOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="text-xs gap-1.5 bg-ubi-800 hover:bg-ubi-900 text-white font-bold shadow-sm"
          >
            <Plus size={14} />
            <span>Add Candidate</span>
          </Button>
        </div>
      </div>

      {/* CSV / Excel Upload Collapsible Card */}
      {isImportPanelOpen && (
        <Card className="space-y-4 animate-fadeIn border-ubi-200 dark:border-ubi-900/60 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UploadCloud size={18} className="text-ubi-800 dark:text-ubi-400" />
                <span>Bulk Import Candidates (CSV / Excel)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Columns: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-ubi-800 dark:text-ubi-300 font-mono text-[11px]">name, email, college</code> (Optional: <code className="font-mono text-[11px] text-slate-600 dark:text-slate-400">roll_no, password</code>).
                Missing roll numbers or passwords will be dynamically generated.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCsv}
              className="gap-1.5 self-start font-semibold text-xs"
            >
              <Download size={14} />
              <span>Download Template</span>
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
                Tag assigned to candidates for batch scheduling and email notifications.
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
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {selectedFile ? selectedFile.name : 'Click or drop a CSV or Excel (.xlsx) file here to upload'}
              </div>
              <p className="text-[11px] text-slate-400">
                Supported formats: <span className="font-semibold text-slate-600 dark:text-slate-400">CSV (.csv)</span> or <span className="font-semibold text-slate-600 dark:text-slate-400">Excel (.xlsx)</span>
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Selected: <span className="font-bold text-slate-900 dark:text-white">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={importMutation.isPending}
                className="bg-ubi-800 hover:bg-ubi-900 text-white font-bold text-xs gap-1.5"
              >
                {importMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    <span>Processing Roster...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    <span>Import & Generate Credentials</span>
                  </>
                )}
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
                          <th className="py-1.5 px-3">Password</th>
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
      )}

      {/* Candidate List Table Card with Search, Filters, Sort, and Pagination */}
      <Card className="p-0 overflow-hidden shadow-sm">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-ubi-800 dark:text-ubi-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Registered Candidates ({filteredAndSortedStudents.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[210px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, email, roll..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-7 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* College Filter */}
            <select
              value={selectedCollegeFilter}
              onChange={(e) => {
                setSelectedCollegeFilter(e.target.value);
                setCurrentPage(1);
              }}
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
              onChange={(e) => {
                setSelectedGroupFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-ubi-500"
            >
              <option value="all">All Groups / Batches</option>
              {groupsData?.groups?.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={`${sortKey}_${sortDirection}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split('_') as [SortKey, 'asc' | 'desc'];
                setSortKey(k);
                setSortDirection(d);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-ubi-500"
            >
              <option value="id_desc">Recently Added</option>
              <option value="id_asc">Oldest First</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="email_asc">Email (A → Z)</option>
              <option value="college_asc">College (A → Z)</option>
              <option value="candidate_group_asc">Batch Tag (A → Z)</option>
              <option value="roll_no_asc">Roll No (Ascending)</option>
              <option value="roll_no_desc">Roll No (Descending)</option>
            </select>

            {/* Global Show/Hide Passwords Button */}
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
        ) : paginatedStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/40 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  {/* Candidate Name Sortable Header */}
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-ubi-800 dark:hover:text-ubi-400 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Candidate</span>
                      {sortKey === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="text-ubi-600" /> : <ArrowDown size={12} className="text-ubi-600" />
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* College Sortable Header */}
                  <th
                    onClick={() => handleSort('college')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-ubi-800 dark:hover:text-ubi-400 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>College</span>
                      {sortKey === 'college' ? (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="text-ubi-600" /> : <ArrowDown size={12} className="text-ubi-600" />
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* Group / Batch Sortable Header */}
                  <th
                    onClick={() => handleSort('candidate_group')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-ubi-800 dark:hover:text-ubi-400 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Batch / Group</span>
                      {sortKey === 'candidate_group' ? (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="text-ubi-600" /> : <ArrowDown size={12} className="text-ubi-600" />
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* Roll Number Sortable Header */}
                  <th
                    onClick={() => handleSort('roll_no')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-ubi-800 dark:hover:text-ubi-400 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Roll Number</span>
                      {sortKey === 'roll_no' ? (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="text-ubi-600" /> : <ArrowDown size={12} className="text-ubi-600" />
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* Password Header */}
                  <th className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>Password</span>
                    </div>
                  </th>

                  {/* Actions Header */}
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono">
                {paginatedStudents.map((student) => {
                  const isRevealed = showAllPasswords || revealedPasswordIds.has(student.id);
                  const isCopied = copiedStudentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group"
                    >
                      {/* Candidate Name & Email */}
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{student.name}</span>
                          {student.role === 'admin' && (
                            <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 rounded text-[9px] font-bold uppercase">
                              Admin
                            </span>
                          )}
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
                          <span className="text-slate-400 text-[11px] italic">Not specified</span>
                        )}
                      </td>

                      {/* Group / Batch */}
                      <td className="py-3 px-4 font-sans">
                        {student.candidate_group ? (
                          <Badge variant="brand" className="font-semibold text-[11px]">
                            {student.candidate_group}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No batch</span>
                        )}
                      </td>

                      {/* Roll No */}
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-bold">
                        {student.roll_no || <span className="text-slate-400 text-[11px] font-normal italic">—</span>}
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
                          <span className="text-slate-400 text-[11px] italic">Hashed</span>
                        )}
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3 px-4 font-sans text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(student)}
                            title="Edit candidate profile"
                            className="p-1.5 text-slate-500 hover:text-ubi-700 dark:hover:text-ubi-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingStudent(student)}
                            title="Delete candidate"
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredAndSortedStudents.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                itemLabel="candidates"
              />
            </div>
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
                  setCurrentPage(1);
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Datalists for suggestions in Modals */}
      <datalist id="college-suggestions">
        {groupsData?.colleges?.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <datalist id="group-suggestions">
        {groupsData?.groups?.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {/* ================= EDIT CANDIDATE MODAL ================= */}
      {editingStudent && (
        <Modal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          title="Edit Candidate Profile"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manually update candidate identity, college affiliation, batch tag, roll number, or credentials.
            </p>

            {editError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Candidate full name"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 font-mono"
                />
              </div>

              {/* College */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  College / Institution
                </label>
                <input
                  type="text"
                  list="college-suggestions"
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  placeholder="e.g. IIT Delhi, BITS Pilani"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
                />
              </div>

              {/* Batch / Group Tag */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Batch Tag / Group
                </label>
                <input
                  type="text"
                  list="group-suggestions"
                  value={editCandidateGroup}
                  onChange={(e) => setEditCandidateGroup(e.target.value)}
                  placeholder="e.g. 2026 Batch, Summer Drive"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
                />
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={editRollNo}
                  onChange={(e) => setEditRollNo(e.target.value)}
                  placeholder="e.g. IITD-2026-0001"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 font-mono"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Password / Reset
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateRandomPassword())}
                    className="text-[10px] text-ubi-700 dark:text-ubi-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles size={11} />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password to reset"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingStudent(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateStudentMutation.isPending}
                className="bg-ubi-800 hover:bg-ubi-900 text-white font-bold text-xs"
              >
                {updateStudentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= ADD CANDIDATE MODAL ================= */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Candidate"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveAdd} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manually register a candidate. If roll number or password are left empty, they will be auto-generated.
            </p>

            {addError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Aditi Rao"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="aditi.rao@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 font-mono"
                />
              </div>

              {/* College */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  College / Institution
                </label>
                <input
                  type="text"
                  list="college-suggestions"
                  value={addCollege}
                  onChange={(e) => setAddCollege(e.target.value)}
                  placeholder="e.g. IIT Delhi, BITS Pilani"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
                />
              </div>

              {/* Batch / Group Tag */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Batch Tag / Group
                </label>
                <input
                  type="text"
                  list="group-suggestions"
                  value={addCandidateGroup}
                  onChange={(e) => setAddCandidateGroup(e.target.value)}
                  placeholder="e.g. 2026 Batch, Campus Drive"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500"
                />
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Roll Number (Optional)
                </label>
                <input
                  type="text"
                  value={addRollNo}
                  onChange={(e) => setAddRollNo(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 font-mono"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Password (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddPassword(generateRandomPassword())}
                    className="text-[10px] text-ubi-700 dark:text-ubi-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles size={11} />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-ubi-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showAddPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createStudentMutation.isPending}
                className="bg-ubi-800 hover:bg-ubi-900 text-white font-bold text-xs"
              >
                {createStudentMutation.isPending ? 'Creating...' : 'Create Candidate'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= DELETE CANDIDATE CONFIRM MODAL ================= */}
      {deletingStudent && (
        <Modal
          isOpen={!!deletingStudent}
          onClose={() => setDeletingStudent(null)}
          title="Delete Candidate"
          maxWidth="sm"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete candidate <strong className="text-slate-900 dark:text-white">{deletingStudent.name}</strong> (<code className="font-mono text-[11px]">{deletingStudent.email}</code>)?
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              This action cannot be undone. Associated test assignments for this candidate will also be deleted.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingStudent(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deleteStudentMutation.isPending}
                onClick={() => deleteStudentMutation.mutate(deletingStudent.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete Candidate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
