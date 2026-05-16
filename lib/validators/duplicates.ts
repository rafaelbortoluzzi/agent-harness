import type { RegistryItem, ValidationResult } from '@/lib/scanner/adapters/base'
import type { Validator } from './base'

export class DuplicatesValidator implements Validator {
  private index: Map<string, string[]>

  constructor(allItems: RegistryItem[]) {
    this.index = new Map()
    for (const item of allItems) {
      const key = `${item.runtime}:${item.type}:${item.name}`
      const ids = this.index.get(key) ?? []
      ids.push(item.id)
      this.index.set(key, ids)
    }
  }

  validate(item: RegistryItem): ValidationResult {
    const key = `${item.runtime}:${item.type}:${item.name}`
    const ids = this.index.get(key) ?? []
    if (ids.length > 1) {
      return {
        health: 'warning',
        issues: [`Duplicate ${item.runtime}/${item.type} "${item.name}" found in multiple locations`],
      }
    }
    return { health: 'ok', issues: [] }
  }
}
