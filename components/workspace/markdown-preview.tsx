'use client'
import useSWR from 'swr'
import type { Tab } from '@/lib/workspace/store'
import { renderMarkdownNodes } from '@/lib/markdown/render'

interface FileResponse {
  body: string
  path: string
}

const fetcher = (u: string) => fetch(u).then(r => r.json())

export function MarkdownPreview({ tab }: { tab: Extract<Tab, { kind: 'preview' }> }) {
  const file = useSWR<FileResponse>(`/api/file?id=${encodeURIComponent(tab.sourceId)}`, fetcher)

  return (
    <div className="ah-editor">
      <div className="ah-editor-head">
        <span className="ah-editor-status">{file.data?.path ?? tab.path}</span>
      </div>
      <div className="ah-md-preview">
        {!file.data ? <p>loading...</p> : renderMarkdownNodes(file.data.body)}
      </div>
    </div>
  )
}
