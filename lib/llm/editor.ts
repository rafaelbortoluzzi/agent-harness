import fs from 'fs'
import { getClient, MODEL } from './client'
import { completeLlmTextWithProvider, type LlmProviderName } from './provider'
import type { RegistryItem } from '@/lib/scanner/adapters/base'

const SYSTEM = `You are editing an AI agent asset (skill, agent, rule, command, or instruction).

Rules:
- Return ONLY the complete new file body. No prose. No markdown fences. No commentary.
- Preserve YAML frontmatter unless the user explicitly asks to change it
- Keep the same file format (Markdown body, frontmatter shape)
- If user request is destructive or unclear, return the file unchanged and only output a comment as the body's first line: "<!-- declined: reason -->" followed by the original content`

export interface EditStreamChunk {
  type: 'text' | 'done' | 'error'
  text?: string
  error?: string
}

export async function* streamEdit(
  item: RegistryItem,
  userPrompt: string,
): AsyncGenerator<EditStreamChunk> {
  if (!fs.existsSync(item.path)) {
    yield { type: 'error', error: `Path not found: ${item.path}` }
    return
  }
  const stat = fs.statSync(item.path)
  if (stat.isDirectory()) {
    yield { type: 'error', error: 'Cannot edit a directory' }
    return
  }
  const body = fs.readFileSync(item.path, 'utf8')

  const client = getClient()
  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 8192,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Asset: ${item.runtime}/${item.type}/${item.name}\nPath: ${item.path}\n\n--- CURRENT BODY ---\n${body}\n--- END BODY ---\n\nUser request: ${userPrompt}`,
        },
      ],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', text: event.delta.text }
      }
    }
    yield { type: 'done' }
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : 'Stream failed' }
  }
}

export async function completeEdit(
  item: RegistryItem,
  userPrompt: string,
  provider: LlmProviderName,
): Promise<string> {
  if (!fs.existsSync(item.path)) throw new Error(`Path not found: ${item.path}`)
  const stat = fs.statSync(item.path)
  if (stat.isDirectory()) throw new Error('Cannot edit a directory')
  const body = fs.readFileSync(item.path, 'utf8')
  return completeLlmTextWithProvider(provider, {
    system: SYSTEM,
    prompt: `Asset: ${item.runtime}/${item.type}/${item.name}
Path: ${item.path}

--- CURRENT BODY ---
${body}
--- END BODY ---

User request: ${userPrompt}`,
    maxTokens: 8192,
  })
}

export function applyEdit(item: RegistryItem, newContent: string): void {
  if (!fs.existsSync(item.path)) {
    throw new Error(`Cannot apply: path not found ${item.path}`)
  }
  const stat = fs.statSync(item.path)
  if (stat.isDirectory()) {
    throw new Error('Cannot apply to a directory')
  }
  // Write atomically: tmp + rename
  const tmp = `${item.path}.harness.tmp`
  fs.writeFileSync(tmp, newContent)
  fs.renameSync(tmp, item.path)
}
