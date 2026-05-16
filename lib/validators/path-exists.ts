import fs from 'fs'
import type { RegistryItem, ValidationResult } from '@/lib/scanner/adapters/base'
import type { Validator } from './base'

export class PathExistsValidator implements Validator {
  validate(item: RegistryItem): ValidationResult {
    if (item.type === 'hook') return { health: 'ok', issues: [] }
    if (fs.existsSync(item.path)) return { health: 'ok', issues: [] }
    return { health: 'broken', issues: [`Path not found: ${item.path}`] }
  }
}
