'use client';

import { useEffect, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import {
  COMMAND_PRIORITY_NORMAL,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  KEY_BACKSPACE_COMMAND,
  PASTE_COMMAND,
  $getRoot,
  EditorState,
} from 'lexical';

const theme = {
  ltr: 'text-left',
  rtl: 'text-right',
};

const initialConfig = {
  namespace: 'ApeTextEditor',
  theme,
  onError(error: Error) {
    console.error('[LexicalEditor]', error);
  },
};

// ------- Internal Plugins -------

/** Triggers onFinish when the user presses Shift+Enter */
function ShiftEnterPlugin({ onFinish }: { onFinish: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent) => {
        if (event.shiftKey) {
          event.preventDefault();
          onFinish();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor, onFinish]);

  return null;
}

/** Focuses the editor when the user starts typing anywhere on the page */
function GlobalFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.activeElement?.getAttribute('contenteditable') === 'true') return;
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
        editor.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor]);

  return null;
}

/** Tracks keystrokes and backspaces, reporting them to the parent via onMetricsChange */
function MetricsTrackerPlugin({
  onMetricsChange,
}: {
  onMetricsChange: (type: 'char' | 'error') => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Count every backspace as an error
    const removeBackspaceCmd = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => {
        onMetricsChange('error');
        return false; // let Lexical handle the deletion
      },
      COMMAND_PRIORITY_NORMAL
    );

    // Block all paste attempts
    const removePasteCmd = editor.registerCommand(
      PASTE_COMMAND,
      (event: Event) => {
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    // Count every printable keystroke
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.getAttribute('contenteditable') !== 'true') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onMetricsChange('char');
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      removeBackspaceCmd();
      removePasteCmd();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [editor, onMetricsChange]);

  return null;
}

// ------- Public Component -------

interface LexicalEditorProps {
  onFinish?: () => void;
  onChangeText?: (text: string) => void;
  onMetricsChange?: (type: 'char' | 'error') => void;
}

// Stable module-level no-ops so default prop expressions never create
// new function references, preventing unnecessary useCallback invalidations
// in child plugins.
const noop        = () => {};
const noopMetrics = (_type: 'char' | 'error') => {};

export default function LexicalEditor({
  onFinish       = noop,
  onChangeText   = noop,
  onMetricsChange = noopMetrics,
}: LexicalEditorProps) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        onChangeText($getRoot().getTextContent());
      });
    },
    [onChangeText]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative w-full">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className="outline-none w-full bg-transparent caret-[#a855f7] resize-none overflow-hidden break-words whitespace-pre-wrap font-mono relative z-10 transition-colors duration-200"
              style={{ color: 'var(--ape-text)' }}
              spellCheck={false}
            />
          }
          placeholder={<div className="hidden" />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <ShiftEnterPlugin onFinish={onFinish} />
        <MetricsTrackerPlugin onMetricsChange={onMetricsChange} />
        <AutoFocusPlugin />
        <GlobalFocusPlugin />
      </div>
    </LexicalComposer>
  );
}
