import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getItemById } from '@/lib/registry/queries'
import { applyEdit } from '@/lib/llm/editor'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const item = getItemById(id)
  if (!item) return NextResponse.json({ error: 'item not found' }, { status: 404 })
  if (!fs.existsSync(item.path)) {
    return NextResponse.json({ error: 'file missing on disk' }, { status: 404 })
  }
  const stat = fs.statSync(item.path)
  if (stat.isDirectory()) {
    return NextResponse.json({ error: 'item is a directory' }, { status: 400 })
  }
  const body = fs.readFileSync(item.path, 'utf8')
  return NextResponse.json({ id, path: item.path, body, size: stat.size, mtimeMs: stat.mtimeMs })
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const item = getItemById(id)
  if (!item) return NextResponse.json({ error: 'item not found' }, { status: 404 })
  let body: { content?: string }
  try {
    body = (await req.json()) as { content?: string }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (typeof body.content !== 'string') {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }
  try {
    applyEdit(item, body.content)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'write failed' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const item = getItemById(id)
  if (!item) return NextResponse.json({ error: 'item not found' }, { status: 404 })
  let body: { destinationPath?: string; content?: string }
  try {
    body = (await req.json()) as { destinationPath?: string; content?: string }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!body.destinationPath || typeof body.destinationPath !== 'string') {
    return NextResponse.json({ error: 'destinationPath required' }, { status: 400 })
  }
  if (!path.isAbsolute(body.destinationPath)) {
    return NextResponse.json({ error: 'destinationPath must be absolute' }, { status: 400 })
  }
  const content =
    typeof body.content === 'string'
      ? body.content
      : fs.existsSync(item.path) && !fs.statSync(item.path).isDirectory()
        ? fs.readFileSync(item.path, 'utf8')
        : null
  if (content === null) {
    return NextResponse.json({ error: 'source file missing on disk' }, { status: 404 })
  }
  fs.mkdirSync(path.dirname(body.destinationPath), { recursive: true })
  fs.writeFileSync(body.destinationPath, content)
  return NextResponse.json({ ok: true, path: body.destinationPath })
}
