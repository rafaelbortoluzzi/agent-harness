import { Badge } from '@/components/ui/badge'

interface Props {
  score?: number | null
  health?: 'ok' | 'warning' | 'broken'
}

export function HealthBadge({ score, health }: Props) {
  if (score !== undefined && score !== null) {
    const color =
      score >= 80 ? 'bg-green-600' : score >= 50 ? 'bg-yellow-600' : 'bg-red-600'
    return <Badge className={`${color} text-white font-mono`}>{score}/100</Badge>
  }
  if (health) {
    const config = {
      ok: { color: 'bg-green-600', label: 'OK' },
      warning: { color: 'bg-yellow-600', label: 'WARN' },
      broken: { color: 'bg-red-600', label: 'BROKEN' },
    }[health]
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>
  }
  return null
}
