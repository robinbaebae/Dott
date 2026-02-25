'use client';

import { useState, useEffect, useMemo } from 'react';
import { BlockNoteEditor, type Block } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { parseContent } from '@/lib/memo-utils';

interface MemoEditorProps {
  initialContent: string;
  onChange: (blocks: Block[]) => void;
  editorRef?: React.MutableRefObject<BlockNoteEditor | null>;
}

function getTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function MemoEditor({ initialContent, onChange, editorRef }: MemoEditorProps) {
  const initialBlocks = useMemo(() => parseContent(initialContent), [initialContent]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(getTheme);

  const editor = useCreateBlockNote({
    initialContent: initialBlocks.length > 0 ? initialBlocks : undefined,
    uploadFile: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/memos/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          return data.url;
        }
      } catch {
        // fallback below
      }
      // Fallback: data URL
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    },
  });

  // Expose editor instance via ref
  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  // Watch for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentTheme(getTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="memo-editor-wrapper">
      <BlockNoteView
        editor={editor}
        onChange={() => onChange(editor.document as Block[])}
        theme={currentTheme}
      />
    </div>
  );
}
