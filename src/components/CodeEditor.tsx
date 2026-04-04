import { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

interface CodeEditorProps {
  language: "python" | "sql";
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({ language, value, onChange, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Monaco uses "python" and "sql" as language IDs
        // @ts-ignore
        window.monaco?.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <Editor
        height="400px"
        language={language}
        value={value}
        onChange={(v) => onChange(v || "")}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          readOnly,
          padding: { top: 12 },
          fontFamily: "'Space Mono', 'Fira Code', monospace",
          renderLineHighlight: "gutter",
          scrollbar: { verticalSliderSize: 6, horizontalSliderSize: 6 },
        }}
      />
    </div>
  );
}
