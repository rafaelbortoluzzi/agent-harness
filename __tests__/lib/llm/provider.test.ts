import { spawn, spawnSync } from 'child_process'
import {
  buildLlmPrompt,
  completeLlmText,
  getLlmProviderName,
  getLlmProviderStatuses,
  hasLlmProvider,
  resetLlmProviderForTests,
  testLlmProvider,
} from '@/lib/llm/provider'
import { setConfig } from '@/lib/config'

jest.mock('child_process', () => ({
  spawn: jest.fn(),
  spawnSync: jest.fn(),
}))

const mockedSpawn = spawn as jest.Mock
const mockedSpawnSync = spawnSync as jest.Mock

function mockSpawnResult(stdout: string, stderr = '', code = 0) {
  mockedSpawn.mockImplementation(() => {
    const handlers: Record<string, (value: unknown) => void> = {}
    const child = {
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
      },
      stdout: {
        on: jest.fn((event: string, cb: (chunk: Buffer) => void) => {
          if (event === 'data') cb(Buffer.from(stdout))
        }),
      },
      stderr: {
        on: jest.fn((event: string, cb: (chunk: Buffer) => void) => {
          if (event === 'data' && stderr) cb(Buffer.from(stderr))
        }),
      },
      on: jest.fn((event: string, cb: (value: unknown) => void) => {
        handlers[event] = cb
        if (event === 'close') queueMicrotask(() => cb(code))
      }),
      kill: jest.fn(),
    }
    return child
  })
}

describe('llm provider', () => {
  const oldEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...oldEnv }
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.AGENT_HARNESS_LLM_PROVIDER
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
    delete process.env.ANTHROPIC_MODEL
    process.env.AGENT_HARNESS_DIR = `/tmp/harness-llm-provider-${Date.now()}-${Math.random()}`
    mockedSpawnSync.mockReturnValue({ status: 0 })
    resetLlmProviderForTests()
  })

  afterAll(() => {
    process.env = oldEnv
  })

  it('defaults to anthropic-api and requires ANTHROPIC_API_KEY', () => {
    expect(getLlmProviderName()).toBe('anthropic-api')
    expect(hasLlmProvider()).toBe(false)

    process.env.ANTHROPIC_API_KEY = 'test-key'

    expect(hasLlmProvider()).toBe(true)
  })

  it('allows claude-code-cli and codex-cli without API keys', () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'claude-code-cli'
    expect(hasLlmProvider()).toBe(true)

    process.env.AGENT_HARNESS_LLM_PROVIDER = 'codex-cli'
    expect(hasLlmProvider()).toBe(true)
  })

  it('prefers config llmProvider over the environment variable', () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'claude-code-cli'
    setConfig({
      roots: [],
      explicitRepos: [],
      discoveryDepth: 2,
      respectGitignore: true,
      healthWeights: {},
      llmProvider: 'codex-cli',
    })

    expect(getLlmProviderName()).toBe('codex-cli')
  })

  it('falls back to the environment variable when config provider is invalid', () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'codex-cli'
    setConfig({
      roots: [],
      explicitRepos: [],
      discoveryDepth: 2,
      respectGitignore: true,
      healthWeights: {},
      llmProvider: 'bad-provider' as never,
    })

    expect(getLlmProviderName()).toBe('codex-cli')
  })

  it('marks missing CLI commands as unavailable', () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'codex-cli'
    mockedSpawnSync.mockReturnValue({ status: 1 })

    expect(hasLlmProvider()).toBe(false)
    expect(getLlmProviderStatuses().find(p => p.id === 'codex-cli')).toMatchObject({
      available: false,
      reason: 'codex command not found',
    })
  })

  it('supports openai-api with OPENAI_API_KEY', () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'openai-api'
    expect(hasLlmProvider()).toBe(false)

    process.env.OPENAI_API_KEY = 'test-key'
    expect(hasLlmProvider()).toBe(true)
  })

  it('builds a single prompt from system and user text', () => {
    expect(buildLlmPrompt('system text', 'user text')).toContain('system text')
    expect(buildLlmPrompt('system text', 'user text')).toContain('user text')
  })

  it('runs Claude Code CLI in print mode and returns stdout', async () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'claude-code-cli'
    mockSpawnResult('{"score":8,"rationale":"clear"}\n')

    await expect(completeLlmText({ system: 'sys', prompt: 'user', maxTokens: 256 })).resolves.toBe(
      '{"score":8,"rationale":"clear"}',
    )

    expect(mockedSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p', '--output-format', 'text', '--append-system-prompt', 'sys']),
      expect.any(Object),
    )
  })

  it('runs Codex CLI exec in read-only mode and returns stdout', async () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'codex-cli'
    mockSpawnResult('[{"kind":"skill","name":"x","rationale":"y"}]\n')

    await expect(completeLlmText({ system: 'sys', prompt: 'user', maxTokens: 1024 })).resolves.toBe(
      '[{"kind":"skill","name":"x","rationale":"y"}]',
    )

    expect(mockedSpawn).toHaveBeenCalledWith(
      'codex',
      expect.arrayContaining(['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-']),
      expect.any(Object),
    )
  })

  it('runs OpenAI Responses API and returns output_text', async () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'openai-api'
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_MODEL = 'test-model'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'ok' }),
    }) as jest.Mock

    await expect(completeLlmText({ system: 'sys', prompt: 'user', maxTokens: 32 })).resolves.toBe(
      'ok',
    )

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        body: expect.stringContaining('"model":"test-model"'),
      }),
    )
  })

  it('tests a provider with a tiny completion', async () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'codex-cli'
    mockSpawnResult('ok\n')

    await expect(testLlmProvider('codex-cli')).resolves.toEqual({
      ok: true,
      provider: 'codex-cli',
      output: 'ok',
    })
  })

  it('surfaces CLI failures with stderr context', async () => {
    process.env.AGENT_HARNESS_LLM_PROVIDER = 'codex-cli'
    mockSpawnResult('', 'not logged in', 1)

    await expect(completeLlmText({ system: 'sys', prompt: 'user' })).rejects.toThrow(
      /codex failed.*not logged in/,
    )
  })
})
