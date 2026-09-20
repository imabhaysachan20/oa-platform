import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { CodeEditor } from './CodeEditor';
import { OutputConsole } from './OutputConsole';
import { RichTextEditor, MarkdownRenderer } from './ui/RichTextEditor';
import { adminApi } from '../api/admin';
import { STARTER_CODE } from '../store/examStore';
import {
  Play,
  Terminal,
  FileEdit,
  Clock,
  HardDrive,
  ListChecks,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Code2,
  AlignLeft,
  Copy,
  Check,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { RunCodeResponse, QuestionDifficulty, ParameterDef } from '../types';

export interface TestCaseItem {
  id?: number;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  weight?: number;
}

export interface QuestionFormData {
  id?: number;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  timeLimitMs: number;
  memoryLimitKb: number;
  sampleInput: string;
  sampleOutput: string;
  inputFormat?: string;
  functionName?: string;
  functionSignature?: string;
  parameters?: ParameterDef[];
  returnType?: string;
  starterCode?: Record<string, string>;
  driverCode?: Record<string, string>;
  testCases?: TestCaseItem[];
}

interface AdminPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionData: QuestionFormData;
  onChangeQuestionData?: (data: QuestionFormData) => void;
  onSaveQuestion?: (data: QuestionFormData) => void;
  isSaving?: boolean;
  isEditMode?: boolean;
}

/**
 * Generate fallback starter templates on client-side for immediate responsive preview
 */
