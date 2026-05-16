import { NextRequest, NextResponse } from 'next/server'
import { createSkillFromRecommendation } from '@/lib/recommendations/create-skill'
import { getRecommendationById } from '@/lib/registry/queries'

async function readBody(req: NextRequest): Promise<{ recommendationId?: string }> {
  try {
    return (await req.json()) as { recommendationId?: string }
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  const { recommendationId } = await readBody(req)
  if (!recommendationId) {
    return NextResponse.json({ error: 'recommendationId is required' }, { status: 400 })
  }

  const recommendation = getRecommendationById(recommendationId)
  if (!recommendation) {
    return NextResponse.json({ error: 'recommendation not found' }, { status: 404 })
  }
  if (recommendation.kind !== 'skill') {
    return NextResponse.json({ error: 'only skill recommendations can create skills' }, { status: 400 })
  }

  try {
    const result = createSkillFromRecommendation(recommendation)
    return NextResponse.json(result)
  } catch (err) {
    const message = (err as Error).message
    return NextResponse.json(
      { error: message },
      { status: message.includes('already exists') ? 409 : 400 },
    )
  }
}
