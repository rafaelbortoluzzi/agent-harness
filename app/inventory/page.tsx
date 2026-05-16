'use client'
import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { HealthBadge } from '@/components/health-badge'
import { ItemSidePanel, type PanelItem } from '@/components/item-side-panel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/lib/hooks/use-debounce'

const fetcher = (u: string) => fetch(u).then(r => r.json())

const HEALTH_OPTIONS = ['all', 'ok', 'warning', 'broken'] as const
const PAGE_SIZE = 100

interface AdapterMeta {
  id: string
  types: string[]
}

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [runtime, setRuntime] = useState('all')
  const [health, setHealth] = useState('all')
  const [type, setType] = useState('all')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<PanelItem | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data: adapters = [] } = useSWR<AdapterMeta[]>('/api/adapters', fetcher)

  const allTypes = useMemo(() => {
    const t = new Set<string>()
    for (const a of adapters) for (const x of a.types) t.add(x)
    return ['all', ...Array.from(t).sort()]
  }, [adapters])

  const runtimes = useMemo(() => ['all', ...adapters.map(a => a.id)], [adapters])

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (runtime !== 'all') p.set('runtime', runtime)
    if (health !== 'all') p.set('health', health)
    if (type !== 'all') p.set('type', type)
    p.set('limit', String(PAGE_SIZE))
    p.set('offset', String(offset))
    return p.toString()
  }, [runtime, health, type, offset])

  const { data: items = [] } = useSWR<PanelItem[]>(`/api/registry?${params}`, fetcher)

  const filtered = useMemo(
    () =>
      debouncedSearch
        ? items.filter(i => i.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
        : items,
    [items, debouncedSearch],
  )

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inventory</h2>

      <div className="flex gap-3 flex-wrap items-center">
        <Input
          placeholder="Search by name…"
          className="w-56"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={runtime} onValueChange={v => { setRuntime(v ?? 'all'); setOffset(0) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="runtime" /></SelectTrigger>
          <SelectContent>
            {runtimes.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={health} onValueChange={v => { setHealth(v ?? 'all'); setOffset(0) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="health" /></SelectTrigger>
          <SelectContent>
            {HEALTH_OPTIONS.map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={v => { setType(v ?? 'all'); setOffset(0) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="type" /></SelectTrigger>
          <SelectContent>
            {allTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} items</span>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Name', 'Runtime', 'Type', 'Scope', 'Health', 'Repo'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className="border-t cursor-pointer hover:bg-muted/30"
              >
                <td className="px-3 py-2 font-medium">{item.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{item.runtime}</td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2 text-muted-foreground">{item.scope}</td>
                <td className="px-3 py-2"><HealthBadge health={item.health} /></td>
                <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-xs">
                  {item.repoPath?.split('/').pop() ?? '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          ← Prev
        </Button>
        <span className="text-muted-foreground">
          {offset + 1}–{offset + filtered.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={items.length < PAGE_SIZE}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next →
        </Button>
      </div>

      {selected && <ItemSidePanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
