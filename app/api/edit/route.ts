import { NextRequest, NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/llm/client'
import { applyEdit, completeEdit, streamEdit } from '@/lib/llm/editor'
import { getLlmProviderName, hasLlmProvider, isLlmProviderName } from '@/lib/llm/provider'
import { getItemById } from '@/lib/registry/queries'

export async function POST(req: NextRequest) {
  const { itemId, prompt, apply, content, provider, mode } = await req.json()

  if (apply) {
    const item = getItemById(itemId)
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

  const item = getItemById(itemId)
  if (!item) return NextResponse.json({ error: 'item not found' }, { status: 404 })

  if (mode === 'complete') {
    const selected = isLlmProviderName(provider) ? provider : getLlmProviderName()
    if (!hasLlmProvider(selected)) {
      return NextResponse.json({ error: `LLM provider ${selected} is not configured` }, { status: 400 })
    }
    try {
      return NextResponse.json({ content: await completeEdit(item, prompt as string, selected) })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Edit failed' },
        { status: 500 },
      )
    }
  }

  if (!hasApiKey()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 400 })
  }

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
