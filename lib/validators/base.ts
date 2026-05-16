import type { RegistryItem, ValidationResult } from '@/lib/scanner/adapters/base'

export interface Validator {
  validate(item: RegistryItem): ValidationResult
}
