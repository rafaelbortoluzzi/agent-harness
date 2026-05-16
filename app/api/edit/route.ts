import { NextRequest, NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/llm/client'
import { applyEdit, streamEdit } from '@/lib/llm/editor'
import { getItems } from '@/lib/registry/queries'

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 400 })
  }
  const { itemId, prompt, apply, content } = await req.json()

  if (apply) {
    const item = getItems({}).find(i => i.id === itemId)
    if (!item) return NextResponse.json({ error: 'item not found' }, { status: 404 })
    try {
      applyEdit(item, content as string)
      return NextResponse.json({ ok: true })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Apply failed' },
        { status: 500 },
      )
    }
  }

  const item = getItems({}).find(i => i.id === itemId)
  if (!item) return NextResponse.json({ error: 'item not found' }, { status: 404 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamEdit(item, prompt as string)) {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: 'error', error: (err as Error).message }) + '\n',
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
    },
  })
}
