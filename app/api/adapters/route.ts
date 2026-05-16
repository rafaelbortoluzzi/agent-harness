import { NextResponse } from 'next/server'
import { ADAPTERS } from '@/lib/scanner'

export async function GET() {
  return NextResponse.json(ADAPTERS.map(a => ({ id: a.id, types: a.producedTypes })))
}
