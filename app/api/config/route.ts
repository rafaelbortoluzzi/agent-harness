import { NextRequest, NextResponse } from 'next/server'
import { getConfig, setConfig } from '@/lib/config'

export async function GET() {
  return NextResponse.json({
    ...getConfig(),
    llmConnected: Boolean(process.env.ANTHROPIC_API_KEY),
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  setConfig({ ...getConfig(), ...body })
  return NextResponse.json(getConfig())
}
