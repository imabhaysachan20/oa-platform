import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UploadCloud, Users, Download, CheckCircle2, FileText } from 'lucide-react';

export const AdminStudentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    created_count: number;
    skipped_count: number;
    errors: string[];
  } | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ['adminStudents'],
    queryFn: adminApi.listStudents,
  });

  const importMutation = useMutation({
    mutationFn: adminApi.importStudentsCsv,
    onSuccess: (data) => {
      setUploadResult(data);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'CSV upload failed');
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
    importMutation.mutate(selectedFile);
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,name,email,roll_no,password\nJohn Doe,john.doe@usefulbi.com,UBI2026101,CandidatePass123!\nJane Smith,jane.smith@usefulbi.com,UBI2026102,CandidatePass123!';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_student_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Candidate Roster & Bulk CSV Import
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage enrolled candidates and batch-import student accounts.
        </p>
      </div>

      {/* CSV Upload Card */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UploadCloud size={18} className="text-ubi-800 dark:text-ubi-400" />
              <span>Bulk Student Import (CSV)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload a CSV file containing headers: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-ubi-800 dark:text-ubi-300 font-mono text-[11px]">name, email, roll_no, password</code>
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={downloadSampleCsv} className="gap-1.5 self-start font-semibold">
            <Download size={14} />
            <span>Sample CSV Template</span>
          </Button>
        </div>

        <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-ubi-400 dark:hover:border-ubi-600 rounded-xl p-6 text-center transition bg-slate-50 dark:bg-slate-950/40">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="csv-upload"
            className="hidden"
          />
          <label htmlFor="csv-upload" className="cursor-pointer block space-y-2">
            <FileText size={32} className="mx-auto text-slate-400 dark:text-slate-500 hover:text-ubi-800 dark:hover:text-ubi-400 transition" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {selectedFile ? selectedFile.name : 'Click or drop a CSV file here to upload'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Supported format: UTF-8 .csv</p>
          </label>
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Ready to import: <strong className="text-slate-900 dark:text-slate-200">{selectedFile.name}</strong>
            </span>
            <Button size="sm" onClick={handleUpload} isLoading={importMutation.isPending} className="font-semibold">
              Upload & Process CSV
            </Button>
          </div>
        )}

        {/* Upload summary feedback */}
        {uploadResult && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={15} />
              <span>
                Successfully imported {uploadResult.created_count} candidates ({uploadResult.skipped_count} skipped/duplicates).
              </span>
            </div>
            {uploadResult.errors.length > 0 && (
              <div className="text-rose-600 dark:text-rose-400 text-[11px] pt-1">
                Errors: {uploadResult.errors.join(', ')}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Student List Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={16} className="text-ubi-800 dark:text-ubi-400" />
            <span>Registered Candidates ({students?.length || 0})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ubi-800 dark:border-ubi-400"></div>
          </div>
        ) : students && students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/40 uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Name</th>
                  <th className="py-3 px-4 font-bold">Email</th>
                  <th className="py-3 px-4 font-bold">Roll No</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-slate-200">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{student.email}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{student.roll_no || '—'}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ubi-50 text-ubi-800 border border-ubi-200 dark:bg-ubi-950 dark:text-ubi-300 dark:border-ubi-800 uppercase">
                        {student.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            No candidates registered yet.
          </div>
        )}
      </Card>
    </div>
  );
};
