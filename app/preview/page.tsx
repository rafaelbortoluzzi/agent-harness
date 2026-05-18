import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getItemById } from '@/lib/registry/queries'
import { renderMarkdownNodes } from '@/lib/markdown/render'

export const dynamic = 'force-dynamic'

interface PreviewPageProps {
  searchParams: Promise<{ id?: string }>
}

export async function generateMetadata({ searchParams }: PreviewPageProps): Promise<Metadata> {
  const { id } = await searchParams
  const item = id ? getItemById(id) : null
  return {
    title: item ? `${path.basename(item.path)} preview` : 'Markdown preview',
  }
}

export default async function Page({ searchParams }: PreviewPageProps) {
  const { id } = await searchParams
  if (!id) notFound()

  const item = getItemById(id)
  if (!item || !fs.existsSync(item.path) || fs.statSync(item.path).isDirectory()) {
    notFound()
  }

  const markdown = fs.readFileSync(item.path, 'utf8')
  const fileName = path.basename(item.path)

  return (
    <main className="ah-preview-page">
      <header className="ah-preview-header">
        <div>
          <p>{item.type}</p>
          <h1>{fileName}</h1>
        </div>
        <span>{item.path}</span>
      </header>
      <article className="ah-preview-doc">{renderMarkdownNodes(markdown)}</article>
    </main>
  )
}
