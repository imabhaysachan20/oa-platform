import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';
import { RotateCcw } from 'lucide-react';
import { STARTER_CODE } from '../store/examStore';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  onReset?: () => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  onLanguageChange,
  onReset,
  readOnly = false,
}) => {
  const extensions = useMemo(() => {
    switch (language.toLowerCase()) {
      case 'python':
      case 'python3':
      case 'py':
        return [python()];
      case 'cpp':
      case 'c++':
        return [cpp()];
      case 'java':
        return [java()];
      default:
        return [python()];
    }
  }, [language]);

  const handleResetToDefault = () => {
    if (window.confirm('Reset code editor to starter template? Your current changes will be lost.')) {
      if (onReset) {
        onReset();
      } else {
        onChange(STARTER_CODE[language] || '');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Editor Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="language-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={readOnly}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="python">Python 3 (Judge0)</option>
            <option value="cpp">C++ (GCC 9.2)</option>
            <option value="java">Java (OpenJDK 13)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={handleResetToDefault}
              title="Reset Code Template"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2 py-1 rounded transition"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
          <span className="text-[11px] text-slate-400 font-mono">
            {value.split('\n').length} lines
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden text-sm font-mono relative">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={(val) => onChange(val)}
          readOnly={readOnly}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          className="h-full text-[13px] [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
        />
      </div>
    </div>
  );
};
