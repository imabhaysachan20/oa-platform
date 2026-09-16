import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { RotateCcw } from 'lucide-react';
import { STARTER_CODE } from '../store/examStore';
import { useThemeStore } from '../store/themeStore';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  starterCode?: string;
  onReset?: () => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  onLanguageChange,
  starterCode,
  onReset,
  readOnly = false,
}) => {
  const { theme } = useThemeStore();

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
      case 'javascript':
      case 'js':
      case 'node':
        return [javascript()];
      default:
        return [python()];
    }
  }, [language]);

  const handleResetToDefault = () => {
    if (window.confirm('Reset code editor to starter template? Your current changes will be lost.')) {
      if (onReset) {
        onReset();
      } else {
        onChange(starterCode || STARTER_CODE[language] || '');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
      {/* Editor Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 text-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="language-select" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={readOnly}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ubi-800 font-semibold shadow-sm"
          >
            <option value="python">Python 3 (Judge0)</option>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="cpp">C++ (GCC 9.2)</option>
            <option value="java">Java (OpenJDK 13)</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {!readOnly && (
            <button
              onClick={handleResetToDefault}
              title="Reset Code Template"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 px-2.5 py-1 rounded-md transition font-medium"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {value.split('\n').length} lines
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden text-sm font-mono relative bg-slate-50/50 dark:bg-transparent">
        <CodeMirror
          value={value}
          height="100%"
          theme={theme === 'dark' ? oneDark : 'light'}
          extensions={extensions}
          onChange={(val) => onChange(val)}
          readOnly={readOnly}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          className="h-full text-sm font-mono"
        />
      </div>
    </div>
  );
};
