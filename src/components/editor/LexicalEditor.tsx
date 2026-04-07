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
    // ── Desktop path (unchanged) ─────────────────────────────────────────────
    // A flag that keydown sets so the mobile `input` fallback can skip events
    // that were already handled by the physical-keyboard path.
    let handledByKeydown = false;

    // Count every backspace as an error
    const removeBackspaceCmd = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => {
        handledByKeydown = true; // tell the input listener to skip this delete
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

    // Count every printable keystroke (physical keyboard only)
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.getAttribute('contenteditable') !== 'true') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handledByKeydown = true;
        onMetricsChange('char');
      }
    };

    window.addEventListener('keydown', onKeyDown);

    // ── Mobile fallback ───────────────────────────────────────────────────────
    // Virtual keyboards (Android / iOS) don't fire keydown with a usable e.key.
    // The `input` event fires reliably after every insertion or deletion and
    // exposes an `inputType` string we can use to classify the action.
    // We skip this path entirely when `handledByKeydown` is true so desktop
    // behaviour is completely unaffected.
    const onInput = (e: Event) => {
      if (document.activeElement?.getAttribute('contenteditable') !== 'true') return;

      // Reset the flag first so it's ready for the next event
      const wasHandled = handledByKeydown;
      handledByKeydown = false;

      if (wasHandled) return; // desktop already counted this keystroke

      const ie = e as InputEvent;
      if (!ie.inputType) return;

      if (ie.inputType.startsWith('insert')) {
        // e.g. insertText, insertCompositionText, insertReplacementText
        const added = ie.data?.length ?? 1;
        for (let i = 0; i < added; i++) onMetricsChange('char');
      } else if (ie.inputType.startsWith('delete')) {
        // e.g. deleteContentBackward, deleteWordBackward
        onMetricsChange('error');
      }
    };

    window.addEventListener('input', onInput);

    return () => {
      removeBackspaceCmd();
      removePasteCmd();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('input', onInput);
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
          placeholder={
            <div
              className="pointer-events-none absolute top-0 left-0 font-mono select-none"
              style={{ color: 'var(--ape-text-muted)' }}
            >
              Just start typing your thoughts…
            </div>
          }
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
