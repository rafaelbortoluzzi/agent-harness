import fs from 'fs'
import type { RegistryItem, ValidationResult } from '@/lib/scanner/adapters/base'
import type { Validator } from './base'

export class CompletenessValidator implements Validator {
  validate(item: RegistryItem): ValidationResult {
    if (item.type === 'instruction' && fs.existsSync(item.path)) {
      const content = fs.readFileSync(item.path, 'utf8').trim()
      if (content.length < 10) {
        return { health: 'warning', issues: ['Instruction file has minimal content'] }
      }
    }
    if (item.type === 'skill' && fs.existsSync(item.path)) {
      const meta = item.metadata as { description?: unknown }
      if (!meta.description || typeof meta.description !== 'string' || meta.description.length < 5) {
        return { health: 'warning', issues: ['Skill missing or has minimal description'] }
      }
    }
    return { health: 'ok', issues: [] }
  }
}
