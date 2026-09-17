import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Heading2,
  Quote,
  FileCode2,
  Eye,
  Edit3,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  if (!content) {
    return <span className="text-slate-400 italic">No content provided</span>;
  }

  // Split by lines to parse blocks: headers, lists, codeblocks, quotes, paragraphs
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={key} className="list-disc pl-5 my-2 space-y-1">
          {currentList.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="list-decimal pl-5 my-2 space-y-1">
          {currentList.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  const renderInline = (text: string): React.ReactNode[] => {
    // Simple inline parser for **bold**, *italic*, `code`
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-ubi-900 dark:text-ubi-300 font-mono text-xs border border-slate-200 dark:border-slate-700"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2 border border-slate-800"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushList(`list-before-code-${idx}`);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    // Bullet lists (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!currentList || currentList.type !== 'ul') {
        flushList(`flush-${idx}`);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(trimmed.slice(2));
      return;
    }

    // Numbered lists (1. , 2. )
    const numMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList(`flush-${idx}`);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[1]);
      return;
    }

    // Not a list item
    flushList(`flush-after-${idx}`);

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${idx}`} className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${idx}`} className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${idx}`} className="text-lg font-extrabold text-slate-900 dark:text-white mt-3 mb-1">
          {renderInline(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${idx}`}
          className="border-l-4 border-ubi-500 pl-3 italic text-slate-600 dark:text-slate-400 my-2 text-xs"
        >
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
    } else if (trimmed === '') {
      elements.push(<div key={`blank-${idx}`} className="h-2" />);
    } else {
      elements.push(
        <p key={`p-${idx}`} className="my-1 text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
          {renderInline(line)}
        </p>
      );
    }
  });

  flushList('final-list');

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write problem description...',
  rows = 8,
  className = '',
}) => {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyFormat = (prefix: string, suffix: string = '', defaultText: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    let selected = text.substring(start, end);
    if (!selected) selected = defaultText;

    const replacement = `${prefix}${selected}${suffix}`;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const applyPrefixToLines = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selected = text.substring(start, end) || 'Item';
    const lines = selected.split('\n');
    const formatted = lines.map((l, i) => {
      if (prefix === '1. ') return `${i + 1}. ${l.replace(/^\d+\.\s*/, '')}`;
      return `${prefix}${l.replace(/^[-*]\s*/, '')}`;
    }).join('\n');

    const newValue = text.substring(0, start) + formatted + text.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
    }, 0);
  };

  return (
    <div className={`flex flex-col border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-ubi-800 transition ${className}`}>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        {/* Formatting Actions (Only active in write mode) */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => applyFormat('**', '**', 'bold text')}
            disabled={mode === 'preview'}
            title="Bold (**text**)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition font-bold"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('*', '*', 'italic text')}
            disabled={mode === 'preview'}
            title="Italic (*text*)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('### ', '', 'Heading')}
            disabled={mode === 'preview'}
            title="Heading 3 (### Heading)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
          >
            <Heading2 size={13} />
          </button>

          <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></span>

          <button
            type="button"
            onClick={() => applyPrefixToLines('- ')}
            disabled={mode === 'preview'}
            title="Bullet List (- item)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
          >
            <List size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyPrefixToLines('1. ')}
            disabled={mode === 'preview'}
            title="Numbered List (1. item)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
          >
            <ListOrdered size={13} />
          </button>

          <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></span>

          <button
            type="button"
            onClick={() => applyFormat('`', '`', 'code')}
            disabled={mode === 'preview'}
            title="Inline Code (`code`)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
          >
            <Code size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('```\n', '\n```', 'code block')}
            disabled={mode === 'preview'}
            title="Code Block (```)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
          >
            <FileCode2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('> ', '', 'Quote')}
            disabled={mode === 'preview'}
            title="Blockquote (> quote)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
          >
            <Quote size={13} />
          </button>
        </div>

        {/* Write / Preview Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${mode === 'write'
              ? 'bg-white dark:bg-slate-950 text-ubi-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 size={11} />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${mode === 'preview'
              ? 'bg-white dark:bg-slate-950 text-ubi-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye size={11} />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor / Preview Body */}
      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full p-3 bg-transparent text-slate-900 dark:text-slate-100 text-xs font-sans focus:outline-none resize-y min-h-[220px] leading-relaxed"
        />
      ) : (
        <div className="p-3 bg-slate-50/50 dark:bg-slate-950 min-h-[220px] overflow-y-auto max-h-[450px]">
          <MarkdownRenderer content={value} />
        </div>
      )}
    </div>
  );
};