export function generateClientStarterTemplates(
  functionName: string,
  parameters: ParameterDef[] = [],
  returnType: string = 'void'
): { signature: string; starters: Record<string, string> } {
  const normType = (t: string) => (t || 'any').trim();

  // Signature
  const sigParams = parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
  const signature = `${functionName}(${sigParams}) -> ${returnType || 'void'}`;

  // Python
  const pyParams = parameters
    .map((p) => {
      let t = normType(p.type);
      if (t === 'int') t = 'int';
      else if (t === 'float') t = 'float';
      else if (t === 'string') t = 'str';
      else if (t === 'bool') t = 'bool';
      else if (t === 'int[]') t = 'List[int]';
      else if (t === 'float[]') t = 'List[float]';
      else if (t === 'string[]') t = 'List[str]';
      else if (t === 'int[][]') t = 'List[List[int]]';
      else if (t === 'string[][]') t = 'List[List[str]]';
      else if (t === 'ListNode') t = 'Optional[ListNode]';
      else if (t === 'TreeNode') t = 'Optional[TreeNode]';
      else if (t.includes('[]')) t = `List[${t.replace('[]', '')}]`;
      return `${p.name}: ${t || 'Any'}`;
    })
    .join(', ');

  let pyRet = normType(returnType);
  if (pyRet === 'void') pyRet = 'None';
  else if (pyRet === 'string') pyRet = 'str';
  else if (pyRet === 'int') pyRet = 'int';
  else if (pyRet === 'float') pyRet = 'float';
  else if (pyRet === 'bool') pyRet = 'bool';
  else if (pyRet === 'int[]') pyRet = 'List[int]';
  else if (pyRet === 'string[]') pyRet = 'List[str]';
  else if (pyRet === 'int[][]') pyRet = 'List[List[int]]';
  else if (pyRet === 'ListNode') pyRet = 'Optional[ListNode]';
  else if (pyRet === 'TreeNode') pyRet = 'Optional[TreeNode]';
  else if (pyRet.includes('[]')) pyRet = `List[${pyRet.replace('[]', '')}]`;

  const pyCode = `from typing import List, Optional

class Solution:
    def ${functionName}(self, ${pyParams}) -> ${pyRet}:
        # Write your code here
        pass
`;

  // JavaScript
  const jsDocParams = parameters.map((p) => ` * @param {${p.type}} ${p.name}`).join('\n');
  const jsParams = parameters.map((p) => p.name).join(', ');
  const jsCode = `/**
${jsDocParams ? jsDocParams + '\n' : ''} * @return {${returnType || 'void'}}
 */
function ${functionName}(${jsParams}) {
    // Write your code here
    
}
`;

  // C++
  const getCppType = (t: string, isParam: boolean) => {
    const raw = normType(t);
    if (raw === 'int') return 'int';
    if (raw === 'float') return 'double';
    if (raw === 'string') return isParam ? 'string&' : 'string';
    if (raw === 'bool') return 'bool';
    if (raw === 'int[]') return isParam ? 'vector<int>&' : 'vector<int>';
    if (raw === 'float[]') return isParam ? 'vector<double>&' : 'vector<double>';
    if (raw === 'string[]') return isParam ? 'vector<string>&' : 'vector<string>';
    if (raw === 'int[][]') return isParam ? 'vector<vector<int>>&' : 'vector<vector<int>>';
    if (raw === 'string[][]') return isParam ? 'vector<vector<string>>&' : 'vector<vector<string>>';
    if (raw === 'ListNode') return 'ListNode*';
    if (raw === 'TreeNode') return 'TreeNode*';
    if (raw === 'void') return 'void';
    return isParam ? `${raw}&` : raw;
  };
  const cppParams = parameters.map((p) => `${getCppType(p.type, true)} ${p.name}`).join(', ');
  const cppRet = getCppType(returnType, false);
  const cppCode = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>

using namespace std;

class Solution {
public:
    ${cppRet} ${functionName}(${cppParams}) {
        // Write your code here
        
    }
};
`;

  // Java
  const getJavaType = (t: string) => {
    const raw = normType(t);
    if (raw === 'int') return 'int';
    if (raw === 'float') return 'double';
    if (raw === 'string') return 'String';
    if (raw === 'bool') return 'boolean';
    if (raw === 'int[]') return 'int[]';
    if (raw === 'float[]') return 'double[]';
    if (raw === 'string[]') return 'String[]';
    if (raw === 'int[][]') return 'int[][]';
    if (raw === 'string[][]') return 'String[][]';
    if (raw === 'ListNode') return 'ListNode';
    if (raw === 'TreeNode') return 'TreeNode';
    if (raw === 'void') return 'void';
    return raw;
  };
  const javaParams = parameters.map((p) => `${getJavaType(p.type)} ${p.name}`).join(', ');
  const javaRet = getJavaType(returnType);
  let javaStub = '';
  if (javaRet === 'int') javaStub = 'return 0;';
  else if (javaRet === 'boolean') javaStub = 'return false;';
  else if (javaRet === 'double') javaStub = 'return 0.0;';
  else if (javaRet === 'String') javaStub = 'return "";';
  else if (javaRet.includes('[]')) javaStub = `return new ${javaRet.replace('[]', '')}[0];`;
  else if (javaRet !== 'void') javaStub = 'return null;';

  const javaCode = `import java.util.*;

class Solution {
    public ${javaRet} ${functionName}(${javaParams}) {
        // Write your code here
        ${javaStub}
    }
}
`;

  return {
    signature,
    starters: {
      python: pyCode,
      javascript: jsCode,
      cpp: cppCode,
      java: javaCode,
    } as Record<string, string>,
  };
}

export const AdminPlaygroundModal: React.FC<AdminPlaygroundModalProps> = ({
  isOpen,
  onClose,
  questionData,
  onChangeQuestionData,
  onSaveQuestion,
  isSaving = false,
  isEditMode = false,
}) => {
  const [formData, setFormData] = useState<QuestionFormData>(questionData);
  const [language, setLanguage] = useState('python');
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<RunCodeResponse | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'testcases' | 'edit'>('problem');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New test case drafting inside playground
  const [newTcInput, setNewTcInput] = useState('');
  const [newTcExpected, setNewTcExpected] = useState('');
  const [newTcIsHidden, setNewTcIsHidden] = useState(false);

  // Derive templates and function signature
  const { derivedSignature, derivedStarters } = useMemo<{
    derivedSignature: string;
    derivedStarters: Record<string, string>;
  }>(() => {
    const fnName = formData.functionName?.trim();
    if (fnName) {
      const generated = generateClientStarterTemplates(
        fnName,
        formData.parameters || [],
        formData.returnType || 'void'
      );

      // Verify if starterCode actually matches current functionName
      const starterMatches = (lang: string) => {
        const code = formData.starterCode?.[lang];
        return Boolean(code && code.includes(fnName));
      };

      return {
        derivedSignature: generated.signature,
        derivedStarters: {
          python: starterMatches('python') ? formData.starterCode!.python : generated.starters.python,
          javascript: starterMatches('javascript') ? formData.starterCode!.javascript : generated.starters.javascript,
          cpp: starterMatches('cpp') ? formData.starterCode!.cpp : generated.starters.cpp,
          java: starterMatches('java') ? formData.starterCode!.java : generated.starters.java,
        },
      };
    }

    return {
      derivedSignature: formData.functionSignature || '',
      derivedStarters: {
        python: formData.starterCode?.python || STARTER_CODE.python || '',
        javascript: formData.starterCode?.javascript || STARTER_CODE.javascript || '',
        cpp: formData.starterCode?.cpp || STARTER_CODE.cpp || '',
        java: formData.starterCode?.java || STARTER_CODE.java || '',
      },
    };
  }, [
    formData.functionName,
    formData.functionSignature,
    formData.parameters,
    formData.returnType,
    formData.starterCode,
  ]);

  // Unique signature key to detect when functionName, parameters, or returnType change
  const signatureKey = useMemo(() => {
    return `${questionData.id || 0}_${questionData.functionName || ''}_${JSON.stringify(questionData.parameters || [])}_${questionData.returnType || ''}`;
  }, [questionData.id, questionData.functionName, questionData.parameters, questionData.returnType]);

  const prevSignatureKeyRef = useRef<string>('');

  // Sync incoming question data & initialize code drafts
  useEffect(() => {
    setFormData(questionData);

    const isSignatureChanged = prevSignatureKeyRef.current !== '' && prevSignatureKeyRef.current !== signatureKey;
    prevSignatureKeyRef.current = signatureKey;

    const languages = ['python', 'javascript', 'cpp', 'java'];
    const fnName = questionData.functionName?.trim();
    const gen = fnName
      ? generateClientStarterTemplates(
          fnName,
          questionData.parameters || [],
          questionData.returnType || 'void'
        )
      : null;

    setCodeDrafts((prev) => {
      const nextDrafts: Record<string, string> = {};

      languages.forEach((lang) => {
        const starter = questionData.starterCode?.[lang];
        const starterMatches = Boolean(starter && fnName && starter.includes(fnName));
        const prevCode = prev[lang];
        const prevMatches = Boolean(prevCode && fnName && prevCode.includes(fnName));

        // If signature changed, or previous code does not match current function name:
        if (isSignatureChanged || !prevMatches) {
          nextDrafts[lang] = (starterMatches ? starter : gen?.starters[lang]) || STARTER_CODE[lang] || '';
        } else {
          nextDrafts[lang] = prevCode || (starterMatches ? starter : gen?.starters[lang]) || STARTER_CODE[lang] || '';
        }
      });

      return nextDrafts;
    });
  }, [questionData, signatureKey]);

  // Async server-side template generation for exact canonical sync if needed
  useEffect(() => {
    if (formData.functionName && (!formData.starterCode || Object.keys(formData.starterCode).length === 0)) {
      adminApi
        .generateTemplates({
          function_name: formData.functionName,
          parameters: (formData.parameters || []).map((p) => ({ name: p.name, type: p.type })),
          return_type: formData.returnType || 'void',
        })
        .then((res) => {
          if (res.starter) {
            setCodeDrafts((prev) => {
              const updated = { ...prev };
              Object.keys(res.starter).forEach((l) => {
                if (!updated[l] || updated[l] === STARTER_CODE[l]) {
                  updated[l] = res.starter[l];
                }
              });
              return updated;
            });
          }
        })
        .catch(() => {
          // Fallback to client templates silently
        });
    }
  }, [formData.functionName, formData.parameters, formData.returnType]);

  const currentCode = codeDrafts[language] || derivedStarters[language] || STARTER_CODE[language] || '';

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!codeDrafts[newLang]) {
      setCodeDrafts((prev) => ({
        ...prev,
        [newLang]: derivedStarters[newLang] || STARTER_CODE[newLang] || '',
      }));
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCodeDrafts((prev) => ({
      ...prev,
      [language]: newCode,
    }));
  };

  const handleResetCode = () => {
    const starter = derivedStarters[language] || STARTER_CODE[language] || '';
    setCodeDrafts((prev) => ({
      ...prev,
      [language]: starter,
    }));
  };

  const updateField = <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (onChangeQuestionData) {
      onChangeQuestionData(updated);
    }
  };

  const handleAddPlaygroundTestCase = () => {
    if (!newTcExpected.trim() && !newTcInput.trim()) return;
    const currentList = formData.testCases ? [...formData.testCases] : [];
    const newCase: TestCaseItem = {
      id: Date.now(),
      input: newTcInput,
      expected_output: newTcExpected,
      is_hidden: newTcIsHidden,
      weight: 1.0,
    };
    const updated = { ...formData, testCases: [...currentList, newCase] };
    setFormData(updated);
    if (onChangeQuestionData) {
      onChangeQuestionData(updated);
    }
    setNewTcInput('');
    setNewTcExpected('');
    setNewTcIsHidden(false);
  };

  const handleDeletePlaygroundTestCase = (idx: number) => {
    if (!formData.testCases) return;
    const updatedCases = formData.testCases.filter((_, i) => i !== idx);
    const updated = { ...formData, testCases: updatedCases };
    setFormData(updated);
    if (onChangeQuestionData) {
      onChangeQuestionData(updated);
    }
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setRunOutput(null);

    try {
      const testCasesList: { id?: number; input: string; expected_output: string }[] = [];

      if (formData.testCases && formData.testCases.length > 0) {
        formData.testCases.forEach((tc, idx) => {
          testCasesList.push({
            id: tc.id || idx + 1,
            input: tc.input || '',
            expected_output: tc.expected_output || '',
          });
        });
      } else if (formData.sampleInput || formData.sampleOutput) {
        testCasesList.push({
          id: 1,
          input: formData.sampleInput || '',
          expected_output: formData.sampleOutput || '',
        });
      }

      const payload = {
        code: currentCode,
        language,
        time_limit_ms: formData.timeLimitMs || 1000,
        memory_limit_kb: formData.memoryLimitKb || 128000,
        test_cases: testCasesList,
        title: formData.title,
        question_id: formData.id,
        function_name: formData.functionName,
        parameters: formData.parameters,
        return_type: formData.returnType,
        driver_code: formData.driverCode,
      };

      const res = await adminApi.runPlaygroundCode(payload);
      setRunOutput(res);
    } catch (err: any) {
      setRunOutput({
        question_id: formData.id || 0,
        all_passed: false,
        passed_count: 0,
        total_count: 1,
        results: [
          {
            test_case_id: 0,
            input: formData.sampleInput || '',
            expected_output: formData.sampleOutput || '',
            actual_output: '',
            stderr: err.response?.data?.detail || 'Failed to execute code in Judge0 sandbox.',
            passed: false,
            status: 'Runtime Error',
          },
        ],
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testCaseCount =
    formData.testCases?.length || (formData.sampleInput || formData.sampleOutput ? 1 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Playground Preview: ${formData.title || 'Untitled Problem'} ${isEditMode ? '(Editing)' : ''}`}
      maxWidth="full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-[80vh] min-h-[580px] max-h-[820px] overflow-hidden select-text">
        {/* ==================== LEFT COLUMN: QUESTION PANEL (5 cols) ==================== */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
          {/* Header Tab Switcher */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setActiveLeftTab('problem')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition ${
                activeLeftTab === 'problem'
                  ? 'bg-ubi-800 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent'
              }`}
            >
              <FileText size={13} />
              <span>Problem Statement</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLeftTab('testcases')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition ${
                activeLeftTab === 'testcases'
                  ? 'bg-ubi-800 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent'
              }`}
            >
              <ListChecks size={13} />
              <span>Test Cases ({formData.testCases?.length || (formData.sampleInput ? 1 : 0)})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLeftTab('edit')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition ${
                activeLeftTab === 'edit'
                  ? 'bg-ubi-800 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent'
              }`}
            >
              <FileEdit size={13} />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Left Panel View 1: Problem Statement (Matches Student User Panel exactly) */}
          {activeLeftTab === 'problem' && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Title & Limits Meta */}
              <div>
                <div className="flex items-center justify-between gap-2.5 mb-2">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />
                      {formData.timeLimitMs || 1000}ms limit
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive size={13} className="text-slate-400" />
                      {Math.round((formData.memoryLimitKb || 128000) / 1024)}MB memory
                    </span>
                  </div>
                  <Badge variant={formData.difficulty || 'medium'}>{formData.difficulty || 'medium'}</Badge>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {formData.title || 'Untitled Problem'}
                </h2>
              </div>

              {/* Description Body */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {formData.description ? (
                  <MarkdownRenderer content={formData.description} />
                ) : (
                  <p className="italic text-slate-400">No description provided.</p>
                )}
              </div>

              {/* Input Format Section */}
              {formData.inputFormat && (
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    <AlignLeft size={13} className="text-ubi-700 dark:text-ubi-400" />
                    <span>Input Format</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <MarkdownRenderer content={formData.inputFormat} />
                  </div>
                </div>
              )}



              {/* Sample Test Case Section */}
              {(formData.sampleInput || formData.sampleOutput) && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Sample Test Case
                  </h3>
                  {formData.sampleInput && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Input
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.sampleInput, 'sample-in')}
                          className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                          title="Copy input"
                        >
                          {copiedKey === 'sample-in' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>{copiedKey === 'sample-in' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap">
                        {formData.sampleInput}
                      </div>
                    </div>
                  )}
                  {formData.sampleOutput && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Output
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.sampleOutput, 'sample-out')}
                          className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                          title="Copy output"
                        >
                          {copiedKey === 'sample-out' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>{copiedKey === 'sample-out' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap">
                        {formData.sampleOutput}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Left Panel View 2: Test Cases Management */}
          {activeLeftTab === 'testcases' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={13} className="text-ubi-800 dark:text-ubi-400" />
                    <span>Add Test Case to Playground</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                      Input Data
                    </label>
                    <textarea
                      rows={2}
                      value={newTcInput}
                      onChange={(e) => setNewTcInput(e.target.value)}
                      placeholder="e.g. 2 7 11 15\n9"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-0.5">
                      Expected Output
                    </label>
                    <textarea
                      rows={1.5}
                      value={newTcExpected}
                      onChange={(e) => setNewTcExpected(e.target.value)}
                      placeholder="e.g. 0 1"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTcIsHidden}
                        onChange={(e) => setNewTcIsHidden(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-ubi-800 focus:ring-0"
                      />
                      <span>Hidden Case (Grading only)</span>
                    </label>
                    <Button
                      type="button"
                      size="xs"
                      onClick={handleAddPlaygroundTestCase}
                      className="gap-1 font-semibold px-3 py-1"
                    >
                      <Plus size={13} />
                      <span>Add Case</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* List of configured test cases */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Configured Test Cases ({formData.testCases?.length || 0})
                </div>

                {formData.testCases && formData.testCases.length > 0 ? (
                  <div className="space-y-2">
                    {formData.testCases.map((tc, idx) => (
                      <div
                        key={tc.id || idx}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs shadow-xs"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              Case #{idx + 1}
                            </span>
                            {tc.is_hidden ? (
                              <span className="flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 font-semibold">
                                <EyeOff size={10} /> Hidden
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 font-semibold">
                                <Eye size={10} /> Sample
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div className="truncate bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 block text-[8px] uppercase font-bold mb-0.5">Input:</span>
                              {tc.input || <span className="italic text-slate-400">Empty</span>}
                            </div>
                            <div className="truncate bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <span className="text-slate-400 block text-[8px] uppercase font-bold mb-0.5">Expected:</span>
                              {tc.expected_output || <span className="italic text-slate-400">Empty</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePlaygroundTestCase(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                          title="Remove test case"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                    No custom test cases configured yet. Testing will use sample input/output.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Left Panel View 3: Edit Details */}
          {activeLeftTab === 'edit' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(val) => updateField('description', val)}
                  rows={5}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Input Format
                </label>
                <textarea
                  rows={2}
                  value={formData.inputFormat || ''}
                  onChange={(e) => updateField('inputFormat', e.target.value)}
                  placeholder="e.g. Line 1 contains array. Line 2 contains target."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-sans focus:ring-2 focus:ring-ubi-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Sample Input
                  </label>
                  <textarea
                    rows={2.5}
                    value={formData.sampleInput}
                    onChange={(e) => updateField('sampleInput', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Sample Output
                  </label>
                  <textarea
                    rows={2.5}
                    value={formData.sampleOutput}
                    onChange={(e) => updateField('sampleOutput', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Time Limit (ms)
                  </label>
                  <input
                    type="number"
                    value={formData.timeLimitMs}
                    onChange={(e) => updateField('timeLimitMs', parseInt(e.target.value, 10) || 1000)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Memory Limit (KB)
                  </label>
                  <input
                    type="number"
                    value={formData.memoryLimitKb}
                    onChange={(e) => updateField('memoryLimitKb', parseInt(e.target.value, 10) || 128000)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== RIGHT COLUMN: CODE EDITOR & OUTPUT CONSOLE (7 cols) ==================== */}
        <div className="lg:col-span-7 h-full flex flex-col gap-2.5 overflow-hidden min-h-0">
          {/* Top: Code Editor with Language Selector and Reset */}
          <div className={`transition-all duration-200 min-h-0 overflow-hidden ${isConsoleExpanded ? 'flex-1' : 'flex-[3]'}`}>
            <CodeEditor
              value={currentCode}
              onChange={handleCodeChange}
              language={language}
              onLanguageChange={handleLanguageChange}
              starterCode={derivedStarters[language]}
              onReset={handleResetCode}
              allowPaste={true}
            />
          </div>

          {/* Action Bar (Identical style to student workspace) */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                Running against <strong className="text-slate-800 dark:text-slate-200">{testCaseCount}</strong> test case{testCaseCount === 1 ? '' : 's'}
              </span>
              {formData.functionName && (
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-ubi-50 dark:bg-ubi-950/60 text-ubi-700 dark:text-ubi-300 font-mono text-[10px] font-semibold border border-ubi-200 dark:border-ubi-800">
                  {formData.functionName}()
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunCode}
                isLoading={isRunning}
                className="gap-1.5 font-semibold shadow-sm px-4"
              >
                <Play size={14} className="text-white" />
                <span>Run Code</span>
              </Button>
            </div>
          </div>

          {/* Bottom: Output Console (Identical component to student workspace) */}
          <div className={`transition-all duration-200 min-h-0 overflow-hidden ${isConsoleExpanded ? 'flex-[3]' : 'flex-[2]'}`}>
            <OutputConsole
              output={runOutput}
              isRunning={isRunning}
              sampleInput={formData.sampleInput}
              sampleOutput={formData.sampleOutput}
              isExpanded={isConsoleExpanded}
              onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
