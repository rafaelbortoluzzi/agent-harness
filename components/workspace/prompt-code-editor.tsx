'use client'

import { useMemo } from 'react'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import type { Extension } from '@codemirror/state'
import { phosphorExtension } from './codemirror-theme'

export function PromptCodeEditor({
  label,
  value,
  onChange,
  minHeight,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  minHeight: number
}) {
  const extensions = useMemo<Extension[]>(
    () => [phosphorExtension, EditorView.lineWrapping, markdown()],
    [],
  )

  return (
    <label className="ah-prompt-field">
      <span>{label}</span>
      <div className="ah-prompt-editor" style={{ minHeight }}>
        <CodeMirror
          aria-label={label}
          value={value}
          onChange={onChange}
          extensions={extensions}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            foldGutter: true,
            autocompletion: false,
            searchKeymap: true,
            indentOnInput: true,
          }}
          theme="none"
          height="100%"
          style={{ height: '100%' }}
        />
      </div>
    </label>
  )
}
