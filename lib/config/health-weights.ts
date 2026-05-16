export interface HealthWeights {
  missingInstruction: number
  perBrokenItem: number
  perWarning: number
  missingHooks: number
  missingSkills: number
}

export const DEFAULT_HEALTH_WEIGHTS: HealthWeights = {
  missingInstruction: 20,
  perBrokenItem: 10,
  perWarning: 5,
  missingHooks: 10,
  missingSkills: 10,
}
