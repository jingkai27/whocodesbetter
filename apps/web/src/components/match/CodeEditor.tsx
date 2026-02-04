'use client';

import { useRef, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
  blur?: boolean;
}

const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  go: 'go',
};

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  blur = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Define custom CodeDuel Dark theme
    monaco.editor.defineTheme('codeduel-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#58a6ff',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editor.inactiveSelectionBackground': '#264f7840',
      },
    });

    monaco.editor.setTheme('codeduel-dark');

    // Focus the editor
    if (!readOnly) {
      editor.focus();
    }
  }, [readOnly]);

  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange]
  );

  const monacoLanguage = LANGUAGE_MAP[language] || 'javascript';

  return (
    <div className={`relative h-full w-full ${blur ? 'blur-effect' : ''}`}>
      <Editor
        height="100%"
        language={monacoLanguage}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="codeduel-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          readOnly,
          domReadOnly: readOnly,
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          contextmenu: !readOnly,
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-[#0d1117]">
            <div className="text-gray-400">Loading editor...</div>
          </div>
        }
      />
      {blur && (
        <div className="pointer-events-none absolute inset-0 backdrop-blur-sm" />
      )}
      <style jsx global>{`
        .blur-effect .monaco-editor {
          filter: blur(4px);
          user-select: none;
        }
      `}</style>
    </div>
  );
}
